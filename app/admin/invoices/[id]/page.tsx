import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function date(d: Date) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(d);
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
    include: {
      order: { select: { orderNumber: true } },
      creditNoteFor: { select: { invoiceNumber: true } },
    },
  });
  if (!invoice) redirect("/admin/orders");

  const seller   = invoice.sellerSnapshot  as Record<string, any>;
  const customer = invoice.customerSnapshot as Record<string, any>;
  const items    = invoice.items            as Array<Record<string, any>>;
  const isCN     = invoice.type === "CREDIT_NOTE";

  return (
    <>
      {/* ── toolbar – hidden on print ── */}
      <div className="print:hidden flex items-center gap-3 bg-neutral-50 border-b border-neutral-200 px-6 py-3">
        <a
          href={`/admin/orders/${invoice.orderId}`}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          ← Späť na objednávku
        </a>
        <PrintButton />
        {invoice.isTest && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            TESTOVACIA
          </span>
        )}
      </div>

      {/* ── A4 invoice ── */}
      <div id="invoice" className="mx-auto bg-white text-neutral-900"
        style={{ width: "210mm", minHeight: "297mm", padding: "14mm 16mm 12mm" }}>

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[22px] font-extrabold tracking-tight leading-tight">
              {isCN ? "DOBROPIS" : "FAKTÚRA"}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {isCN ? "Dobropis – daňový doklad" : "Daňový doklad"}
            </p>
            {isCN && invoice.creditNoteFor && (
              <p className="text-[11px] text-neutral-500">
                k faktúre č.&nbsp;<strong>{invoice.creditNoteFor.invoiceNumber}</strong>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[22px] font-extrabold text-[#FFAE00]">VytlacTo3D</p>
            {invoice.isTest && (
              <p className="text-[10px] font-bold text-amber-600 mt-0.5">TESTOVACÍ DOKLAD</p>
            )}
          </div>
        </div>

        {/* Metadata strip */}
        <div className="mt-4 flex gap-6 rounded-xl bg-neutral-50 px-4 py-3 text-[11px]">
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide">Číslo dokladu</p>
            <p className="font-extrabold text-[14px] text-neutral-900 mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          {invoice.order?.orderNumber && (
            <div>
              <p className="text-neutral-400 font-semibold uppercase tracking-wide">Objednávka</p>
              <p className="font-semibold text-neutral-700 mt-0.5">{invoice.order.orderNumber}</p>
            </div>
          )}
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide">Dátum vystavenia</p>
            <p className="font-semibold text-neutral-700 mt-0.5">{date(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide">Dátum dodania</p>
            <p className="font-semibold text-neutral-700 mt-0.5">{date(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide">Splatnosť</p>
            <p className="font-extrabold text-neutral-900 mt-0.5">{date(invoice.dueAt)}</p>
          </div>
        </div>

        {/* Seller / Customer */}
        <div className="mt-5 grid grid-cols-2 gap-6">
          {/* Seller */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Dodávateľ</p>
            <p className="font-extrabold text-[13px]">{seller.name}</p>
            {seller.street  && <p className="text-[11px] text-neutral-600 mt-0.5">{seller.street}</p>}
            {(seller.zip || seller.city) && (
              <p className="text-[11px] text-neutral-600">{[seller.zip, seller.city].filter(Boolean).join(" ")}</p>
            )}
            {seller.country && <p className="text-[11px] text-neutral-600">{seller.country}</p>}
            <div className="mt-1.5 text-[11px] text-neutral-600 space-y-0.5">
              {seller.ico   && <p>IČO: <span className="font-semibold">{seller.ico}</span></p>}
              {seller.dic   && <p>DIČ: <span className="font-semibold">{seller.dic}</span></p>}
              {seller.icDph && <p>IČ DPH: <span className="font-semibold">{seller.icDph}</span></p>}
              {seller.iban  && <p>IBAN: <span className="font-semibold">{seller.iban}</span></p>}
              {seller.bank  && <p>{seller.bank}</p>}
              {seller.email && <p>{seller.email}</p>}
            </div>
          </div>

          {/* Customer */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Odberateľ</p>
            <p className="font-extrabold text-[13px]">
              {customer.companyName ?? customer.name ?? "—"}
            </p>
            {customer.companyName && customer.name && (
              <p className="text-[11px] text-neutral-500">{customer.name}</p>
            )}
            {customer.street && <p className="text-[11px] text-neutral-600 mt-0.5">{customer.street}</p>}
            {(customer.zip || customer.city) && (
              <p className="text-[11px] text-neutral-600">{[customer.zip, customer.city].filter(Boolean).join(" ")}</p>
            )}
            {customer.country && <p className="text-[11px] text-neutral-600">{customer.country}</p>}
            <div className="mt-1.5 text-[11px] text-neutral-600 space-y-0.5">
              {customer.email && <p>{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
              {customer.ico   && <p>IČO: <span className="font-semibold">{customer.ico}</span></p>}
              {customer.dic   && <p>DIČ: <span className="font-semibold">{customer.dic}</span></p>}
              {customer.icDph && <p>IČ DPH: <span className="font-semibold">{customer.icDph}</span></p>}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-neutral-900">
              <th className="pb-1.5 text-left font-bold text-neutral-700">Popis</th>
              <th className="pb-1.5 text-right font-bold text-neutral-700 w-8">Ks</th>
              <th className="pb-1.5 text-right font-bold text-neutral-700 w-24">Jedn. cena</th>
              <th className="pb-1.5 text-right font-bold text-neutral-700 w-10">DPH</th>
              <th className="pb-1.5 text-right font-bold text-neutral-700 w-24">Základ</th>
              <th className="pb-1.5 text-right font-bold text-neutral-700 w-24">Spolu</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-2 pr-3 text-neutral-800">{item.description}</td>
                <td className="py-2 text-right text-neutral-600">{item.quantity}</td>
                <td className="py-2 text-right text-neutral-600">{eur(item.unitNet)}</td>
                <td className="py-2 text-right text-neutral-500">{item.vatRate} %</td>
                <td className="py-2 text-right text-neutral-600">{eur(item.totalNet)}</td>
                <td className="py-2 text-right font-semibold">{eur(item.totalGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-3 flex justify-end">
          <div className="w-64 text-[11px]">
            <div className="flex justify-between py-1 text-neutral-600 border-b border-neutral-100">
              <span>Základ DPH 23 %</span>
              <span>{eur(invoice.totalNet)}</span>
            </div>
            <div className="flex justify-between py-1 text-neutral-600 border-b border-neutral-100">
              <span>DPH 23 %</span>
              <span>{eur(invoice.totalVat)}</span>
            </div>
            <div className="flex justify-between pt-2 text-[14px] font-extrabold text-neutral-900">
              <span>Celková suma</span>
              <span>{eur(invoice.totalGross)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        {(seller.iban || seller.bank) && (
          <div className="mt-5 rounded-xl bg-neutral-50 px-4 py-2.5 text-[11px] text-neutral-600">
            <span className="font-semibold">Spôsob úhrady:</span> Bankový prevod
            {seller.iban && <> &nbsp;·&nbsp; IBAN: <span className="font-semibold">{seller.iban}</span></>}
            {seller.bank && <> &nbsp;·&nbsp; {seller.bank}</>}
          </div>
        )}

        {/* Note */}
        {invoice.note && (
          <div className="mt-3 text-[11px] text-neutral-500 italic">{invoice.note}</div>
        )}

        {/* Footer */}
        <div className="mt-6 border-t border-neutral-200 pt-3 text-[9px] text-neutral-400 text-center">
          Táto faktúra je daňovým dokladom v zmysle zákona č. 222/2004 Z. z. o dani z pridanej hodnoty.
          {seller.email && <> &nbsp;·&nbsp; {seller.email}</>}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body  { margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
