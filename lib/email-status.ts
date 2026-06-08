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

type StatusEmailParams = {
  to: string;
  orderId: string;
  orderNumber?: string | null;
  fileName: string;
  status: string;
  shippingMethod?: string | null;
  totalEur?: number | null;
  shippingCostEur?: number | null;
  deliveryAddress?: Record<string, any> | null;
  config?: Record<string, any> | null;
  pricing?: Record<string, any> | null;
};

const STATUS_LABELS: Record<string, string> = {
  PRINTING: "Tlačíme váš model",
  SHIPPED: "Objednávka odoslaná",
  DONE: "Objednávka vybavená",
  CANCELED: "Objednávka zrušená",
};

function headerBadge(status: string) {
  const color =
    status === "CANCELED" ? "#ef4444" :
    status === "DONE" || status === "SHIPPED" ? "#16a34a" :
    "#FFAE00";
  const textColor = status === "CANCELED" || status === "DONE" || status === "SHIPPED" ? "#fff" : "#000";
  const label = STATUS_LABELS[status] ?? status;
  return `<div style="display:inline-block;background:${color};color:${textColor};font-weight:800;font-size:13px;padding:6px 16px;border-radius:999px;margin-bottom:20px;">${label}</div>`;
}

function orderInfoBox(params: StatusEmailParams) {
  const ref = params.orderNumber ?? params.orderId;
  const qualityLabel =
    params.config?.quality === "DRAFT" ? "Rýchla (draft)" :
    params.config?.quality === "FINE" ? "Jemná (fine)" :
    params.config?.quality === "STANDARD" ? "Štandardná" :
    params.config?.quality ?? null;

  const pricingNet = typeof params.pricing?.total === "number" ? params.pricing.total : null;

  return `
    <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin:16px 0;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Detaily objednávky</div>
      <table style="border-collapse:collapse;width:100%;">
        ${row("Číslo objednávky", ref)}
        ${row("Súbor", params.fileName)}
        ${row("Materiál", params.config?.material)}
        ${row("Farba", params.config?.color)}
        ${row("Kvalita", qualityLabel)}
        ${params.config?.quantity != null ? row("Množstvo", `${params.config.quantity} ks`) : ""}
        ${row("Doprava", params.shippingMethod)}
      </table>
    </div>

    ${pricingNet != null ? `
    <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin:16px 0;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Cena</div>
      <table style="border-collapse:collapse;width:100%;">
        ${row("Základ bez DPH", formatEur(pricingNet))}
        ${row("DPH 23 %", formatEur(vatAmount(pricingNet)))}
        ${row("Výroba s DPH", formatEur(addVat(pricingNet)))}
        ${params.shippingCostEur != null ? row("Doprava", formatEur(params.shippingCostEur)) : ""}
        ${params.totalEur != null ? `<tr><td style="padding:8px 12px 5px 0;color:#111;font-size:15px;font-weight:800;border-top:1px solid #eee;">Celkom zaplatené</td><td style="padding:8px 0 5px;font-size:15px;color:#111;font-weight:800;border-top:1px solid #eee;">${formatEur(params.totalEur)}</td></tr>` : ""}
      </table>
    </div>
    ` : params.totalEur != null ? `
    <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin:16px 0;">
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:5px 12px 5px 0;color:#111;font-size:15px;font-weight:800;">Celkom zaplatené</td><td style="padding:5px 0;font-size:15px;color:#111;font-weight:800;">${formatEur(params.totalEur)}</td></tr>
      </table>
    </div>
    ` : ""}

    ${params.deliveryAddress && params.status === "SHIPPED" ? `
    <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;margin:16px 0;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:10px;">Adresa doručenia</div>
      <table style="border-collapse:collapse;width:100%;">
        ${row("Meno", params.deliveryAddress.name)}
        ${row("Ulica", params.deliveryAddress.street ?? params.deliveryAddress.line1 ?? params.deliveryAddress.address)}
        ${row("Mesto", params.deliveryAddress.city)}
        ${row("PSČ", params.deliveryAddress.zip ?? params.deliveryAddress.postal_code)}
        ${row("Krajina", params.deliveryAddress.country)}
      </table>
    </div>
    ` : ""}
  `;
}

function wrapper(content: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
        <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;margin-bottom:8px;">VytlačTo3D</div>
        ${content}
        ${CONTACT}
      </div>
    </div>
  `;
}

function buildHtml(params: StatusEmailParams): string {
  const { status, orderId } = params;
  const link = `${baseUrl}/ucet/objednavky/${orderId}`;

  if (status === "PRINTING") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 12px;font-size:26px;color:#111;">Váš model sa práve tlačí 🖨️</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 4px;">
        Vaša objednávka bola prijatá do výroby. Keď bude hotová, ihneď vám dáme vedieť.
      </p>
      ${orderInfoBox(params)}
      <a href="${link}" style="display:inline-block;margin-top:4px;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;font-size:14px;">Sledovať objednávku →</a>
    `);
  }

  if (status === "SHIPPED") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 12px;font-size:26px;color:#111;">Objednávka je na ceste k vám 📦</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 4px;">
        Váš 3D model bol vyrobený a odoslaný. Čoskoro dorazí na vašu adresu.
      </p>
      ${orderInfoBox(params)}
      <a href="${link}" style="display:inline-block;margin-top:4px;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;font-size:14px;">Zobraziť objednávku →</a>
    `);
  }

  if (status === "DONE") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 12px;font-size:26px;color:#111;">Objednávka vybavená ✅</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 4px;">
        Vaša objednávka bola úspešne vybavená. Ďakujeme, že ste si vybrali VytlačTo3D!
      </p>
      ${orderInfoBox(params)}
    `);
  }

  if (status === "CANCELED") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 12px;font-size:26px;color:#111;">Objednávka bola zrušená</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 4px;">
        Vaša objednávka bola zrušená. Ak máte otázky alebo potrebujete pomoc, neváhajte nás kontaktovať.
      </p>
      ${orderInfoBox(params)}
    `);
  }

  return "";
}

export async function sendOrderStatusEmail(params: StatusEmailParams) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  if (!params.to) return;

  const html = buildHtml(params);
  if (!html) return;

  const subject = STATUS_LABELS[params.status]
    ? `${STATUS_LABELS[params.status]} – ${params.orderNumber ?? params.orderId}`
    : null;

  if (!subject) return;

  await transporter.sendMail({ from: FROM, to: params.to, subject, html });
}
