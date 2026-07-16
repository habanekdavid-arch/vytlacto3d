import { transporter, FROM } from "@/lib/mailer";
import { COMPANY_INFO } from "@/lib/company-info";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const CONTACT = `
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#777;line-height:1.7;">
    <strong style="color:#111;">VytlacTo3D</strong><br/>
    Otazky k platbe? ${COMPANY_INFO.contacts.administrativa.name}
    (${COMPANY_INFO.contacts.administrativa.role}) —
    <a href="mailto:${COMPANY_INFO.contacts.administrativa.email}" style="color:#FFAE00;">${COMPANY_INFO.contacts.administrativa.email}</a>,
    ${COMPANY_INFO.contacts.administrativa.phone}<br/>
    <a href="${baseUrl}" style="color:#FFAE00;">www.vytlacto3d.sk</a>
  </div>
`;

export async function sendTransferPaymentEmail({
  to,
  orderId,
  orderNumber,
  fileName,
  amount,
  variableSymbol,
}: {
  to: string;
  orderId: string;
  orderNumber: string | null;
  fileName: string;
  amount: number;
  variableSymbol: string;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Missing GMAIL credentials, transfer payment email skipped.");
    return;
  }
  if (!to) {
    console.warn("Transfer payment email skipped: no recipient address for order", orderId);
    return;
  }

  const orderLabel = orderNumber ? `#${orderNumber}` : orderId.slice(0, 8);
  const link = `${baseUrl}/ucet/objednavky/${orderId}`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;
                  padding:32px;border:1px solid #e5e5e5;">

        <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
          VytlacTo3D
        </div>

        <h1 style="margin:14px 0 16px;font-size:26px;color:#111;">
          Objednavka ${orderLabel} – platba prevodom
        </h1>

        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px;">
          Dakujeme za objednavku <strong>${fileName}</strong>. Prosime vas o uhradu
          prevodom na nas ucet. Po prijati platby okamzite zacneme s vyrobou.
        </p>

        <div style="border-radius:18px;background:#fafafa;border:1px solid #eee;padding:24px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:16px;">
            Platobne udaje
          </div>
          <table style="width:100%;font-size:15px;color:#222;border-collapse:collapse;">
            <tr>
              <td style="padding:7px 0;color:#777;width:50%;">Prijemca</td>
              <td style="padding:7px 0;font-weight:700;text-align:right;">${COMPANY_INFO.name}</td>
            </tr>
            <tr>
              <td style="padding:7px 0;color:#777;">IBAN</td>
              <td style="padding:7px 0;font-weight:700;text-align:right;font-family:monospace;font-size:14px;">${COMPANY_INFO.iban}</td>
            </tr>
            <tr>
              <td style="padding:7px 0;color:#777;">SWIFT/BIC</td>
              <td style="padding:7px 0;font-weight:700;text-align:right;">${COMPANY_INFO.swift}</td>
            </tr>
            <tr>
              <td style="padding:7px 0;color:#777;">Banka</td>
              <td style="padding:7px 0;font-weight:600;text-align:right;">${COMPANY_INFO.bankName}</td>
            </tr>
            <tr style="border-top:1px solid #eee;">
              <td style="padding:10px 0 7px;color:#777;">Suma</td>
              <td style="padding:10px 0 7px;font-weight:800;text-align:right;color:#FFAE00;font-size:20px;">${amount.toFixed(2).replace(".", ",")} &euro;</td>
            </tr>
            <tr>
              <td style="padding:7px 0;color:#777;">Variabilny symbol</td>
              <td style="padding:7px 0;font-weight:800;text-align:right;font-family:monospace;font-size:18px;color:#111;">${variableSymbol}</td>
            </tr>
          </table>
        </div>

        <div style="background:#FFF8E7;border:1px solid #FFAE00;border-radius:14px;padding:16px;margin-bottom:24px;">
          <strong style="font-size:14px;color:#7a5800;">Dolezite:</strong>
          <span style="font-size:14px;color:#7a5800;">
            &nbsp;Pri prevode uvedzite <strong>variabilny symbol ${variableSymbol}</strong>.
            Bez neho nevieme platbu priradit k vasej objednavke.
          </span>
        </div>

        <div style="margin-bottom:28px;">
          <a href="${link}"
             style="display:inline-block;background:#FFAE00;color:#000;
                    text-decoration:none;font-weight:800;padding:14px 28px;
                    border-radius:14px;font-size:16px;">
            Zobrazit objednavku &rarr;
          </a>
        </div>

        <p style="font-size:13px;color:#999;line-height:1.6;">
          Fakturacne udaje: ${COMPANY_INFO.name}, ${COMPANY_INFO.street},
          ${COMPANY_INFO.zip} ${COMPANY_INFO.city}<br/>
          ICO: ${COMPANY_INFO.ico} &bull; DIC: ${COMPANY_INFO.dic} &bull; IC DPH: ${COMPANY_INFO.icDph}<br/>
          ${COMPANY_INFO.commercialRegister}
        </p>

        ${CONTACT}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Platobne udaje k objednavke ${orderLabel} – VytlacTo3D`,
    html,
  });
}
