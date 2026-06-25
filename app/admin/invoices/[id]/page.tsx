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

  const seller      = invoice.sellerSnapshot  as Record<string, any>;
  const customer    = invoice.customerSnapshot as Record<string, any>;
  const items       = invoice.items            as Array<Record<string, any>>;
  const delivery    = invoice.deliveryAddress  as Record<string, any> | null;
  const isCN        = invoice.type === "CREDIT_NOTE";
  const deliveredAt = invoice.deliveredAt ?? invoice.issuedAt;
  const paymentMethod: string = customer.paymentMethod ?? "CARD";

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
      <div
        id="invoice"
        className="mx-auto bg-white text-neutral-900"
        style={{ width: "210mm", minHeight: "297mm", maxHeight: "297mm", padding: "10mm 14mm 8mm", fontSize: "11px" }}
      >

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[20px] font-extrabold tracking-tight leading-tight">
              {isCN ? "DOBROPIS" : "FAKTÚRA"}
            </p>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {isCN ? "Dobropis – daňový doklad" : "Daňový doklad"}
            </p>
            {isCN && invoice.creditNoteFor && (
              <p className="text-[10px] text-neutral-500">
                k faktúre č.&nbsp;<strong>{invoice.creditNoteFor.invoiceNumber}</strong>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[20px] font-extrabold text-[#FFAE00]">VytlacTo3D</p>
            {invoice.isTest && (
              <p className="text-[9px] font-bold text-amber-600 mt-0.5">TESTOVACÍ DOKLAD</p>
            )}
          </div>
        </div>

        {/* Metadata strip */}
        <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-neutral-50 px-4 py-3 text-[10px]">
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide text-[9px]">Číslo dokladu</p>
            <p className="font-extrabold text-[13px] text-neutral-900 mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          {invoice.order?.orderNumber && (
            <div>
              <p className="text-neutral-400 font-semibold uppercase tracking-wide text-[9px]">Č. objednávky</p>
              <p className="font-semibold text-neutral-700 mt-0.5">{invoice.order.orderNumber}</p>
            </div>
          )}
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide text-[9px]">Dátum vystavenia</p>
            <p className="font-semibold text-neutral-700 mt-0.5">{date(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide text-[9px]">Dátum dodania</p>
            <p className="font-semibold text-neutral-700 mt-0.5">{date(deliveredAt)}</p>
          </div>
          <div>
            <p className="text-neutral-400 font-semibold uppercase tracking-wide text-[9px]">Dátum splatnosti</p>
            <p className="font-extrabold text-neutral-900 mt-0.5">{date(invoice.dueAt)}</p>
          </div>
          {invoice.variableSymbol && (
            <div>
              <p className="text-neutral-400 font-semibold uppercase tracking-wide text-[9px]">Variabilný symbol</p>
              <p className="font-extrabold text-[12px] font-mono text-neutral-900 mt-0.5">{invoice.variableSymbol}</p>
            </div>
          )}
        </div>

        {/* Seller / Customer */}
        <div className="mt-3 grid grid-cols-2 gap-6">
          {/* Seller */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Dodávateľ</p>
            <p className="font-extrabold text-[12px]">{seller.name}</p>
            {seller.street  && <p className="text-[10px] text-neutral-600 mt-0.5">{seller.street}</p>}
            {(seller.zip || seller.city) && (
              <p className="text-[10px] text-neutral-600">{[seller.zip, seller.city].filter(Boolean).join(" ")}</p>
            )}
            {seller.country && <p className="text-[10px] text-neutral-600">{seller.country}</p>}
            <div className="mt-1.5 text-[10px] text-neutral-600 space-y-0.5">
              {seller.ico   && <p>IČO: <span className="font-semibold">{seller.ico}</span></p>}
              {seller.dic   && <p>DIČ: <span className="font-semibold">{seller.dic}</span></p>}
              {seller.icDph && <p>IČ DPH: <span className="font-semibold">{seller.icDph}</span></p>}
              <p>info@4frommedia.sk</p>
            </div>
          </div>

          {/* Customer */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Odberateľ</p>
            <p className="font-extrabold text-[12px]">
              {customer.companyName ?? customer.name ?? "—"}
            </p>
            {customer.companyName && customer.name && (
              <p className="text-[10px] text-neutral-500">{customer.name}</p>
            )}
            {customer.street && <p className="text-[10px] text-neutral-600 mt-0.5">{customer.street}</p>}
            {(customer.zip || customer.city) && (
              <p className="text-[10px] text-neutral-600">{[customer.zip, customer.city].filter(Boolean).join(" ")}</p>
            )}
            {customer.country && <p className="text-[10px] text-neutral-600">{customer.country}</p>}
            <div className="mt-1.5 text-[10px] text-neutral-600 space-y-0.5">
              {customer.email && <p>{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
              {customer.ico   && <p>IČO: <span className="font-semibold">{customer.ico}</span></p>}
              {customer.dic   && <p>DIČ: <span className="font-semibold">{customer.dic}</span></p>}
              {customer.icDph && <p>IČ DPH: <span className="font-semibold">{customer.icDph}</span></p>}
            </div>
          </div>
        </div>

        {/* Miesto dodania */}
        {delivery?.street && (
          <div className="mt-2 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2 text-[10px]">
            <span className="font-bold text-neutral-500 uppercase tracking-wide text-[9px]">Miesto dodania: </span>
            <span className="text-neutral-700">
              {[delivery.street, delivery.zip, delivery.city, delivery.country].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Items table */}
        <table className="mt-3 w-full border-collapse text-[10px]">
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
                <td className="py-1.5 pr-3 text-neutral-800">{item.description}</td>
                <td className="py-1.5 text-right text-neutral-600">{item.quantity}</td>
                <td className="py-1.5 text-right text-neutral-600">{eur(item.unitNet)}</td>
                <td className="py-1.5 text-right text-neutral-500">{item.vatRate} %</td>
                <td className="py-1.5 text-right text-neutral-600">{eur(item.totalNet)}</td>
                <td className="py-1.5 text-right font-semibold">{eur(item.totalGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-3 flex justify-end">
          <div className="w-60 text-[10px]">
            <div className="flex justify-between py-1 text-neutral-600 border-b border-neutral-100">
              <span>Základ DPH 23 %</span>
              <span>{eur(invoice.totalNet)}</span>
            </div>
            <div className="flex justify-between py-1 text-neutral-600 border-b border-neutral-100">
              <span>DPH 23 %</span>
              <span>{eur(invoice.totalVat)}</span>
            </div>
            <div className="flex justify-between pt-2 text-[13px] font-extrabold text-neutral-900">
              <span>Celková suma</span>
              <span>{eur(invoice.totalGross)}</span>
            </div>
          </div>
        </div>

        {/* Platobné údaje */}
        {(seller.iban || seller.swift) && (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[10px]">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-neutral-600">
              <div>
                <span className="font-semibold text-neutral-500">Spôsob úhrady: </span>
                <span>{paymentMethod === "TRANSFER" ? "Bankový prevod" : "Platobná karta"}</span>
              </div>
              {seller.iban && (
                <div>
                  <span className="font-semibold text-neutral-500">IBAN: </span>
                  <span className="font-mono font-semibold">{seller.iban}</span>
                </div>
              )}
              {seller.swift && (
                <div>
                  <span className="font-semibold text-neutral-500">SWIFT/BIC: </span>
                  <span className="font-mono font-semibold">{seller.swift}</span>
                </div>
              )}
              {seller.bank && (
                <div>
                  <span className="font-semibold text-neutral-500">Banka: </span>
                  <span>{seller.bank}</span>
                </div>
              )}
              {invoice.variableSymbol && (
                <div>
                  <span className="font-semibold text-neutral-500">VS: </span>
                  <span className="font-mono font-semibold">{invoice.variableSymbol}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Note */}
        {invoice.note && (
          <div className="mt-2 text-[10px] text-neutral-500 italic">{invoice.note}</div>
        )}

        {/* Footer */}
        <div className="mt-4 border-t border-neutral-200 pt-2.5 text-[8px] text-neutral-400">
          <div className="flex justify-between">
            <span>
              Daňový doklad vystavený v zmysle §74 zákona č. 222/2004 Z.z. o dani z pridanej hodnoty.
            </span>
            <span className="text-right">
              <span>info@4frommedia.sk</span>
              {seller.phone && <span> · {seller.phone}</span>}
            </span>
          </div>
          <div className="mt-0.5 text-neutral-300">
            Tovar/služba bola dodaná dňom uvedeným v poli „Dátum dodania".
            Faktúra je splatná do dátumu uvedeného v poli „Dátum splatnosti".
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body  { margin: 0; }
          #invoice { page-break-inside: avoid; }
          .print\\:hidden { display: none !important; }
        }
      ` }} />
    </>
  );
}
