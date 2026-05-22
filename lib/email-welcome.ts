import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

type WelcomeEmailInput = {
  to: string;
  name?: string | null;
  accountType?: string | null;
  companyName?: string | null;
};

export async function sendWelcomeEmail({
  to,
  name,
  accountType,
  companyName,
}: WelcomeEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Missing RESEND_API_KEY, welcome email skipped.");
    return;
  }

  const isCompany = accountType === "COMPANY";

  await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      "VytlačTo3D <noreply@vytlacto3d.sk>",
    to,
    subject: isCompany
      ? "Vitajte vo VytlačTo3D – firemný účet bol vytvorený"
      : "Vitajte vo VytlačTo3D",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:32px;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:22px; padding:32px; border:1px solid #e5e5e5;">
          <div style="font-size:13px; color:#777; font-weight:700; letter-spacing:.04em; text-transform:uppercase;">
            VytlačTo3D
          </div>

          <h1 style="margin:14px 0 16px; font-size:28px; color:#111;">
            Ďakujeme za registráciu${name ? `, ${name}` : ""}!
          </h1>

          <p style="font-size:16px; line-height:1.6; color:#444;">
            ${
              isCompany
                ? `Váš firemný účet${companyName ? ` pre spoločnosť <strong>${companyName}</strong>` : ""} bol úspešne vytvorený.`
                : "Váš používateľský účet bol úspešne vytvorený."
            }
          </p>

          <p style="font-size:16px; line-height:1.6; color:#444;">
            Teraz môžete nahrať STL, OBJ alebo SVG model, nastaviť parametre 3D tlače,
            vypočítať cenu a sledovať svoje objednávky priamo vo svojom účte.
          </p>

          <div style="margin:28px 0;">
            <a href="${baseUrl}" style="display:inline-block; background:#FFAE00; color:#000; text-decoration:none; font-weight:800; padding:14px 22px; border-radius:14px;">
              Prejsť na VytlačTo3D
            </a>
          </div>

          <div style="margin-top:24px; border-radius:18px; background:#fafafa; border:1px solid #eee; padding:18px;">
            <div style="font-size:14px; font-weight:800; color:#111; margin-bottom:8px;">
              Čo môžete robiť ďalej?
            </div>

            <ul style="padding-left:18px; margin:0; color:#555; font-size:14px; line-height:1.7;">
              <li>Nahrať 3D model do konfigurátora</li>
              <li>Vybrať materiál, farbu, výplň a kvalitu tlače</li>
              <li>Zistiť cenu 3D tlače online</li>
              <li>Sledovať stav objednávky vo svojom účte</li>
            </ul>
          </div>

          <p style="font-size:12px; color:#777; line-height:1.5; margin-top:24px;">
            Ak ste si účet nevytvorili vy, tento email môžete ignorovať.
          </p>
        </div>
      </div>
    `,
  });
}