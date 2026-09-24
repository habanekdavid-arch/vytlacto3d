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

export function getFlowiiCredentials(): FlowiiCredentials | null {
  const baseUrl = process.env.FLOWII_API_URL?.trim().replace(/\/+$/, "");
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

export class FlowiiClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly creds: FlowiiCredentials) {}

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
    // Token platí ~10 minút; obnovíme ho s rezervou.
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;

    this.assertPostAllowed("/token");
    const res = await this.fetchWithTimeout(`${this.creds.baseUrl}/token`, {
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

    const text = await res.text();
    if (!res.ok) {
      throw new FlowiiError(`Prihlásenie do FLOWii zlyhalo (HTTP ${res.status}).`, res.status, text.slice(0, 500));
    }
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new FlowiiError("FLOWii vrátilo neplatnú odpoveď pri prihlásení.", res.status);
    }
    if (!json?.access_token) throw new FlowiiError("FLOWii nevrátilo prístupový token.", res.status);

    const expiresIn = Number(json.expires_in);
    this.token = {
      value: String(json.access_token),
      expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 5 * 60_000),
    };
    return this.token.value;
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

    const token = await this.getToken();
    const res = await this.fetchWithTimeout(this.url(path, query), {
      method,
      headers: {
        "Api-Key": this.creds.apiKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.api+json",
        ...(body !== undefined ? { "Content-Type": "application/vnd.api+json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new FlowiiError(`FLOWii ${method} ${path} zlyhalo (HTTP ${res.status}).`, res.status, text.slice(0, 1000));
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

  /** Stiahne všetky strany zoznamu. Stránkovanie FLOWii nie je zdokumentované, preto s poistkami. */
  async getAll(path: string, query: Record<string, string | number | undefined> = {}): Promise<JsonApiResource[]> {
    const seen = new Map<string, JsonApiResource>();
    for (let page = 0; page < 20; page++) {
      const json = await this.get(path, { ...query, "page[number]": page });
      const data: JsonApiResource[] = Array.isArray(json?.data) ? json.data : [];
      let added = 0;
      for (const item of data) {
        const key = `${item.type}:${item.id}`;
        if (!seen.has(key)) {
          seen.set(key, item);
          added++;
        }
      }
      // Koniec: prázdna strana, alebo API parameter strany ignoruje a vracia to isté.
      if (data.length === 0 || added === 0) break;
    }
    return [...seen.values()];
  }

  /** Založí nový záznam a vráti jeho ID. */
  async create(path: "/partners" | "/orders" | "/tasks", companyId: string, body: unknown): Promise<string> {
    const json = await this.request("POST", path, { companyId }, body);
    const id = json?.data?.id;
    if (!id) throw new FlowiiError(`FLOWii nevrátilo ID nového záznamu (${path}).`);
    return String(id);
  }
}
