import { AsyncLocalStorage } from "node:async_hooks";
import nodemailer, { type SendMailOptions, type SentMessageInfo } from "nodemailer";
import { CONTACT_EMAIL } from "@/lib/contact";

// Pošta domény 4frommedia.sk beží na Microsofte 365, odosiela sa teda cez
// smtp.office365.com. Všetko je riadené cez env premenné, aby sa dal
// poskytovateľ vymeniť bez zásahu do kódu — už raz sa menil.
const DEFAULT_SMTP_HOST = "smtp.office365.com";

/** Adresa, z ktorej web odosiela, ak nie je nastavené nič iné. */
export const DEFAULT_FROM_EMAIL = "info@4frommedia.sk";

/**
 * Interné notifikácie chodia do oboch schránok: verejnej info@vytlacto3d.sk
 * aj pôvodnej info@4frommedia.sk (nodemailer berie zoznam oddelený čiarkou).
 */
const DEFAULT_ADMIN_INBOX = `${CONTACT_EMAIL}, ${DEFAULT_FROM_EMAIL}`;

// Odosiela sa len cez Microsoft 365 (bez záložného Gmailu).
const host = process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASSWORD || "";

// 587 = STARTTLS (Microsoft 365), 465 = implicitné TLS.
const port = Number(process.env.SMTP_PORT) || 587;
const secure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : port === 465;

// Fail fast instead of hanging near the serverless function's execution
// limit — a silent hang looks identical to "nothing happened" in the logs.
const TIMEOUTS = {
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
};

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  // Na porte 587 sa spojenie začína nešifrované — bez tohto by sa prihlasovacie
  // údaje dali odoslať v čistom texte, ak by server STARTTLS neponúkol.
  requireTLS: !secure,
  auth: { user, pass },
  ...TIMEOUTS,
});

// Prihlasovacia schránka sa nemusí rovnať odosielacej adrese — na Microsofte
// 365 sa prihlasujeme jednou a odosielame pod druhou (cez SendAs oprávnenie).
// Vtedy musí byť EMAIL_FROM nastavené, inak by web odosielal pod loginom.
export const FROM =
  process.env.EMAIL_FROM || `VytlačTo3D <${user || DEFAULT_FROM_EMAIL}>`;

/**
 * Interné schránky, do ktorých chodia notifikácie o objednávkach a správy
 * z kontaktného formulára.
 */
export const ADMIN_INBOX = process.env.ADMIN_ORDER_EMAIL || DEFAULT_ADMIN_INBOX;

/**
 * Adresa, na ktorú majú smerovať odpovede zákazníkov. Odosiela sa z
 * prihlasovacej schránky, ale na webe je všade uvedená info@vytlacto3d.sk — bez Reply-To by
 * zákazník odpovedal na adresu, ktorú nikdy nikde nevidel.
 */
export const REPLY_TO = process.env.EMAIL_REPLY_TO || CONTACT_EMAIL;

// Dočasné výpadky spojenia — odoslanie sa zopakuje.
const TRANSIENT = new Set(["ESOCKET", "ETIMEDOUT", "ECONNECTION"]);

// Prefix predmetu platný len pre správy odoslané vnútri withSubjectPrefix().
// AsyncLocalStorage preto, že modulová premenná by v serverless prostredí
// pretiekla do súbežných požiadaviek iných zákazníkov.
const subjectPrefixStore = new AsyncLocalStorage<string>();

/**
 * Spustí `fn` tak, že každej správe odoslanej vnútri pribudne pred predmet
 * `prefix`. Slúži na hromadné testovacie rozposlanie, nech sa dajú vzorky
 * v schránke odlíšiť od skutočnej prevádzky.
 */
export function withSubjectPrefix<T>(prefix: string, fn: () => Promise<T>): Promise<T> {
  return subjectPrefixStore.run(prefix, fn);
}

/**
 * Odošle mail cez Microsoft 365. Pri dočasnom výpadku spojenia to skúsi
 * ešte dvakrát. Vracia nodemailer info doplnené o použitý transport.
 */
export async function sendMail(
  options: SendMailOptions
): Promise<SentMessageInfo & { transport: "primary" | "fallback" }> {
  const prefix = subjectPrefixStore.getStore();
  const message: SendMailOptions = {
    ...options,
    ...(prefix && typeof options.subject === "string"
      ? { subject: `${prefix}${options.subject}` }
      : null),
    // Vlastné Reply-To má prednosť — kontaktný formulár ním smeruje odpoveď
    // zákazníkovi a prepísať ho by znamenalo odpovedať sám sebe.
    ...(options.replyTo ? null : { replyTo: REPLY_TO }),
  };

  // Microsoft 365 občas spojenie preruší alebo neodpovie (ECONNRESET,
  // timeout) — ďalší pokus o chvíľu zvyčajne prejde. Chybné prihlásenie či
  // odmietnutie správy sa neopakuje.
  const delays = [2500, 7000];
  for (let attempt = 0; ; attempt++) {
    try {
      const info = await transporter.sendMail(message);
      return Object.assign(info, { transport: "primary" as const });
    } catch (err) {
      const code = String((err as { code?: string })?.code ?? "");
      const msg = String((err as { message?: string })?.message ?? "");
      const transient = TRANSIENT.has(code) || (!code && /socket close|ECONNRESET|timeout|timed out/i.test(msg));
      if (!transient || attempt >= delays.length) throw err;
      console.warn(`SMTP ${host}:${port} ${code || msg} — pokus ${attempt + 2}/${delays.length + 1} o ${delays[attempt] / 1000} s.`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

/** Sú nastavené prihlasovacie údaje pre SMTP? Bez nich nemá zmysel odosielať. */
export function hasMailCredentials() {
  return Boolean(user && pass);
}

/**
 * Zrozumiteľná rada k chybe SMTP pre administráciu. Microsoft 365 vracia
 * kódy, z ktorých sa dá príčina spoznať; neznámu chybu necháme bez rady.
 */
export function mailErrorHint(err: unknown): string | null {
  const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
  const text = `${e?.message ?? ""} ${e?.response ?? ""}`;
  const fromAddress = FROM.match(/<([^>]+)>/)?.[1] ?? FROM;
  const primaryText = text;
  const login = user || "prihlasovacia schránka (SMTP_USER)";
  const hints: string[] = [];

  if (/5\.7\.60|SendAsDenied|5\.2\.252|not have permissions to send as/i.test(primaryText)) {
    hints.push(
      `Microsoft 365 nedovolí schránke ${login} odosielať ako ${fromAddress}. ` +
        `${fromAddress} musí byť samostatná (napr. zdieľaná) schránka v tom istom Microsoft 365 ako ${login}, nie len alias, ` +
        `a v jej oprávneniach musí byť „Send as“ pre ${login}. Prejaviť sa to môže až do 60 minút.`
    );
  } else if (/5\.7\.139|SmtpClientAuthentication is disabled/i.test(primaryText)) {
    hints.push(`Pre schránku ${login} je v Microsofte 365 vypnuté SMTP AUTH (Authenticated SMTP).`);
  } else if (/5\.1\.1|5\.4\.1|5\.1\.10|Recipient address rejected|RecipientNotFound/i.test(primaryText)) {
    hints.push("Server odmietol príjemcu — adresa v ADMIN_ORDER_EMAIL neexistuje alebo doména ešte neprijíma poštu (MX).");
  } else if (/Invalid login|\b535\b/.test(primaryText) && !/gsmtp/.test(primaryText)) {
    hints.push(`Prihlásenie do schránky ${login} zlyhalo — skontrolujte SMTP_PASSWORD na Verceli.`);
  } else if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS"].includes(String(e?.code))) {
    hints.push(`Server ${host}:${port} neodpovedá — skontrolujte SMTP_HOST a SMTP_PORT.`);
  }
  return hints.length ? hints.join(" ") : null;
}

/** Diagnostika pre administráciu — nikdy nevracia heslo. */
export function mailConfigSummary() {
  return {
    host,
    port,
    secure,
    user: user || null,
    from: FROM,
    adminInbox: ADMIN_INBOX,
  };
}
