import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSafeServerSession();
  const email = (session?.user as any)?.email ?? "";
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (!admins.includes(email.toLowerCase())) redirect("/");

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { order: { select: { orderNumber: true } }, creditNoteFor: true },
  });
  if (!invoice) redirect("/admin/orders");

  const seller = invoice.sellerSnapshot as Record<string, any>;
  const customer = invoice.customerSnapshot as Record<string, any>;
  const items = invoice.items as Array<Record<string, any>>;
  const isCreditNote = invoice.type === "CREDIT_NOTE";
  const docTitle = isCreditNote ? "DOBROPIS" : "FAKTÚRA – DAŇOVÝ DOKLAD";

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 bg-neutral-50 border-b border-neutral-200 px-8 py-4">
        <a
          href={`/admin/orders/${invoice.orderId}`}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          ← Späť na objednávku
        </a>
        <PrintButton />
        {invoice.isTest && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            TESTOVACIA FAKTÚRA
          </span>
        )}
      </div>

      {/* Invoice document */}
      <div className="mx-auto max-w-[860px] bg-white px-12 py-10 print:px-0 print:py-0 print:max-w-none">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-neutral-900">
              {docTitle}
            </div>
            {isCreditNote && invoice.creditNoteFor && (
              <div className="mt-1 text-sm text-neutral-500">
                Dobropis k faktúre č. {(invoice.creditNoteFor as any).invoiceNumber}
              </div>
            )}
            <div className="mt-3 text-sm text-neutral-500">
              Číslo dokladu:{" "}
              <span className="font-extrabold text-neutral-900 text-base">
                {invoice.invoiceNumber}
              </span>
            </div>
            {invoice.order?.orderNumber && (
              <div className="text-sm text-neutral-500">
                Číslo objednávky: <span className="font-semibold text-neutral-700">{invoice.order.orderNumber}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#FFAE00]">VytlacTo3D</div>
            <div className="mt-1 grid gap-0.5 text-right text-sm text-neutral-600">
              <div>Dátum vystavenia: <span className="font-semibold text-neutral-800">{fmtDate(invoice.issuedAt)}</span></div>
              <div>Dátum dodania: <span className="font-semibold text-neutral-800">{fmtDate(invoice.issuedAt)}</span></div>
              <div>Dátum splatnosti: <span className="font-semibold text-neutral-800">{fmtDate(invoice.dueAt)}</span></div>
            </div>
          </div>
        </div>

        {/* Seller / Customer */}
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Dodávateľ
            </div>
            <div className="text-sm leading-6 text-neutral-800">
              <div className="font-extrabold text-base">{seller.name}</div>
              {seller.street && <div>{seller.street}</div>}
              {(seller.zip || seller.city) && <div>{[seller.zip, seller.city].filter(Boolean).join(" ")}</div>}
              {seller.country && <div>{seller.country}</div>}
              {seller.ico && <div className="mt-1">IČO: {seller.ico}</div>}
              {seller.dic && <div>DIČ: {seller.dic}</div>}
              {seller.icDph && <div>IČ DPH: {seller.icDph}</div>}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Odberateľ
            </div>
            <div className="text-sm leading-6 text-neutral-800">
              <div className="font-extrabold text-base">
                {customer.companyName ?? customer.name ?? "—"}
              </div>
              {customer.companyName && customer.name && (
                <div className="text-neutral-500">{customer.name}</div>
              )}
              {customer.street && <div>{customer.street}</div>}
              {(customer.zip || customer.city) && (
                <div>{[customer.zip, customer.city].filter(Boolean).join(" ")}</div>
              )}
              {customer.country && <div>{customer.country}</div>}
              {customer.email && <div className="mt-1 text-neutral-500">{customer.email}</div>}
              {customer.phone && <div className="text-neutral-500">{customer.phone}</div>}
              {customer.ico && <div className="mt-1">IČO: {customer.ico}</div>}
              {customer.dic && <div>DIČ: {customer.dic}</div>}
              {customer.icDph && <div>IČ DPH: {customer.icDph}</div>}
            </div>
          </div>
        </div>

        {/* Payment info */}
        {(seller.iban || seller.bank) && (
          <div className="mt-6 rounded-xl bg-neutral-50 px-5 py-3 text-sm">
            <span className="font-semibold text-neutral-700">Spôsob úhrady:</span>{" "}
            Bankový prevod
            {seller.iban && (
              <> &nbsp;·&nbsp; <span className="font-semibold">IBAN: {seller.iban}</span></>
            )}
            {seller.bank && <> &nbsp;·&nbsp; {seller.bank}</>}
          </div>
        )}

        {/* Items table */}
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-900">
              <th className="pb-2 text-left font-bold text-neutral-900">Popis</th>
              <th className="pb-2 text-right font-bold text-neutral-900 w-16">Ks</th>
              <th className="pb-2 text-right font-bold text-neutral-900 w-28">Cena bez DPH</th>
              <th className="pb-2 text-right font-bold text-neutral-900 w-16">DPH</th>
              <th className="pb-2 text-right font-bold text-neutral-900 w-28">Spolu bez DPH</th>
              <th className="pb-2 text-right font-bold text-neutral-900 w-28">Spolu s DPH</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-3 pr-4 text-neutral-800">{item.description}</td>
                <td className="py-3 text-right text-neutral-600">{item.quantity}</td>
                <td className="py-3 text-right text-neutral-600">{fmt(item.unitNet)}</td>
                <td className="py-3 text-right text-neutral-600">{item.vatRate} %</td>
                <td className="py-3 text-right text-neutral-600">{fmt(item.totalNet)}</td>
                <td className="py-3 text-right font-semibold text-neutral-900">{fmt(item.totalGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1.5 text-neutral-600">
              <span>Základ DPH (23 %)</span>
              <span>{fmt(invoice.totalNet)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-neutral-600">
              <span>DPH 23 %</span>
              <span>{fmt(invoice.totalVat)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-extrabold text-neutral-900">
              <span>Celková suma</span>
              <span>{fmt(invoice.totalGross)}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        {invoice.note && (
          <div className="mt-6 rounded-xl border border-neutral-200 px-5 py-3 text-sm text-neutral-600">
            <span className="font-semibold">Poznámka:</span> {invoice.note}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 border-t border-neutral-200 pt-4 text-xs text-neutral-400 text-center">
          Táto faktúra je daňovým dokladom v zmysle zákona č. 222/2004 Z. z. o dani z pridanej hodnoty.
          {seller.email && (
            <> &nbsp;·&nbsp; {seller.email}</>
          )}
        </div>
      </div>
    </>
  );
}
