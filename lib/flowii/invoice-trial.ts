import { prisma } from "@/lib/prisma";
import { FlowiiClient, getFlowiiCredentials } from "@/lib/flowii/client";

/**
 * SKÚŠOBNÁ faktúra vo FLOWii (so súhlasom majiteľa) — zistenie tvaru
 * požiadavky POST /documents z chybových hlásení FLOWii.
 *
 * Pošle najviac 3 postupne úplnejšie pokusy a ZASTAVÍ sa pri prvom, ktorý
 * doklad vytvorí — nikdy nevzniknú dve faktúry. Zákazku ani iné záznamy
 * nemení.
 */
export async function trialFlowiiInvoice(webOrderId: string, serialNr?: string) {
  const creds = getFlowiiCredentials();
  if (!creds) return { error: "FLOWii nie je nastavené." };
  const client = new FlowiiClient(creds);
  const companies = await client.list("/companies");
  const companyId = String(process.env.FLOWII_COMPANY_ID?.trim() || companies[0]?.id || "");

  const sync = await prisma.flowiiSync.findUnique({ where: { orderId: webOrderId } }).catch(() => null);
  if (!sync?.flowiiOrderId) return { error: "Objednávka nemá zákazku vo FLOWii." };
  const order = await client.get(`/orders/${encodeURIComponent(sync.flowiiOrderId)}`, { companyId });
  const rel = order?.data?.relationships ?? {};
  const partnerId = rel.partner?.data?.id;
  const currencyId = rel.currency?.data?.id ?? "44";
  const userId = rel.user?.data?.id;
  const web = await prisma.order.findUnique({ where: { id: webOrderId }, select: { orderNumber: true } }).catch(() => null);
  const today = new Date().toISOString().slice(0, 10);
  const nr = serialNr && /^\d{4,12}$/.test(serialNr) ? { "serial-nr": serialNr } : {};

  // Firma (fakturačné údaje) — rovnako ako pri zakladaní zákaziek.
  const companyData = await client.list("/companydata", { companyId });
  const companyDataId = companyData.length === 1 ? companyData[0].id : (rel["company-data"]?.data?.id ?? companyData[0]?.id);
  const self = await client.get("/users/self", { companyId });
  const selfUserId = String(self?.data?.id ?? userId ?? "");

  // Kolo 2: FLOWii vyžaduje IssueDate, User, CompanyData, Partner.
  const header = (dateKey: string) => ({
    data: {
      type: "document",
      attributes: {
        type: 4,
        ...nr,
        [dateKey]: today,
        "delivery-date": today,
        "due-date": new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
        "constant-symbol": "0008",
        "order-number": web?.orderNumber ?? "",
      },
      relationships: {
        order: { data: { type: "order", id: String(sync.flowiiOrderId) } },
        ...(partnerId ? { partner: { data: { type: "partner", id: String(partnerId) } } } : {}),
        user: { data: { type: "user", id: selfUserId } },
        "company-data": { data: { type: "company-data", id: String(companyDataId) } },
        currency: { data: { type: "currency", id: String(currencyId) } },
        "payment-method": { data: { type: "payment-method", id: "247565" } },
        "bank-account": { data: { type: "bank-account", id: "9995" } },
      },
    },
  });
  const attempts: { label: string; body: unknown }[] = [
    { label: "4 — všetky povinné polia (issue-date)", body: header("issue-date") },
    { label: "5 — iný názov dátumu (issued)", body: header("issued") },
  ];

  const results: { label: string; status: number | string; response: unknown }[] = [];
  for (const a of attempts) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await client.tryCreateDocument(companyId, a.body);
    results.push({ label: a.label, status: r.status, response: r.body });
    if (typeof r.status === "string" && r.status.startsWith("OK")) break; // doklad vznikol — ďalej nie
    if (/per\s*day/i.test(JSON.stringify(r.body ?? ""))) break; // denný limit
  }
  return { companyId, flowiiOrderId: sync.flowiiOrderId, partnerId, results };
}
