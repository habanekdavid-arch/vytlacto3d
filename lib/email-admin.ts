import { Resend } from "resend";
import { formatPriceWithVat } from "@/lib/vat";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

export async function sendAdminOrderNotificationEmail({
  orderId,
  fileName,
  customerEmail,
  totalEur,
  shippingMethod,
  phone,
  accountType,
  companyName,
  ico,
  dic,
  icDph,
  contactPerson,
}: {
  orderId: string;
  fileName: string;
  customerEmail?: string | null;
  totalEur?: number | null;
  shippingMethod?: string | null;
  phone?: string | null;
  accountType?: string | null;
  companyName?: string | null;
  ico?: string | null;
  dic?: string | null;
  icDph?: string | null;
  contactPerson?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      "VytlačTo3D <noreply@vytlacto3d.sk>",
    to: process.env.ADMIN_ORDER_EMAIL || "info@4frommedia.sk",
    subject: `Nová zaplatená objednávka – ${fileName}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
        <div style="max-width:680px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
          <h1 style="margin:0 0 20px;font-size:28px;color:#111;">Nová zaplatená objednávka</h1>

          <div style="border-radius:18px;background:#fafafa;border:1px solid #eee;padding:20px;">
            <p><strong>ID:</strong> ${orderId}</p>
            <p><strong>Súbor:</strong> ${fileName}</p>
            <p><strong>Email:</strong> ${customerEmail ?? "—"}</p>
            <p><strong>Telefón:</strong> ${phone ?? "—"}</p>
            <p><strong>Typ účtu:</strong> ${accountType ?? "—"}</p>
            <p><strong>Firma:</strong> ${companyName ?? "—"}</p>
            <p><strong>IČO:</strong> ${ico ?? "—"}</p>
            <p><strong>DIČ:</strong> ${dic ?? "—"}</p>
            <p><strong>IČ DPH:</strong> ${icDph ?? "—"}</p>
            <p><strong>Kontaktná osoba:</strong> ${contactPerson ?? "—"}</p>
            <p><strong>Doprava:</strong> ${shippingMethod ?? "—"}</p>
            <p><strong>Suma:</strong> ${
              typeof totalEur === "number" ? formatPriceWithVat(totalEur) : "—"
            }</p>
          </div>

          <div style="margin-top:28px;">
            <a href="${baseUrl}/admin/orders/${orderId}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
              Otvoriť objednávku
            </a>
          </div>
        </div>
      </div>
    `,
  });
}