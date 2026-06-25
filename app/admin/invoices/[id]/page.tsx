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
      {/* Toolbar — skrytý pri tlači */}
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

      {/* A4 faktúra — garantovaná jedna strana */}
      <div
        id="invoice"
        className="mx-auto bg-white text-neutral-900"
        style={{
          width: "210mm",
          height: "297mm",
          maxHeight: "297mm",
          padding: "8mm 12mm 6mm",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* ─── HLAVIČKA ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, margin: 0, lineHeight: 1.1 }}>
              {isCN ? "DOBROPIS" : "FAKTÚRA"}
            </p>
            <p style={{ fontSize: 9, color: "#888", margin: "2px 0 0" }}>
              {isCN ? "Dobropis – daňový doklad" : "Daňový doklad – §74 zákona č. 222/2004 Z.z."}
            </p>
            {isCN && invoice.creditNoteFor && (
              <p style={{ fontSize: 9, color: "#888", margin: "1px 0 0" }}>
                k faktúre č. <strong>{invoice.creditNoteFor.invoiceNumber}</strong>
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#FFAE00", margin: 0 }}>VytlačTo3D</p>
            <p style={{ fontSize: 9, color: "#aaa", margin: "2px 0 0" }}>vytlacto3d.sk</p>
            {invoice.isTest && (
              <p style={{ fontSize: 8, fontWeight: 700, color: "#d97706", margin: "2px 0 0" }}>TESTOVACÍ DOKLAD</p>
            )}
          </div>
        </div>

        {/* ─── METADATA PRUH ─── */}
        <div style={{
          marginTop: 8, display: "flex", gap: 20, flexWrap: "wrap",
          background: "#f9f9f9", borderRadius: 8, padding: "6px 12px",
          fontSize: 8.5,
        }}>
          {[
            { label: "Číslo dokladu", value: invoice.invoiceNumber, bold: true, large: true },
            invoice.order?.orderNumber ? { label: "Č. objednávky", value: String(invoice.order.orderNumber) } : null,
            { label: "Dátum vystavenia", value: date(invoice.issuedAt) },
            { label: "Dátum dodania", value: date(invoice.issuedAt) },
            { label: "Dátum splatnosti", value: date(invoice.dueAt), bold: true },
            invoice.variableSymbol ? { label: "Variabilný symbol", value: String(invoice.variableSymbol), bold: true, mono: true } : null,
          ].filter(Boolean).map((item: any, i) => (
            <div key={i}>
              <p style={{ color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, margin: 0, fontSize: 7.5 }}>{item.label}</p>
              <p style={{ fontWeight: item.bold ? 800 : 600, fontSize: item.large ? 12 : 9, margin: "1px 0 0", fontFamily: item.mono ? "monospace" : "inherit", color: "#111" }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* ─── DODÁVATEĽ / ODBERATEĽ ─── */}
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Dodávateľ */}
          <div>
            <p style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#aaa", margin: "0 0 3px" }}>Dodávateľ</p>
            <p style={{ fontSize: 10.5, fontWeight: 800, margin: 0 }}>{seller.name}</p>
            {seller.street  && <p style={{ fontSize: 8.5, color: "#555", margin: "1px 0 0" }}>{seller.street}</p>}
            {(seller.zip || seller.city) && <p style={{ fontSize: 8.5, color: "#555", margin: 0 }}>{[seller.zip, seller.city].filter(Boolean).join(" ")}</p>}
            {seller.country && <p style={{ fontSize: 8.5, color: "#555", margin: 0 }}>{seller.country}</p>}
            <div style={{ marginTop: 4, fontSize: 8.5, color: "#555", lineHeight: 1.5 }}>
              {seller.ico   && <p style={{ margin: 0 }}>IČO: <strong>{seller.ico}</strong></p>}
              {seller.dic   && <p style={{ margin: 0 }}>DIČ: <strong>{seller.dic}</strong></p>}
              {seller.icDph && <p style={{ margin: 0 }}>IČ DPH: <strong>{seller.icDph}</strong></p>}
              {seller.iban  && <p style={{ margin: 0 }}>IBAN: <strong>{seller.iban}</strong></p>}
              {seller.swift && <p style={{ margin: 0 }}>SWIFT: <strong>{seller.swift}</strong></p>}
              {seller.bank  && <p style={{ margin: 0 }}>{seller.bank}</p>}
              <p style={{ margin: 0 }}>info@4frommedia.sk</p>
            </div>
          </div>

          {/* Odberateľ */}
          <div>
            <p style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#aaa", margin: "0 0 3px" }}>Odberateľ</p>
            <p style={{ fontSize: 10.5, fontWeight: 800, margin: 0 }}>{customer.companyName ?? customer.name ?? "—"}</p>
            {customer.companyName && customer.name && <p style={{ fontSize: 8.5, color: "#777", margin: "1px 0 0" }}>{customer.name}</p>}
            {customer.street && <p style={{ fontSize: 8.5, color: "#555", margin: "1px 0 0" }}>{customer.street}</p>}
            {(customer.zip || customer.city) && <p style={{ fontSize: 8.5, color: "#555", margin: 0 }}>{[customer.zip, customer.city].filter(Boolean).join(" ")}</p>}
            {customer.country && <p style={{ fontSize: 8.5, color: "#555", margin: 0 }}>{customer.country}</p>}
            <div style={{ marginTop: 4, fontSize: 8.5, color: "#555", lineHeight: 1.5 }}>
              {customer.email && <p style={{ margin: 0 }}>{customer.email}</p>}
              {customer.phone && <p style={{ margin: 0 }}>{customer.phone}</p>}
              {customer.ico   && <p style={{ margin: 0 }}>IČO: <strong>{customer.ico}</strong></p>}
              {customer.dic   && <p style={{ margin: 0 }}>DIČ: <strong>{customer.dic}</strong></p>}
              {customer.icDph && <p style={{ margin: 0 }}>IČ DPH: <strong>{customer.icDph}</strong></p>}
            </div>
          </div>
        </div>

        {/* ─── TABUĽKA POLOŽIEK ─── */}
        <table style={{ marginTop: 10, width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #111" }}>
              <th style={{ textAlign: "left", padding: "3px 6px 3px 0", fontWeight: 700, color: "#444" }}>Popis tovaru / služby</th>
              <th style={{ textAlign: "right", padding: "3px 0", fontWeight: 700, color: "#444", width: 28 }}>Ks</th>
              <th style={{ textAlign: "right", padding: "3px 0", fontWeight: 700, color: "#444", width: 72 }}>Jedn. cena</th>
              <th style={{ textAlign: "right", padding: "3px 0", fontWeight: 700, color: "#444", width: 36 }}>DPH</th>
              <th style={{ textAlign: "right", padding: "3px 0", fontWeight: 700, color: "#444", width: 72 }}>Základ DPH</th>
              <th style={{ textAlign: "right", padding: "3px 0", fontWeight: 700, color: "#444", width: 72 }}>Cena s DPH</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "4px 6px 4px 0", color: "#333", maxWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</td>
                <td style={{ textAlign: "right", padding: "4px 0", color: "#555" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "4px 0", color: "#555" }}>{eur(item.unitNet)}</td>
                <td style={{ textAlign: "right", padding: "4px 0", color: "#777" }}>{item.vatRate} %</td>
                <td style={{ textAlign: "right", padding: "4px 0", color: "#555" }}>{eur(item.totalNet)}</td>
                <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 600 }}>{eur(item.totalGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ─── MEDZERA (flex-grow zatlačí zvyšok dolu) ─── */}
        <div style={{ flex: 1 }} />

        {/* ─── SÚČTY ─── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <div style={{ width: 220, fontSize: 8.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #eee", color: "#555" }}>
              <span>Základ DPH 23 %</span>
              <span>{eur(invoice.totalNet)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #eee", color: "#555" }}>
              <span>DPH 23 %</span>
              <span>{eur(invoice.totalVat)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 0", fontSize: 13, fontWeight: 900, color: "#111" }}>
              <span>CELKOM K ÚHRADE</span>
              <span>{eur(invoice.totalGross)}</span>
            </div>
          </div>
        </div>

        {/* ─── PLATOBNÉ ÚDAJE ─── */}
        {(seller.iban || customer.paymentMethod) && (
          <div style={{
            marginTop: 8, background: "#f9f9f9", borderRadius: 6,
            padding: "6px 12px", fontSize: 8.5, color: "#555",
            display: "flex", flexWrap: "wrap", gap: "4px 20px",
          }}>
            <span><strong>Spôsob úhrady:</strong> {customer.paymentMethod === "TRANSFER" ? "Bankový prevod" : "Platobná karta"}</span>
            {seller.iban  && <span>IBAN: <strong style={{ fontFamily: "monospace" }}>{seller.iban}</strong></span>}
            {seller.swift && <span>SWIFT: <strong>{seller.swift}</strong></span>}
            {seller.bank  && <span>{seller.bank}</span>}
            {invoice.variableSymbol && (
              <span>VS: <strong style={{ fontFamily: "monospace" }}>{invoice.variableSymbol}</strong></span>
            )}
          </div>
        )}

        {/* ─── POZNÁMKA ─── */}
        {invoice.note && (
          <p style={{ marginTop: 5, fontSize: 8, color: "#888", fontStyle: "italic" }}>{invoice.note}</p>
        )}

        {/* ─── FOOTER ─── */}
        <div style={{ marginTop: 6, borderTop: "1px solid #e5e5e5", paddingTop: 5, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#bbb" }}>
          <span>Daňový doklad vystavený v zmysle §74 zákona č. 222/2004 Z.z. o dani z pridanej hodnoty.</span>
          <span>info@4frommedia.sk</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          #invoice {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      ` }} />
    </>
  );
}
