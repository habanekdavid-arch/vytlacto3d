import nodemailer, { type SendMailOptions, type SentMessageInfo } from "nodemailer";

// Poštová schránka info@4frommedia.sk je hostovaná u WebSupportu, preto ide
// odosielanie cez ich SMTP. Všetko je riadené cez env premenné, aby sa dal
// poskytovateľ vymeniť bez zásahu do kódu.
const WEBSUPPORT_SMTP_HOST = "smtp.m1.websupport.sk";

/** Adresa, z ktorej web odosiela, ak nie je nastavené nič iné. */
export const DEFAULT_FROM_EMAIL = "info@4frommedia.sk";

const gmailUser = process.env.GMAIL_USER || "";
const gmailPass = process.env.GMAIL_APP_PASSWORD || "";

const useLegacyGmail = !process.env.SMTP_USER && !!gmailUser;

const host =
  process.env.SMTP_HOST || (useLegacyGmail ? "smtp.gmail.com" : WEBSUPPORT_SMTP_HOST);
const user = process.env.SMTP_USER || gmailUser;
const pass = process.env.SMTP_PASSWORD || gmailPass;

// 465 = implicitné TLS (WebSupport), 587 = STARTTLS (Gmail aj WebSupport).
const port = Number(process.env.SMTP_PORT) || (useLegacyGmail ? 587 : 465);
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

export const FROM =
  process.env.EMAIL_FROM || `VytlačTo3D <${user || DEFAULT_FROM_EMAIL}>`;

/**
 * Interná schránka, do ktorej chodia notifikácie o objednávkach a správy
 * z kontaktného formulára — tá istá adresa, z ktorej web odosiela.
 */
export const ADMIN_INBOX = process.env.ADMIN_ORDER_EMAIL || DEFAULT_FROM_EMAIL;

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

// Chyby spojenia a prihlásenia — teda "tento server nám maily neodošle".
// Odmietnutého príjemcu ani zle poskladanú správu Gmail nezachráni.
const FALLBACK_ON = new Set(["EAUTH", "ECONNECTION", "ESOCKET", "ETIMEDOUT", "EDNS"]);

/**
 * Odošle mail primárnym SMTP; ak ten neodpovie alebo odmietne prihlásenie,
 * skúsi záložný Gmail. Vracia nodemailer info doplnené o použitý transport.
 */
export async function sendMail(
  options: SendMailOptions
): Promise<SentMessageInfo & { transport: "primary" | "fallback" }> {
  try {
    const info = await transporter.sendMail(options);
    return Object.assign(info, { transport: "primary" as const });
  } catch (err) {
    const code = String((err as { code?: string })?.code ?? "");
    if (!fallback || !FALLBACK_ON.has(code)) throw err;

    console.error(
      `Primary SMTP (${host}:${port}, user ${user}) failed with ${code} — resending via Gmail fallback.`,
      err
    );
    const info = await fallback.transporter.sendMail({ ...options, from: fallback.from });
    return Object.assign(info, { transport: "fallback" as const });
  }
}

/** Sú nastavené prihlasovacie údaje pre SMTP? Bez nich nemá zmysel odosielať. */
export function hasMailCredentials() {
  return Boolean((user && pass) || fallback);
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
