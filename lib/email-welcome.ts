import { transporter, FROM } from "@/lib/mailer";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

export async function sendWelcomeEmail({
  to,
  name,
  accountType,
  companyName,
}: {
  to: string;
  name?: string | null;
  accountType?: string | null;
  companyName?: string | null;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Missing GMAIL credentials, welcome email skipped.");
    return;
  }

  const isCompany = accountType === "COMPANY";

  await transporter.sendMail({
    from: FROM,
    to,
    subject: isCompany
      ? "Vitajte vo VytlačTo3D – firemný účet bol vytvorený"
      : "Vitajte vo VytlačTo3D",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
          <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlačTo3D</div>

          <h1 style="margin:14px 0 16px;font-size:28px;color:#111;">
            Ďakujeme za registráciu${name ? `, ${name}` : ""}!
          </h1>

          <p style="font-size:16px;line-height:1.6;color:#444;">
            ${
              isCompany
                ? `Váš firemný účet${companyName ? ` pre spoločnosť <strong>${companyName}</strong>` : ""} bol úspešne vytvorený.`
                : "Váš používateľský účet bol úspešne vytvorený."
            }
          </p>

          <p style="font-size:16px;line-height:1.6;color:#444;">
            Teraz môžete nahrať STL, OBJ alebo SVG model, nastaviť parametre 3D tlače
            a sledovať svoje objednávky priamo vo svojom účte.
          </p>

          <div style="margin:28px 0;">
            <a href="${baseUrl}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
              Prejsť na VytlačTo3D
            </a>
          </div>
        </div>
      </div>
    `,
  });
}
