import { transporter, FROM } from "@/lib/mailer";
import { formatEur, addVat, vatAmount } from "@/lib/vat";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const CONTACT = `
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#777;line-height:1.7;">
    <strong style="color:#111;">VytlačTo3D</strong><br/>
    Ak máte otázky, napíšte nám: <a href="mailto:info@4frommedia.sk" style="color:#FFAE00;">info@4frommedia.sk</a><br/>
    <a href="${baseUrl}" style="color:#FFAE00;">www.vytlacto3d.sk</a>
  </div>
`;

function row(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<tr><td style="padding:5px 12px 5px 0;color:#666;font-size:14px;white-space:nowrap;">${label}</td><td style="padding:5px 0;font-size:14px;color:#111;font-weight:600;">${value}</td></tr>`;
}

export async function sendOrderPaidEmail({
  to,
  orderId,
  orderNumber,
  fileName,
  totalEur,
  shippingMethod,
  shippingCostEur,
  deliveryAddress,
  config,
  pricing,
}: {
  to: string;
  orderId: string;
  orderNumber?: string | null;
  fileName: string;
  totalEur?: number | null;
  shippingMethod?: string | null;
  shippingCostEur?: number | null;
  deliveryAddress?: Record<string, any> | null;
  config?: Record<string, any> | null;
  pricing?: Record<string, any> | null;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Missing GMAIL credentials, customer order email skipped.");
    return;
  }

  const ref = orderNumber ?? orderId;
  const qualityLabel =
    config?.quality === "DRAFT" ? "Rýchla (draft)" :
    config?.quality === "FINE" ? "Jemná (fine)" :
    config?.quality === "STANDARD" ? "Štandardná" :
    config?.quality ?? null;

  const pricingNet = typeof pricing?.total === "number" ? pricing.total : null;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Ďakujeme za objednávku ${ref} – VytlačTo3D`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
          <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlačTo3D</div>

          <h1 style="margin:14px 0 8px;font-size:28px;color:#111;">Ďakujeme za vašu objednávku!</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px;">
            Objednávka <strong>${ref}</strong> bola úspešne zaplatená a prijatá do spracovania.
          </p>

          <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Detaily objednávky</div>
            <table style="border-collapse:collapse;width:100%;">
              ${row("Súbor", fileName)}
              ${row("Materiál", config?.material)}
              ${row("Farba", config?.color)}
              ${row("Kvalita", qualityLabel)}
              ${config?.quantity != null ? row("Množstvo", `${config.quantity} ks`) : ""}
              ${config?.infillPct != null ? row("Infill", `${config.infillPct}%`) : ""}
            </table>
          </div>

          ${pricingNet != null ? `
          <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Cena</div>
            <table style="border-collapse:collapse;width:100%;">
              ${row("Základ bez DPH", formatEur(pricingNet))}
              ${row("DPH 23 %", formatEur(vatAmount(pricingNet)))}
              ${row("Výroba s DPH", formatEur(addVat(pricingNet)))}
              ${shippingCostEur != null ? row("Doprava", formatEur(shippingCostEur)) : ""}
              ${shippingMethod ? row("Metóda dopravy", shippingMethod) : ""}
              ${totalEur != null ? `<tr><td style="padding:8px 12px 5px 0;color:#111;font-size:15px;font-weight:800;border-top:1px solid #eee;">Celkom zaplatené</td><td style="padding:8px 0 5px;font-size:15px;color:#111;font-weight:800;border-top:1px solid #eee;">${formatEur(totalEur)}</td></tr>` : ""}
            </table>
          </div>
          ` : totalEur != null ? `
          <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin-bottom:16px;">
            <table style="border-collapse:collapse;width:100%;">
              ${row("Doprava", shippingMethod)}
              <tr><td style="padding:5px 12px 5px 0;color:#111;font-size:15px;font-weight:800;">Celkom zaplatené</td><td style="padding:5px 0;font-size:15px;color:#111;font-weight:800;">${formatEur(totalEur)}</td></tr>
            </table>
          </div>
          ` : ""}

          ${deliveryAddress ? `
          <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Adresa doručenia</div>
            <table style="border-collapse:collapse;width:100%;">
              ${row("Meno", deliveryAddress.name)}
              ${row("Ulica", deliveryAddress.street ?? deliveryAddress.line1 ?? deliveryAddress.address)}
              ${row("Mesto", deliveryAddress.city)}
              ${row("PSČ", deliveryAddress.zip ?? deliveryAddress.postal_code)}
              ${row("Krajina", deliveryAddress.country)}
            </table>
          </div>
          ` : ""}

          <div style="margin:24px 0 0;">
            <a href="${baseUrl}/ucet/objednavky/${orderId}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
              Zobraziť objednávku →
            </a>
          </div>

          ${CONTACT}
        </div>
      </div>
    `,
  });
}
