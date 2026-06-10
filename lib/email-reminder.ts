import { transporter, FROM } from "@/lib/mailer";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const CONTACT = `
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#777;line-height:1.7;">
    <strong style="color:#111;">VytlačTo3D</strong><br/>
    Ak máte otázky, napíšte nám: <a href="mailto:info@4frommedia.sk" style="color:#FFAE00;">info@4frommedia.sk</a><br/>
    <a href="${baseUrl}" style="color:#FFAE00;">www.vytlacto3d.sk</a>
  </div>
`;

export async function sendPendingReminderEmail({
  to,
  orderId,
  fileName,
  stripeUrl,
}: {
  to: string;
  orderId: string;
  fileName: string;
  stripeUrl: string;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Missing GMAIL credentials, reminder email skipped.");
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Nedokoncena objednavka – VytlacTo3D",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
          <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlacTo3D</div>

          <h1 style="margin:14px 0 8px;font-size:26px;color:#111;">Zabudli ste dokoncit objednavku?</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px;">
            Vas 3D model <strong>${fileName}</strong> caka na spracovanie. Nasa platobna brana je stale otvorena – staci kliknut na tlacitko nizsie a dokoncit platbu tam, kde ste prestali.
          </p>

          <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px;">Vasa objednavka</div>
            <div style="font-size:14px;color:#111;font-weight:600;">${fileName}</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">ID: ${orderId}</div>
          </div>

          <div style="margin-bottom:24px;">
            <a href="${stripeUrl}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:16px 28px;border-radius:14px;font-size:16px;">
              Dokoncit platbu &rarr;
            </a>
          </div>

          <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">
            Platobny odkaz je platny po obmedzenou dobu. Ak potrebujete novu ponuku, navstivte nas na
            <a href="${baseUrl}" style="color:#FFAE00;">${baseUrl.replace(/^https?:\/\//, "")}</a>.
          </p>

          ${CONTACT}
        </div>
      </div>
    `,
  });
}
