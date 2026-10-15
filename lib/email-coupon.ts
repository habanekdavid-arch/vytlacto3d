import { sendMail, FROM, hasMailCredentials } from "@/lib/mailer";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendCouponEmail({ to, name, code, percent }: { to: string; name?: string | null; code: string; percent: number }) {
  if (!hasMailCredentials()) throw new Error("Chýbajú prihlasovacie údaje k e-mailu (SMTP).");

  await sendMail({
    from: FROM,
    to,
    subject: `Váš zľavový kupón ${percent} % na 3D tlač – VytlačTo3D`,
    text:
      `Dobrý deň${name ? `, ${name}` : ""},\n\nposielame vám jednorazový zľavový kupón ${percent} % na 3D tlač.\n\n` +
      `Kód: ${code}\n\nZadajte ho v košíku pri objednávke na ${baseUrl}. Zľava platí na cenu výroby (nie na dopravu) a kupón sa dá použiť jedenkrát.\n\nTím VytlačTo3D`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
          <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlačTo3D</div>
          <h1 style="margin:14px 0 16px;font-size:28px;color:#111;">
            Zľava ${percent} % na vašu ďalšiu 3D tlač
          </h1>
          <p style="font-size:16px;line-height:1.6;color:#444;">
            Dobrý deň${name ? `, ${esc(name)}` : ""}, posielame vám jednorazový zľavový kupón.
          </p>
          <div style="margin:24px 0;padding:22px;border:2px dashed #FFAE00;border-radius:18px;background:#FFF8E6;text-align:center;">
            <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Váš kód</div>
            <div style="margin-top:8px;font-size:30px;font-weight:800;letter-spacing:3px;color:#111;font-family:'Courier New',monospace;">${esc(code)}</div>
            <div style="margin-top:8px;font-size:15px;font-weight:700;color:#111;">−${percent} % z ceny výroby</div>
          </div>
          <p style="font-size:15px;line-height:1.6;color:#444;">
            Nahrajte model, nastavte parametre a kód zadajte v košíku do políčka <strong>„Zľavový kupón“</strong>.
            Zľava platí na cenu výroby (nie na dopravu) a kupón sa dá použiť jedenkrát.
          </p>
          <div style="margin:28px 0 8px;">
            <a href="${baseUrl}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
              Nahrať model a objednať
            </a>
          </div>
        </div>
      </div>
    `,
  });
}
