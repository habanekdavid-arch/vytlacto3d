import { Resend } from "resend";
import { formatEur } from "@/lib/vat";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const FROM =
  process.env.RESEND_FROM_EMAIL || "VytlacTo3D <onboarding@resend.dev>";

type StatusEmailParams = {
  to: string;
  orderId: string;
  orderNumber?: string | null;
  fileName: string;
  status: string;
  shippingMethod?: string | null;
  totalEur?: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  PRINTING: "Tlačíme váš model",
  SHIPPED: "Objednávka odoslaná",
  DONE: "Objednávka vybavená",
  CANCELED: "Objednávka zrušená",
};

function orderLink(orderId: string) {
  return `${baseUrl}/ucet/objednavky/${orderId}`;
}

function headerBadge(status: string) {
  const color =
    status === "CANCELED"
      ? "#ef4444"
      : status === "DONE" || status === "SHIPPED"
      ? "#16a34a"
      : "#FFAE00";
  const label = STATUS_LABELS[status] ?? status;
  return `<div style="display:inline-block;background:${color};color:${status === "CANCELED" || status === "DONE" || status === "SHIPPED" ? "#fff" : "#000"};font-weight:800;font-size:13px;padding:6px 16px;border-radius:999px;margin-bottom:20px;">${label}</div>`;
}

function orderInfoBox(params: StatusEmailParams) {
  const ref = params.orderNumber ?? params.orderId;
  return `
    <div style="border-radius:18px;background:#fafafa;border:1px solid #eee;padding:20px;margin:20px 0;">
      <p style="margin:4px 0;"><strong>Číslo objednávky:</strong> ${ref}</p>
      <p style="margin:4px 0;"><strong>Súbor:</strong> ${params.fileName}</p>
      ${params.shippingMethod ? `<p style="margin:4px 0;"><strong>Doprava:</strong> ${params.shippingMethod}</p>` : ""}
      ${typeof params.totalEur === "number" ? `<p style="margin:4px 0;"><strong>Suma:</strong> ${formatEur(params.totalEur)}</p>` : ""}
    </div>
  `;
}

function wrapper(content: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
        <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;margin-bottom:8px;">VytlačTo3D</div>
        ${content}
        <div style="margin-top:28px;">
          <a href="${baseUrl}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
            Prejsť na VytlačTo3D
          </a>
        </div>
      </div>
    </div>
  `;
}

function buildHtml(params: StatusEmailParams): string {
  const { status, orderId } = params;
  const link = orderLink(orderId);

  if (status === "PRINTING") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 16px;font-size:26px;color:#111;">Váš model sa práve tlačí 🖨️</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;">
        Vaša objednávka bola prijatá do výroby. Keď bude hotová, budeme vás kontaktovať.
      </p>
      ${orderInfoBox(params)}
      <a href="${link}" style="display:inline-block;margin-top:4px;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;font-size:14px;">Sledovať objednávku</a>
    `);
  }

  if (status === "SHIPPED") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 16px;font-size:26px;color:#111;">Objednávka je na ceste k vám 📦</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;">
        Váš 3D model bol vyrobený a odoslaný. Čoskoro dorazí na vašu adresu.
      </p>
      ${orderInfoBox(params)}
      <a href="${link}" style="display:inline-block;margin-top:4px;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;font-size:14px;">Zobraziť objednávku</a>
    `);
  }

  if (status === "DONE") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 16px;font-size:26px;color:#111;">Objednávka vybavená ✅</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;">
        Vaša objednávka bola úspešne vybavená. Ďakujeme, že ste sa rozhodli pre VytlačTo3D!
      </p>
      ${orderInfoBox(params)}
    `);
  }

  if (status === "CANCELED") {
    return wrapper(`
      ${headerBadge(status)}
      <h1 style="margin:0 0 16px;font-size:26px;color:#111;">Objednávka bola zrušená</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;">
        Vaša objednávka bola zrušená. Ak máte otázky, kontaktujte nás na <a href="mailto:info@4frommedia.sk">info@4frommedia.sk</a>.
      </p>
      ${orderInfoBox(params)}
    `);
  }

  return "";
}

export async function sendOrderStatusEmail(params: StatusEmailParams) {
  if (!process.env.RESEND_API_KEY) return;
  if (!params.to) return;

  const html = buildHtml(params);
  if (!html) return;

  const subject = STATUS_LABELS[params.status]
    ? `${STATUS_LABELS[params.status]} – ${params.orderNumber ?? params.orderId}`
    : null;

  if (!subject) return;

  await resend.emails.send({ from: FROM, to: params.to, subject, html });
}
