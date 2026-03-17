import { Resend } from "resend";
import { formatPriceWithVat } from "@/lib/vat";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendOrderPaidEmailInput = {
  to: string;
  orderId: string;
  fileName: string;
  totalEur: number | null;
  shippingMethod?: string | null;
};

export async function sendOrderPaidEmail({
  to,
  orderId,
  fileName,
  totalEur,
  shippingMethod,
}: SendOrderPaidEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!process.env.ORDER_FROM_EMAIL) {
    throw new Error("Missing ORDER_FROM_EMAIL");
  }

  const priceWithVat = formatPriceWithVat(totalEur);

  const subject = `Potvrdenie objednávky ${fileName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.6;">
      <h1 style="margin-bottom: 16px;">Ďakujeme za objednávku</h1>

      <p>
        Vaša platba bola úspešne prijatá a objednávka je zaevidovaná.
      </p>

      <div style="margin: 24px 0; padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fafafa;">
        <p style="margin: 0 0 8px;"><strong>ID objednávky:</strong> ${orderId}</p>
        <p style="margin: 0 0 8px;"><strong>Model:</strong> ${fileName}</p>
        <p style="margin: 0 0 8px;"><strong>Cena s DPH:</strong> ${priceWithVat}</p>
        <p style="margin: 0;"><strong>Doprava:</strong> ${shippingMethod || "—"}</p>
      </div>

      <p>
        Počas spracovania objednávky vás môžeme kontaktovať v prípade doplňujúcich otázok.
      </p>

      <p style="margin-top: 24px;">
        S pozdravom<br />
        <strong>VytlačTo3D</strong>
      </p>
    </div>
  `;

  const text = [
    "Ďakujeme za objednávku.",
    "",
    "Vaša platba bola úspešne prijatá a objednávka je zaevidovaná.",
    "",
    `ID objednávky: ${orderId}`,
    `Model: ${fileName}`,
    `Cena s DPH: ${priceWithVat}`,
    `Doprava: ${shippingMethod || "—"}`,
    "",
    "S pozdravom,",
    "VytlačTo3D",
  ].join("\n");

  return resend.emails.send({
    from: process.env.ORDER_FROM_EMAIL,
    to,
    subject,
    html,
    text,
  });
}