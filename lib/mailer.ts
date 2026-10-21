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

const gmailUser = process.env.GMAIL_USER || "";
const gmailPass = process.env.GMAIL_APP_PASSWORD || "";

const useLegacyGmail = !process.env.SMTP_USER && !!gmailUser;

const host =
  process.env.SMTP_HOST || (useLegacyGmail ? "smtp.gmail.com" : DEFAULT_SMTP_HOST);
const user = process.env.SMTP_USER || gmailUser;
const pass = process.env.SMTP_PASSWORD || gmailPass;

// 587 = STARTTLS (Microsoft 365 aj Gmail), 465 = implicitné TLS.
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

// Záložný Gmail transport. Keď primárny server odmietne prihlásenie alebo je
// nedostupný, zákazník nesmie dostať 500 na kontaktnom formulári a objednávkové
// maily nesmú vypadnúť — pošlú sa cez Gmail a chyba sa vypíše do logu.
// Gmail odmieta cudziu From adresu, preto má fallback vlastnú.
const fallback =
  !useLegacyGmail && gmailUser && gmailPass
    ? {
        transporter: nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: gmailUser, pass: gmailPass },
          ...TIMEOUTS,
        }),
        from: `VytlačTo3D <${gmailUser}>`,
      }
    : null;

// Chyby, po ktorých je jasné, že tento server správu neodošle nikdy — nemá
// zmysel ich vracať zákazníkovi ako 500.
//
// EENVELOPE a EMESSAGE sú tu kvôli Microsoftu 365: keď schránka nemá SendAs
// oprávnenie na odosielaciu adresu, odmietne až obálku (550 5.7.60) alebo
// dokonca celú správu po DATA (554 5.2.252 SendAsDenied). Oboje je permanentné
// odmietnutie konfigurácie, nie chyba obsahu, a Gmail takú správu pošle.
const FALLBACK_ON = new Set([
  "EAUTH",
  "ECONNECTION",
  "ESOCKET",
  "ETIMEDOUT",
  "EDNS",
  "EENVELOPE",
  "EMESSAGE",
]);

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
 * Odošle mail primárnym SMTP; ak ten neodpovie alebo odmietne prihlásenie,
 * skúsi záložný Gmail. Vracia nodemailer info doplnené o použitý transport.
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

  try {
    const info = await transporter.sendMail(message);
    return Object.assign(info, { transport: "primary" as const });
  } catch (err) {
    const code = String((err as { code?: string })?.code ?? "");
    if (!fallback || !FALLBACK_ON.has(code)) throw err;

    console.error(
      `Primary SMTP (${host}:${port}, user ${user}) failed with ${code} — resending via Gmail fallback.`,
      err
    );
    try {
      const info = await fallback.transporter.sendMail({ ...message, from: fallback.from });
      return Object.assign(info, { transport: "fallback" as const });
    } catch (fallbackErr) {
      // Zlyhali obe cesty. Vyhodiť len chybu Gmailu by zakrylo pôvodnú
      // príčinu na Microsofte — v správe musia byť obe.
      const primaryMsg = err instanceof Error ? err.message : String(err);
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw Object.assign(
        new Error(`Primárny SMTP: ${primaryMsg.slice(0, 300)} | Záložný Gmail: ${fallbackMsg.slice(0, 200)}`),
        { code, primary: err, fallback: fallbackErr }
      );
    }
  }
}

/** Sú nastavené prihlasovacie údaje pre SMTP? Bez nich nemá zmysel odosielať. */
export function hasMailCredentials() {
  return Boolean((user && pass) || fallback);
}

/**
 * Zrozumiteľná rada k chybe SMTP pre administráciu. Microsoft 365 vracia
 * kódy, z ktorých sa dá príčina spoznať; neznámu chybu necháme bez rady.
 */
export function mailErrorHint(err: unknown): string | null {
  const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
  const text = `${e?.message ?? ""} ${e?.response ?? ""}`;
  const fromAddress = FROM.match(/<([^>]+)>/)?.[1] ?? FROM;
  // Pri zlyhaní oboch ciest je v správe aj chyba Gmailu — rady k Microsoftu
  // sa riadia len prvou časťou.
  const primaryText = text.split(" | Záložný Gmail:")[0];
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
    usingLegacyGmail: useLegacyGmail,
    fallbackAvailable: Boolean(fallback),
  };
}
