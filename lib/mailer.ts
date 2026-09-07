import nodemailer from "nodemailer";

// Poštová schránka info@4frommedia.sk je hostovaná u WebSupportu, preto ide
// odosielanie cez ich SMTP. Všetko je riadené cez env premenné, aby sa dal
// poskytovateľ vymeniť bez zásahu do kódu. GMAIL_* zostávajú ako dočasný
// fallback, kým nie sú SMTP_* nastavené vo všetkých prostrediach.
const WEBSUPPORT_SMTP_HOST = "smtp.m1.websupport.sk";

/** Adresa, z ktorej web odosiela, ak nie je nastavené nič iné. */
export const DEFAULT_FROM_EMAIL = "info@4frommedia.sk";

const useLegacyGmail = !process.env.SMTP_USER && !!process.env.GMAIL_USER;

const host =
  process.env.SMTP_HOST || (useLegacyGmail ? "smtp.gmail.com" : WEBSUPPORT_SMTP_HOST);
const user = process.env.SMTP_USER || process.env.GMAIL_USER || "";
const pass = process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "";

// 465 = implicitné TLS (WebSupport), 587 = STARTTLS (Gmail aj WebSupport).
const port = Number(process.env.SMTP_PORT) || (useLegacyGmail ? 587 : 465);
const secure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : port === 465;

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  // Na porte 587 sa spojenie začína nešifrované — bez tohto by sa prihlasovacie
  // údaje dali odoslať v čistom texte, ak by server STARTTLS neponúkol.
  requireTLS: !secure,
  auth: { user, pass },
  // Fail fast instead of hanging near the serverless function's execution
  // limit — a silent hang looks identical to "nothing happened" in the logs.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export const FROM =
  process.env.EMAIL_FROM || `VytlačTo3D <${user || DEFAULT_FROM_EMAIL}>`;

/**
 * Interná schránka, do ktorej chodia notifikácie o objednávkach a správy
 * z kontaktného formulára — tá istá adresa, z ktorej web odosiela.
 */
export const ADMIN_INBOX = process.env.ADMIN_ORDER_EMAIL || DEFAULT_FROM_EMAIL;

/** Sú nastavené prihlasovacie údaje pre SMTP? Bez nich nemá zmysel odosielať. */
export function hasMailCredentials() {
  return Boolean(user && pass);
}

export const MISSING_MAIL_CREDENTIALS =
  "Missing SMTP_USER/SMTP_PASSWORD — e-mail not sent.";
