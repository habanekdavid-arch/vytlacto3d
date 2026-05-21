import { Resend } from "resend";
import { formatPriceWithVat } from "@/lib/vat";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

type AdminOrderEmailInput = {
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
};

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
}: AdminOrderEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Missing RESEND_API_KEY, admin order email skipped.");
    return;
  }

  const to = process.env.ADMIN_ORDER_EMAIL || "info@4frommedia.sk";
  const adminOrderUrl = `${baseUrl}/admin/orders/${orderId}`;

  await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      "VytlačTo3D <noreply@vytlacto3d.sk>",
    to,
    subject: `Nová zaplatená objednávka – ${fileName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:32px;">
        <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:22px; padding:32px; border:1px solid #e5e5e5;">
          <div style="font-size:13px; color:#777; font-weight:700; letter-spacing:.04em; text-transform:uppercase;">
            VytlačTo3D
          </div>

          <h1 style="margin:12px 0 18px; font-size:28px; color:#111;">
            Nová zaplatená objednávka
          </h1>

          <p style="font-size:15px; line-height:1.6; color:#444;">
            Na webe bola vytvorená a zaplatená nová objednávka.
          </p>

          <div style="margin-top:24px; border-radius:18px; background:#fafafa; border:1px solid #eee; padding:20px;">
            <table style="width:100%; border-collapse:collapse; font-size:14px; color:#333;">
              <tr>
                <td style="padding:8px 0; color:#777;">ID objednávky</td>
                <td style="padding:8px 0; font-weight:700; text-align:right;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#777;">Súbor</td>
                <td style="padding:8px 0; font-weight:700; text-align:right;">${fileName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#777;">Zákazník</td>
                <td style="padding:8px 0; font-weight:700; text-align:right;">${customerEmail ?? "—"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#777;">Telefón</td>
                <td style="padding:8px 0; font-weight:700; text-align:right;">${phone ?? "—"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#777;">Typ účtu</td>
                <td style="padding:8px 0; font-weight:700; text-align:right;">${accountType ?? "—"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#777;">Cena spolu</td>
                <td style="padding:8px 0; font-weight:800; text-align:right; color:#111;">${
                  typeof totalEur === "number"
                    ? formatPriceWithVat(totalEur)
                    : "—"
                }</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#777;">Doprava</td>
                <td style="padding:8px 0; font-weight:700; text-align:right;">${shippingMethod ?? "—"}</td>
              </tr>
            </table>
          </div>

          ${
            companyName
              ? `
              <div style="margin-top:18px; border-radius:18px; background:#fffaf0; border:1px solid #ffe0a3; padding:20px;">
                <div style="font-size:15px; font-weight:800; color:#111; margin-bottom:12px;">
                  Firemné údaje
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:14px; color:#333;">
                  <tr>
                    <td style="padding:7px 0; color:#777;">Spoločnosť</td>
                    <td style="padding:7px 0; font-weight:700; text-align:right;">${companyName}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0; color:#777;">IČO</td>
                    <td style="padding:7px 0; font-weight:700; text-align:right;">${ico ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0; color:#777;">DIČ</td>
                    <td style="padding:7px 0; font-weight:700; text-align:right;">${dic ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0; color:#777;">IČ DPH</td>
                    <td style="padding:7px 0; font-weight:700; text-align:right;">${icDph ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0; color:#777;">Kontaktná osoba</td>
                    <td style="padding:7px 0; font-weight:700; text-align:right;">${contactPerson ?? "—"}</td>
                  </tr>
                </table>
              </div>
            `
              : ""
          }

          <div style="margin:28px 0 6px;">
            <a href="${adminOrderUrl}" style="display:inline-block; background:#FFAE00; color:#000; text-decoration:none; font-weight:800; padding:14px 22px; border-radius:14px;">
              Otvoriť objednávku v admine
            </a>
          </div>

          <p style="font-size:12px; color:#777; line-height:1.5; margin-top:24px;">
            Tento email bol odoslaný automaticky po potvrdení platby cez Stripe webhook.
          </p>
        </div>
      </div>
    `,
  });
}