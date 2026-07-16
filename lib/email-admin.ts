import { transporter, FROM } from "@/lib/mailer";
import { formatEur, addVat, vatAmount } from "@/lib/vat";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const CONTACT = `
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#777;line-height:1.7;">
    <strong style="color:#111;">VytlačTo3D</strong><br/>
    Email: <a href="mailto:info@4frommedia.sk" style="color:#FFAE00;">info@4frommedia.sk</a><br/>
    Web: <a href="${baseUrl}" style="color:#FFAE00;">www.vytlacto3d.sk</a>
  </div>
`;

function row(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<tr><td style="padding:5px 12px 5px 0;color:#666;font-size:14px;white-space:nowrap;">${label}</td><td style="padding:5px 0;font-size:14px;color:#111;font-weight:600;">${value}</td></tr>`;
}

function section(title: string, content: string) {
  return `
    <div style="margin-top:20px;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px;">${title}</div>
      <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;">
        <table style="border-collapse:collapse;width:100%;">${content}</table>
      </div>
    </div>
  `;
}

export async function sendAdminOrderNotificationEmail({
  orderId,
  orderNumber,
  fileName,
  customerEmail,
  totalEur,
  shippingMethod,
  shippingCostEur,
  phone,
  accountType,
  companyName,
  ico,
  dic,
  icDph,
  contactPerson,
  deliveryAddress,
  config,
  pricing,
  createdAt,
}: {
  orderId: string;
  orderNumber?: string | null;
  fileName: string;
  customerEmail?: string | null;
  totalEur?: number | null;
  shippingMethod?: string | null;
  shippingCostEur?: number | null;
  phone?: string | null;
  accountType?: string | null;
  companyName?: string | null;
  ico?: string | null;
  dic?: string | null;
  icDph?: string | null;
  contactPerson?: string | null;
  deliveryAddress?: Record<string, any> | null;
  config?: Record<string, any> | null;
  pricing?: Record<string, any> | null;
  createdAt?: Date | null;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Missing GMAIL credentials, admin order notification email skipped.");
    return;
  }

  const ref = orderNumber ?? orderId;
  const dateStr = createdAt
    ? new Intl.DateTimeFormat("sk-SK", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava",
      }).format(createdAt)
    : null;

  const qualityLabel = config?.quality === "DRAFT" ? "Rýchla (draft)" : config?.quality === "FINE" ? "Jemná (fine)" : config?.quality === "STANDARD" ? "Štandardná" : config?.quality ?? null;

  const pricingNet = typeof pricing?.total === "number" ? pricing.total : null;

  await transporter.sendMail({
    from: FROM,
    to: process.env.ADMIN_ORDER_EMAIL || "info@4frommedia.sk",
    subject: `🛒 Nová objednávka ${ref} – ${fileName}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:680px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">

          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="background:#FFAE00;border-radius:12px;padding:10px 18px;font-weight:800;font-size:22px;color:#000;">
              VytlačTo3D
            </div>
            <div style="font-size:13px;color:#888;">Nová zaplatená objednávka</div>
          </div>

          <h1 style="margin:0 0 4px;font-size:26px;color:#111;">${ref}</h1>
          ${dateStr ? `<div style="font-size:13px;color:#999;margin-bottom:16px;">${dateStr}</div>` : ""}

          ${section("Zákazník", [
            row("Meno", deliveryAddress?.name ?? contactPerson),
            row("Email", customerEmail),
            row("Telefón", phone),
            row("Typ účtu", accountType === "COMPANY" ? "Firma" : accountType === "PERSON" ? "Súkromná osoba" : null),
          ].join(""))}

          ${accountType === "COMPANY" ? section("Firemné údaje", [
            row("Firma", companyName),
            row("IČO", ico),
            row("DIČ", dic),
            row("IČ DPH", icDph),
            row("Kontaktná osoba", contactPerson),
          ].join("")) : ""}

          ${section("Adresa doručenia", [
            row("Ulica", deliveryAddress?.street ?? deliveryAddress?.line1 ?? deliveryAddress?.address),
            row("Mesto", deliveryAddress?.city),
            row("PSČ", deliveryAddress?.zip ?? deliveryAddress?.postal_code),
            row("Krajina", deliveryAddress?.country),
          ].join("") || `<tr><td style="color:#999;font-size:14px;">—</td></tr>`)}

          ${section("Objednávka", [
            row("Súbor", fileName),
            row("Materiál", config?.material),
            row("Farba", config?.color),
            row("Kvalita", qualityLabel),
            row("Množstvo", config?.quantity != null ? `${config.quantity} ks` : null),
            row("Infill", config?.infillPct != null ? `${config.infillPct}%` : null),
            row("Mierka", config?.scalePct != null ? `${config.scalePct}%` : null),
          ].join(""))}

          ${section("Cena", [
            pricingNet != null ? row("Základ bez DPH", formatEur(pricingNet)) : "",
            pricingNet != null ? row("DPH 23 %", formatEur(vatAmount(pricingNet))) : "",
            pricingNet != null ? row("Výroba s DPH", formatEur(addVat(pricingNet))) : "",
            shippingCostEur != null ? row("Doprava", formatEur(shippingCostEur)) : "",
            row("Doprava (metóda)", shippingMethod),
            totalEur != null ? row("Celkom zaplatené", formatEur(totalEur)) : "",
          ].join(""))}

          <div style="margin-top:24px;">
            <a href="${baseUrl}/admin/orders/${orderId}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
              Otvoriť objednávku v administrácii →
            </a>
          </div>

          ${CONTACT}
        </div>
      </div>
    `,
  });
}
