import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Missing RESEND_API_KEY, welcome email skipped.");
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "VytlačTo3D <noreply@vytlacto3d.sk>",
    to,
    subject: "Vitajte vo VytlačTo3D",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:32px;">
        <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:20px; padding:32px; border:1px solid #e5e5e5;">
          <div style="font-size:14px; color:#666;">VytlačTo3D</div>

          <h1 style="margin:12px 0 16px; font-size:28px; color:#111;">
            Ďakujeme za registráciu${name ? `, ${name}` : ""}!
          </h1>

          <p style="font-size:16px; line-height:1.6; color:#444;">
            Váš účet bol úspešne vytvorený. Teraz môžete nahrať STL model,
            nastaviť parametre 3D tlače, vypočítať cenu a sledovať svoje objednávky
            priamo vo svojom účte.
          </p>

          <div style="margin:28px 0;">
            <a href="${baseUrl}" style="display:inline-block; background:#FFAE00; color:#000; text-decoration:none; font-weight:bold; padding:14px 22px; border-radius:14px;">
              Prejsť na VytlačTo3D
            </a>
          </div>

          <p style="font-size:13px; color:#777; line-height:1.5;">
            Ak ste si účet nevytvorili vy, tento email môžete ignorovať.
          </p>
        </div>
      </div>
    `,
  });
}