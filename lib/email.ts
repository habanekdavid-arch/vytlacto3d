import { Resend } from "resend";
import { formatPriceWithVat } from "@/lib/vat";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

export async function sendOrderPaidEmail({
  to,
  orderId,
  fileName,
  totalEur,
  shippingMethod,
}: {
  to: string;
  orderId: string;
  fileName: string;
  totalEur?: number | null;
  shippingMethod?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Missing RESEND_API_KEY, customer order email skipped.");
    return;
  }

  await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      "VytlačTo3D <noreply@vytlacto3d.sk>",
    to,
    subject: "Ďakujeme za objednávku – VytlačTo3D",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
          <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">VytlačTo3D</div>

          <h1 style="margin:14px 0 16px;font-size:28px;color:#111;">
            Ďakujeme za vašu objednávku
          </h1>

          <p style="font-size:16px;line-height:1.6;color:#444;">
            Vaša objednávka bola úspešne zaplatená a prijatá do spracovania.
          </p>

          <div style="margin-top:24px;border-radius:18px;background:#fafafa;border:1px solid #eee;padding:20px;">
            <p><strong>ID objednávky:</strong> ${orderId}</p>
            <p><strong>Súbor:</strong> ${fileName}</p>
            <p><strong>Doprava:</strong> ${shippingMethod ?? "—"}</p>
            <p><strong>Suma:</strong> ${
              typeof totalEur === "number" ? formatPriceWithVat(totalEur) : "—"
            }</p>
          </div>

          <div style="margin:28px 0;">
            <a href="${baseUrl}/ucet/objednavky/${orderId}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
              Zobraziť objednávku
            </a>
          </div>
        </div>
      </div>
    `,
  });
}