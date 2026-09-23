import { sendMail, FROM, ADMIN_INBOX, hasMailCredentials } from "@/lib/mailer";
import { formatEur, addVat, vatAmount } from "@/lib/vat";
import { colorLabel, materialLabel, qualityLabel } from "@/lib/print-options";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const CONTACT = `
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#777;line-height:1.7;">
    <strong style="color:#111;">VytlačTo3D</strong><br/>
    Email: <a href="mailto:info@4frommedia.sk" style="color:#FFAE00;">info@4frommedia.sk</a><br/>
    Web: <a href="${baseUrl}" style="color:#FFAE00;">www.vytlacto3d.sk</a>
  </div>
`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** "—" pre prázdnu hodnotu, inak HTML-escapovaný text. */
function esc(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return escapeHtml(String(value));
}

/**
 * Jeden riadok bloku "Label : hodnota". Vynechá sa úplne, keď je hodnota
 * prázdna — nechceme v ľahko kopírovateľnom bloku desiatky riadkov s "—".
 */
function line(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `  ${label} : ${escapeHtml(String(value))}`;
}

type Address = Record<string, any> | null | undefined;

/** Riadky adresy — doručovacej aj fakturačnej, vrátane výdajného miesta Packeta. */
function addressLines(addr: Address, withName = true): string[] {
  if (!addr) return [];

  const lines: (string | null)[] = [];

  if (addr.type === "packeta") {
    lines.push(line("Výdajné miesto", addr.packetaPointName));
  } else if (withName) {
    lines.push(line("Meno    ", addr.name || addr.contact));
  }

  // Zarovnané na rovnakú šírku ako v ostatných sekciách bloku.
  const street = addr.street ?? addr.line1 ?? addr.address;
  lines.push(line("Ulica   ", addr.line2 ? `${street ?? ""}, ${addr.line2}` : street));
  lines.push(line("Mesto   ", addr.city));
  lines.push(line("PSČ     ", addr.zip ?? addr.postal_code));
  lines.push(line("Krajina ", addr.country));

  return lines.filter((l): l is string => l !== null);
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
  accountName,
  billingAddress,
  deliveryAddress,
  config,
  pricing,
  paymentMethod = "CARD",
  variableSymbol,
  status,
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
  // Meno z účtu zákazníka (User.name) — najspoľahlivejší zdroj mena
  // pre prihláseného zákazníka, keď ho neposkytol Stripe ani doručovacia adresa.
  accountName?: string | null;
  billingAddress?: Record<string, any> | null;
  deliveryAddress?: Record<string, any> | null;
  config?: Record<string, any> | null;
  pricing?: Record<string, any> | null;
  paymentMethod?: "CARD" | "TRANSFER";
  variableSymbol?: string | null;
  // Stav objednávky v momente odoslania — TRANSFER objednávka v tomto bode
  // ešte nie je zaplatená, e-mail to musí povedať jasne.
  status?: string | null;
  createdAt?: Date | null;
}) {
  if (!hasMailCredentials()) {
    console.warn("Missing SMTP credentials, admin order notification email skipped.");
    return;
  }

  const ref = orderNumber ?? orderId;
  const dateStr = createdAt
    ? new Intl.DateTimeFormat("sk-SK", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava",
      }).format(createdAt)
    : null;

  const pricingNet = typeof pricing?.total === "number" ? pricing.total : null;

  const isAwaitingTransfer = status === "AWAITING_TRANSFER" || paymentMethod === "TRANSFER";
  const badgeText = isAwaitingTransfer
    ? "Nová objednávka — čaká sa platba prevodom"
    : "Nová zaplatená objednávka";
  const subject = isAwaitingTransfer
    ? `🕓 Nová objednávka ${ref} – čaká platba prevodom – ${fileName}`
    : `🛒 Nová zaplatená objednávka ${ref} – ${fileName}`;

  // Meno zákazníka nie je na objednávke jedno pole — poskladá sa z toho, čo
  // sa podarilo zachytiť: meno zadané pri platbe kartou, meno pri doručení,
  // kontaktná osoba (pri firme aj pri platbe prevodom) a napokon meno z účtu.
  const customerName =
    billingAddress?.name ||
    deliveryAddress?.name ||
    deliveryAddress?.contact ||
    contactPerson ||
    accountName ||
    null;

  const isCompany = accountType === "COMPANY";

  const copyLines: (string | null)[] = [
    "═".repeat(46),
    `  OBJEDNÁVKA ${escapeHtml(ref)}`,
    `  Stav: ${isAwaitingTransfer ? "Čaká sa platba prevodom" : "Zaplatené"}`,
    "═".repeat(46),
    "",
    "ZÁKAZNÍK",
    "─".repeat(46),
    line("Meno    ", customerName),
    line("Email   ", customerEmail),
    line("Telefón ", phone),
    line("Typ účtu", isCompany ? "Firma" : accountType === "PERSON" ? "Súkromná osoba" : null),

    ...(isCompany
      ? [
          "",
          "FIREMNÉ ÚDAJE",
          "─".repeat(46),
          line("Spoločnosť   ", companyName),
          line("Kontaktná os.", contactPerson),
          line("IČO          ", ico),
          line("DIČ          ", dic),
          line("IČ DPH       ", icDph),
        ]
      : []),

    ...(billingAddress
      ? ["", "FAKTURAČNÁ ADRESA", "─".repeat(46), ...addressLines(billingAddress, false)]
      : []),

    ...(deliveryAddress
      ? ["", "ADRESA DORUČENIA", "─".repeat(46), ...addressLines(deliveryAddress)]
      : []),

    "",
    "OBJEDNÁVKA",
    "─".repeat(46),
    line("Súbor   ", fileName),
    line("Materiál", materialLabel(config?.material, "")),
    line("Kvalita ", qualityLabel(config?.quality, "")),
    line("Farba   ", colorLabel(config?.color, "")),
    line("Množstvo", config?.quantity != null ? `${config.quantity} ks` : null),
    line("Infill  ", config?.infillPct != null ? `${config.infillPct}%` : null),
    line("Mierka  ", config?.scalePct != null ? `${config.scalePct}%` : null),

    "",
    "PLATBA",
    "─".repeat(46),
    line("Spôsob           ", isAwaitingTransfer ? "Prevodom na účet" : "Kartou (Stripe)"),
    ...(isAwaitingTransfer ? [line("Variabilný symbol", variableSymbol)] : []),
    pricingNet != null ? line("Základ bez DPH   ", formatEur(pricingNet)) : null,
    pricingNet != null ? line("DPH 23 %         ", formatEur(vatAmount(pricingNet))) : null,
    pricingNet != null ? line("Výroba s DPH     ", formatEur(addVat(pricingNet))) : null,
    line("Doprava          ", shippingMethod),
    shippingCostEur != null ? line("Cena dopravy     ", formatEur(shippingCostEur)) : null,
    totalEur != null ? line("CELKOM           ", formatEur(totalEur)) : null,
    "═".repeat(46),
  ];

  const copyBlock = copyLines.filter((l): l is string => l !== null).join("\n");

  await sendMail({
    from: FROM,
    to: ADMIN_INBOX,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:680px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">

          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="background:#FFAE00;border-radius:12px;padding:10px 18px;font-weight:800;font-size:22px;color:#000;">
              VytlačTo3D
            </div>
            <div style="font-size:13px;color:#888;">${badgeText}</div>
          </div>

          <h1 style="margin:0 0 4px;font-size:26px;color:#111;">${esc(ref)}</h1>
          ${dateStr ? `<div style="font-size:13px;color:#999;margin-bottom:16px;">${esc(dateStr)}</div>` : ""}

          <div style="margin-top:12px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px;">
              Všetky údaje — na jedno kliknutie skopírovateľné
            </div>
            <div style="background:#fafafa;border:1px solid #eee;border-radius:14px;padding:16px 20px;overflow-x:auto;">
              <pre style="margin:0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;line-height:1.7;color:#111;white-space:pre;">${copyBlock}</pre>
            </div>
          </div>

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
