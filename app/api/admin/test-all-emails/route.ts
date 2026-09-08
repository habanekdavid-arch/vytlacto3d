import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { ADMIN_INBOX, mailConfigSummary, withSubjectPrefix } from "@/lib/mailer";
import { sendOrderPaidEmail } from "@/lib/email";
import { sendWelcomeEmail } from "@/lib/email-welcome";
import { sendOrderStatusEmail } from "@/lib/email-status";
import { sendTransferPaymentEmail } from "@/lib/email-transfer";
import { sendPendingReminderEmail } from "@/lib/email-reminder";
import { sendAdminOrderNotificationEmail } from "@/lib/email-admin";
import { sendContactFormEmail } from "@/lib/email-contact";

export const runtime = "nodejs";
// Štrnásť správ po jednej cez SMTP sa do predvoleného limitu nezmestí.
export const maxDuration = 300;

/** Prefix predmetu, aby sa vzorky dali v schránke vyfiltrovať. */
const SUBJECT_PREFIX = "VytlacTo3D TEST — ";

const ORDER_ID = "test-order-0000";
const ORDER_NUMBER = "VYT-TEST-0001";
const FILE_NAME = "ukazkovy-model.stl";

const CONFIG = {
  material: "PLA",
  color: "Čierna",
  quality: "STANDARD",
  quantity: 2,
  infillPct: 20,
};

const PRICING = { total: 24.5 };

const DELIVERY_ADDRESS = {
  name: "Testovací Zákazník",
  street: "Ukážková 1",
  city: "Bratislava",
  zip: "811 01",
  country: "Slovensko",
};

/**
 * Rozpošle po jednej vzorke od každého typu mailu, ktorý web posiela.
 * Používa skutočné šablóny s vymyslenými dátami — čo príde do schránky, je
 * presne to, čo dostane zákazník. Odosiela sa po jednom a chyba jednej vzorky
 * nezastaví ostatné, aby výsledok povedal, ktoré šablóny prešli a ktoré nie.
 */
export async function POST(req: NextRequest) {
  const session = await getSafeServerSession();
  const userEmail = String((session?.user as any)?.email ?? "").toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as { to?: string }));
  const to = String(body?.to ?? "").trim() || ADMIN_INBOX;

  // Šablóny adminových mailov (notifikácia o objednávke, kontaktný formulár)
  // si príjemcu určujú samy — idú na ADMIN_INBOX bez ohľadu na `to`.
  const samples: { label: string; send: () => Promise<unknown> }[] = [
    {
      label: "Objednávka zaplatená (zákazník)",
      send: () =>
        sendOrderPaidEmail({
          to,
          orderId: ORDER_ID,
          orderNumber: ORDER_NUMBER,
          fileName: FILE_NAME,
          totalEur: 34.9,
          shippingMethod: "Kuriér",
          shippingCostEur: 4.9,
          deliveryAddress: DELIVERY_ADDRESS,
          config: CONFIG,
          pricing: PRICING,
        }),
    },
    {
      label: "Uvítací mail — súkromná osoba",
      send: () => sendWelcomeEmail({ to, name: "Testovací Zákazník", accountType: "PERSON" }),
    },
    {
      label: "Uvítací mail — firma",
      send: () =>
        sendWelcomeEmail({
          to,
          name: "Testovací Zákazník",
          accountType: "COMPANY",
          companyName: "Ukážková firma s.r.o.",
        }),
    },
    {
      label: "Podklady na platbu prevodom",
      send: () =>
        sendTransferPaymentEmail({
          to,
          orderId: ORDER_ID,
          orderNumber: ORDER_NUMBER,
          fileName: FILE_NAME,
          amount: 34.9,
          variableSymbol: "00000001",
        }),
    },
    {
      label: "Upomienka na nedokončenú objednávku",
      send: () =>
        sendPendingReminderEmail({
          to,
          orderId: ORDER_ID,
          fileName: FILE_NAME,
          stripeUrl: "https://www.vytlacto3d.sk/",
        }),
    },
    ...(
      [
        "PENDING",
        "AWAITING_TRANSFER",
        "PAID",
        "IN_PRODUCTION",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ] as const
    ).map((status) => ({
      label: `Zmena stavu objednávky — ${status}`,
      send: () => sendOrderStatusEmail({ to, orderId: ORDER_ID, fileName: FILE_NAME, status }),
    })),
    {
      label: "Notifikácia o novej objednávke (interná)",
      send: () =>
        sendAdminOrderNotificationEmail({
          orderId: ORDER_ID,
          orderNumber: ORDER_NUMBER,
          fileName: FILE_NAME,
          customerEmail: "zakaznik@example.com",
          totalEur: 34.9,
          shippingMethod: "Kuriér",
          shippingCostEur: 4.9,
          phone: "+421 900 000 000",
          accountType: "PERSON",
          deliveryAddress: DELIVERY_ADDRESS,
          config: CONFIG,
          pricing: PRICING,
          createdAt: new Date(),
        }),
    },
    {
      label: "Správa z kontaktného formulára (interná)",
      send: () =>
        sendContactFormEmail({
          name: "Testovací Zákazník",
          email: "zakaznik@example.com",
          subject: "Ukážková správa",
          message:
            "Toto je vzorová správa z kontaktného formulára, odoslaná testovacím rozposlaním.",
        }),
    },
  ];

  const results: { label: string; ok: boolean; error?: string }[] = [];

  await withSubjectPrefix(SUBJECT_PREFIX, async () => {
    for (const sample of samples) {
      try {
        await sample.send();
        results.push({ label: sample.label, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Vzorový mail "${sample.label}" zlyhal:`, err);
        // Odpoveď SMTP serveru býva na niekoľko obrazoviek; do JSONu patrí
        // len toľko, aby sa dal problém rozpoznať — zvyšok je v logoch.
        results.push({ label: sample.label, ok: false, error: message.slice(0, 300) });
      }
    }
  });

  const failed = results.filter((r) => !r.ok);

  return NextResponse.json(
    {
      ok: failed.length === 0,
      to,
      subjectPrefix: SUBJECT_PREFIX,
      sent: results.length - failed.length,
      failed: failed.length,
      results,
      config: mailConfigSummary(),
    },
    { status: failed.length === 0 ? 200 : 207 }
  );
}
