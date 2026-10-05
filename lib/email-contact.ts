import type { Attachment } from "nodemailer/lib/mailer";
import { sendMail, FROM, ADMIN_INBOX, hasMailCredentials } from "@/lib/mailer";
import {
  CONTACT_EMAIL_ATTACH_MAX_BYTES,
  formatFileSize,
  type ContactAttachment,
} from "@/lib/contact-attachments";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Stiahne prílohy z Blobu a priloží ich k e-mailu, kým sa zmestia do limitu.
 * Ostatné ostanú len ako odkaz na stiahnutie — odkaz je v e-maile vždy.
 */
async function loadMailAttachments(files: ContactAttachment[]): Promise<{ attached: Set<string>; parts: Attachment[] }> {
  const attached = new Set<string>();
  const parts: Attachment[] = [];
  let budget = CONTACT_EMAIL_ATTACH_MAX_BYTES;

  for (const f of files) {
    if (f.size > budget) continue;
    try {
      const res = await fetch(f.url, { cache: "no-store" });
      if (!res.ok) continue;
      const content = Buffer.from(await res.arrayBuffer());
      if (content.length > budget) continue;
      budget -= content.length;
      parts.push({ filename: f.name, content, contentType: f.contentType || undefined });
      attached.add(f.url);
    } catch (e) {
      console.warn("Contact attachment download failed:", f.name, e);
    }
  }
  return { attached, parts };
}

export async function sendContactFormEmail({
  name,
  email,
  subject,
  message,
  attachments = [],
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments?: ContactAttachment[];
}) {
  if (!hasMailCredentials()) {
    throw new Error("Missing SMTP_USER/SMTP_PASSWORD — contact form email not sent.");
  }

  const to = ADMIN_INBOX;
  const { attached, parts } = await loadMailAttachments(attachments);

  const attachmentsHtml = attachments.length
    ? `
        <div style="margin-top:16px;background:#fffaf0;border:1px solid #ffe2a8;border-radius:14px;padding:16px 20px;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#a46a00;margin-bottom:10px;">Prílohy (${attachments.length})</div>
          ${attachments
            .map(
              (f) => `<div style="font-size:14px;line-height:1.8;">
                <a href="${escapeHtml(f.url)}" style="color:#111;font-weight:700;">${escapeHtml(f.name)}</a>
                <span style="color:#999;"> · ${formatFileSize(f.size)} · ${attached.has(f.url) ? "priložené v e-maile" : "len na stiahnutie cez odkaz"}</span>
              </div>`
            )
            .join("")}
        </div>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
        <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlačTo3D — kontaktný formulár</div>

        <h1 style="margin:14px 0 16px;font-size:24px;color:#111;">Nová správa z kontaktného formulára</h1>

        <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr><td style="padding:6px 12px 6px 0;color:#777;font-size:14px;white-space:nowrap;">Meno</td><td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#777;font-size:14px;white-space:nowrap;">Email</td><td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#777;font-size:14px;white-space:nowrap;">Predmet</td><td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${escapeHtml(subject)}</td></tr>
        </table>

        <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Správa</div>
          <div style="font-size:14px;color:#222;white-space:pre-wrap;line-height:1.6;">${escapeHtml(message)}</div>
        </div>
        ${attachmentsHtml}

        <p style="margin-top:24px;font-size:13px;color:#999;">
          Odpovedať priamo na tento email pôjde na adresu zákazníka (${escapeHtml(email)}).
        </p>
      </div>
    </div>
  `;

  await sendMail({
    from: FROM,
    to,
    replyTo: email,
    subject: `[Kontaktný formulár] ${subject}${attachments.length ? ` 📎${attachments.length}` : ""}`,
    html,
    attachments: parts,
  });
}
