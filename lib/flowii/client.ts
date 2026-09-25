import { createHash } from "node:crypto";
/**
 * Minimálny klient FLOWii REST API (JSON:API, https://flowiiapi.docs.apiary.io/).
 *
 * BEZPEČNOSŤ: klient vie iba čítať (GET) a zakladať nové záznamy (POST) na
 * pevnom zozname ciest. PATCH/DELETE ani iné metódy tu zámerne neexistujú —
 * integrácia nesmie nič, čo vo FLOWii už je, upraviť ani zmazať.
 */

const ALLOWED_POST_PATHS = new Set(["/token", "/partners", "/orders", "/tasks"]);

export class FlowiiError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: string) {
    super(message);
    this.name = "FlowiiError";
  }
}

export type FlowiiCredentials = {
  baseUrl: string;
  apiKey: string;
  username: string;
  password: string;
};

// FLOWii adresu API v nastaveniach neuvádza (dokumentácia má len zástupný
// FLOWII_API_URL); api.flowii.com je ich API server. Premenná ju môže prepísať.
const DEFAULT_API_URL = "https://api.flowii.com";

export function getFlowiiCredentials(): FlowiiCredentials | null {
  const baseUrl = (process.env.FLOWII_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, "");
  const apiKey = process.env.FLOWII_API_KEY?.trim();
  const username = process.env.FLOWII_USERNAME?.trim();
  const password = process.env.FLOWII_PASSWORD;
  if (!baseUrl || !apiKey || !username || !password) return null;
  return { baseUrl, apiKey, username, password };
}

export type JsonApiResource = {
  type: string;
  id: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, any>;
};

const REQUEST_TIMEOUT_MS = 20_000;

/** Dôvod odmietnutia prihlásenia v zrozumiteľnej forme (OAuth: error / error_description). */
function describeTokenError(body: string): string {
  let error = "";
  let description = "";
  try {
    const json = JSON.parse(body);
    error = String(json?.error ?? "");
    description = String(json?.error_description ?? json?.message ?? json?.Message ?? "");
  } catch {
    description = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  }
  const hints: Record<string, string> = {
    invalid_grant: "nesprávne prihlasovacie meno alebo heslo používateľa FLOWii",
    invalid_client: "API kľúč nie je platný alebo nepatrí k tomuto účtu",
    unauthorized_client: "API kľúč nemá povolený prístup",
    unsupported_grant_type: "FLOWii nepodporuje tento spôsob prihlásenia",
  };
  const parts = [error && `${error}${hints[error] ? ` – ${hints[error]}` : ""}`, description].filter(Boolean);
  return parts.length ? `: ${parts.join(" · ")}` : ".";
}

// Token platí ~10 minút — zdieľame ho medzi požiadavkami tej istej inštancie,
// aby sa web neprihlasoval do FLOWii pri každom volaní.
const tokenCache = new Map<string, { value: string; expiresAt: number }>();

// FLOWii pri priveľa požiadavkách vráti 429. Čítanie počká a skúsi znova.
const RETRY_STATUSES = new Set([429, 503]);
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Zabudne uložené prihlásenie — test pripojenia tak vždy overí meno a heslo nanovo. */
export function clearFlowiiTokenCache() {
  tokenCache.clear();
}

function retryDelayMs(res: Response, attempt: number): number {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header, 10) * 1000;
  return 1500 * 2 ** attempt;
}

function statusMessage(status: number): string {
  if (status === 429) return "FLOWii dočasne obmedzilo počet požiadaviek (HTTP 429) — skúste to znova o pár minút.";
  return `HTTP ${status}`;
}

export class FlowiiClient {
  constructor(private readonly creds: FlowiiCredentials) {}

  private get tokenKey() {
    // Aj heslo: po jeho zmene sa nesmie použiť token získaný so starým.
    return createHash("sha256")
      .update(`${this.creds.baseUrl}\n${this.creds.apiKey}\n${this.creds.username}\n${this.creds.password}`)
      .digest("hex");
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    } catch (e: any) {
      throw new FlowiiError(
        e?.name === "AbortError" ? "FLOWii neodpovedalo včas." : `Spojenie s FLOWii zlyhalo: ${e?.message ?? e}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async getToken(): Promise<string> {
    // Obnovíme ho s minútovou rezervou.
    const cached = tokenCache.get(this.tokenKey);
    if (cached && Date.now() < cached.expiresAt - 60_000) return cached.value;

    this.assertPostAllowed("/token");
    let res!: Response;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      res = await this.fetchWithTimeout(`${this.creds.baseUrl}/token`, {
        method: "POST",
        headers: {
          "Api-Key": this.creds.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/vnd.api+json",
        },
        body: new URLSearchParams({
          grant_type: "password",
          username: this.creds.username,
          password: this.creds.password,
        }).toString(),
      });
      if (!RETRY_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS - 1) break;
      await sleep(retryDelayMs(res, attempt));
    }

    const text = await res.text();
    if (!res.ok) {
      throw new FlowiiError(
        res.status === 429
          ? `Prihlásenie do FLOWii: ${statusMessage(429)}`
          : `Prihlásenie do FLOWii zlyhalo (HTTP ${res.status})${describeTokenError(text)}`,
        res.status,
        text.slice(0, 500)
      );
    }
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new FlowiiError("FLOWii vrátilo neplatnú odpoveď pri prihlásení.", res.status);
    }
    if (!json?.access_token) throw new FlowiiError("FLOWii nevrátilo prístupový token.", res.status);

    const expiresIn = Number(json.expires_in);
    const token = {
      value: String(json.access_token),
      expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 5 * 60_000),
    };
    tokenCache.set(this.tokenKey, token);
    return token.value;
  }

  private assertPostAllowed(path: string) {
    if (!ALLOWED_POST_PATHS.has(path)) {
      throw new FlowiiError(`Zablokované: POST na ${path} nie je povolený.`);
    }
  }

  private url(path: string, query: Record<string, string | number | undefined>) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k).replace(/%5B/g, "[").replace(/%5D/g, "]")}=${encodeURIComponent(String(v))}`)
      .join("&");
    return `${this.creds.baseUrl}${path}${qs ? `?${qs}` : ""}`;
  }

  private async request(method: "GET" | "POST", path: string, query: Record<string, string | number | undefined>, body?: unknown) {
    if (method === "POST") this.assertPostAllowed(path);

    // Opakuje sa iba čítanie. Zakladanie záznamu (POST) sa nikdy neopakuje
    // automaticky — pri chybe sa zapíše stav a pokračuje sa "Skúsiť znova".
    const maxAttempts = method === "GET" ? MAX_ATTEMPTS : 1;
    let res!: Response;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const token = await this.getToken();
      res = await this.fetchWithTimeout(this.url(path, query), {
        method,
        headers: {
          "Api-Key": this.creds.apiKey,
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.api+json",
          ...(body !== undefined ? { "Content-Type": "application/vnd.api+json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) tokenCache.delete(this.tokenKey); // token vypršal skôr — pri ďalšom pokuse nový
      const retry = RETRY_STATUSES.has(res.status) || (res.status === 401 && method === "GET");
      if (!retry || attempt === maxAttempts - 1) break;
      await sleep(res.status === 401 ? 0 : retryDelayMs(res, attempt));
    }

    const text = await res.text();
    if (!res.ok) {
      throw new FlowiiError(`FLOWii ${method} ${path} zlyhalo (${statusMessage(res.status)}).`, res.status, text.slice(0, 1000));
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new FlowiiError(`FLOWii ${method} ${path} vrátilo neplatný JSON.`, res.status, text.slice(0, 500));
    }
  }

  get(path: string, query: Record<string, string | number | undefined> = {}) {
    return this.request("GET", path, query);
  }

  /** Zoznam (číselník). Tieto zoznamy vo FLOWii nemajú stránkovanie — jedno volanie. */
  async list(path: string, query: Record<string, string | number | undefined> = {}): Promise<JsonApiResource[]> {
    const json = await this.get(path, query);
    return Array.isArray(json?.data) ? json.data : [];
  }

  /** Založí nový záznam a vráti jeho ID. */
  async create(path: "/partners" | "/orders" | "/tasks", companyId: string, body: unknown): Promise<string> {
    const json = await this.request("POST", path, { companyId }, body);
    const id = json?.data?.id;
    if (!id) throw new FlowiiError(`FLOWii nevrátilo ID nového záznamu (${path}).`);
    return String(id);
  }
}
