import { transporter, FROM } from "@/lib/mailer";
import { COMPANY_INFO } from "@/lib/company-info";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendContactFormEmail({
  name,
  email,
  phone,
  message,
}: {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing GMAIL_USER/GMAIL_APP_PASSWORD — contact form email not sent.");
  }

  const to = COMPANY_INFO.contacts.administrativa.email;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
        <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlačTo3D — kontaktný formulár</div>

        <h1 style="margin:14px 0 16px;font-size:24px;color:#111;">Nová správa z kontaktného formulára</h1>

        <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr><td style="padding:6px 12px 6px 0;color:#777;font-size:14px;white-space:nowrap;">Meno</td><td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#777;font-size:14px;white-space:nowrap;">Email</td><td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${escapeHtml(email)}</td></tr>
          ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#777;font-size:14px;white-space:nowrap;">Telefón</td><td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${escapeHtml(phone)}</td></tr>` : ""}
        </table>

        <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Správa</div>
          <div style="font-size:14px;color:#222;white-space:pre-wrap;line-height:1.6;">${escapeHtml(message)}</div>
        </div>

        <p style="margin-top:24px;font-size:13px;color:#999;">
          Odpovedať priamo na tento email pôjde na adresu zákazníka (${escapeHtml(email)}).
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    replyTo: email,
    subject: `Kontaktný formulár: správa od ${name}`,
    html,
  });
}
