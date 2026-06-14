import { transporter, FROM } from "@/lib/mailer";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

const CONTACT = `
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#777;line-height:1.7;">
    <strong style="color:#111;">VytlačTo3D</strong><br/>
    Ak máte otázky, napíšte nám: <a href="mailto:info@4frommedia.sk" style="color:#FFAE00;">info@4frommedia.sk</a><br/>
    <a href="${baseUrl}" style="color:#FFAE00;">www.vytlacto3d.sk</a>
  </div>
`;

type OrderStatus =
  | "PENDING"
  | "AWAITING_TRANSFER"
  | "PAID"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type ContentMap = {
  subject: string;
  heading: string;
  body: string;
  btnText: string;
  btnColor: string;
  btnTextColor: string;
};

function getContent(
  status: OrderStatus,
  fileName: string,
  orderId: string
): ContentMap | null {
  const link = `${baseUrl}/ucet/objednavky/${orderId}`;

  const map: Record<OrderStatus, ContentMap & { btnUrl?: string }> = {
    AWAITING_TRANSFER: {
      subject: "Platobne udaje k vasej objednavke – VytlacTo3D",
      heading: "Cakame na vasu platbu prevodom",
      body: `Objednavka pre subor <strong>${fileName}</strong> bola prijata. Platobne udaje ste dostali emailom. Vyroba zacne po pripísani platby na nas ucet.`,
      btnText: "Zobrazit objednavku &rarr;",
      btnColor: "#f97316",
      btnTextColor: "#fff",
    },
    PENDING: {
      subject: "Objednavka caka na platbu – VytlacTo3D",
      heading: "Vasa objednavka caka na dokoncenie",
      body: `Objednavka pre subor <strong>${fileName}</strong> nebola este zaplatena. Kliknite nizsie a dokoncite platbu.`,
      btnText: "Dokoncit platbu &rarr;",
      btnColor: "#FFAE00",
      btnTextColor: "#000",
    },
    PAID: {
      subject: "Platba prijata – VytlacTo3D",
      heading: "Platba bola uspesne prijata",
      body: `Vasa platba za <strong>${fileName}</strong> bola prijata (vrátane bankového prevodu). Objednavka caka na spracovanie – coskoro zacneme tlacat.`,
      btnText: "Zobrazit objednavku &rarr;",
      btnColor: "#FFAE00",
      btnTextColor: "#000",
    },
    IN_PRODUCTION: {
      subject: "Vasa objednavka sa tlaci – VytlacTo3D",
      heading: "Tlacime vas model",
      body: `Super sprava! Vas model <strong>${fileName}</strong> prave tlacime na 3D tlaciarni. O dokonceni vas budeme informovat.`,
      btnText: "Sledovat objednavku &rarr;",
      btnColor: "#22c55e",
      btnTextColor: "#fff",
    },
    SHIPPED: {
      subject: "Objednavka odoslana – VytlacTo3D",
      heading: "Balik je na ceste",
      body: `Vas model <strong>${fileName}</strong> bol vyrobeny a odoslany. Coskoro dorazi na vasu adresu.`,
      btnText: "Detail objednavky &rarr;",
      btnColor: "#3b82f6",
      btnTextColor: "#fff",
    },
    DELIVERED: {
      subject: "Objednavka dorucena – VytlacTo3D",
      heading: "Balik doruceny!",
      body: `Vasa objednavka <strong>${fileName}</strong> bola dorucena. Dakujeme ze ste si vybrali VytlacTo3D!`,
      btnText: "Zobrazit objednavku &rarr;",
      btnColor: "#FFAE00",
      btnTextColor: "#000",
    },
    CANCELLED: {
      subject: "Objednavka zrusena – VytlacTo3D",
      heading: "Objednavka bola zrusena",
      body: `Vasa objednavka pre subor <strong>${fileName}</strong> bola zrusena. Ak mate otazky, kontaktujte nas.`,
      btnText: "Kontaktovat podporu &rarr;",
      btnColor: "#ef4444",
      btnTextColor: "#fff",
    },
  };

  return map[status] ?? null;
}

export async function sendOrderStatusEmail({
  to,
  orderId,
  fileName,
  status,
}: {
  to: string;
  orderId: string;
  fileName: string;
  status: string;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  if (!to) return;

  const content = getContent(status as OrderStatus, fileName, orderId);
  if (!content) return;

  const link = `${baseUrl}/ucet/objednavky/${orderId}`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:22px;padding:32px;border:1px solid #e5e5e5;">
        <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;margin-bottom:8px;">VytlacTo3D</div>

        <h1 style="margin:14px 0 16px;font-size:26px;color:#111;">${content.heading}</h1>

        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 24px;">
          ${content.body}
        </p>

        <div style="margin-bottom:28px;">
          <a href="${link}"
             style="display:inline-block;background:${content.btnColor};color:${content.btnTextColor};
                    text-decoration:none;font-weight:800;padding:14px 28px;
                    border-radius:14px;font-size:16px;">
            ${content.btnText}
          </a>
        </div>

        ${CONTACT}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: content.subject,
    html,
  });
}
