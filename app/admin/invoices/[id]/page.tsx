import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function date(d: Date) {
  return new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const S = {
  page: { width:"210mm", height:"297mm", maxHeight:"297mm", padding:"7mm 11mm 5mm", boxSizing:"border-box" as const, display:"flex", flexDirection:"column" as const, overflow:"hidden", fontFamily:"Arial,Helvetica,sans-serif", background:"#fff", color:"#111" },
  label: { fontSize:7, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.8, color:"#aaa", margin:0 },
  val: { fontSize:8.5, fontWeight:600, margin:"1px 0 0", color:"#111" },
  valBig: { fontSize:13, fontWeight:900, margin:"1px 0 0", color:"#111" },
  valMono: { fontSize:8.5, fontWeight:700, fontFamily:"monospace", margin:"1px 0 0", color:"#111" },
  row: { display:"flex", justifyContent:"space-between" as const, padding:"2px 0", borderBottom:"1px solid #f0f0f0", fontSize:8.5, color:"#555" },
};

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
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
  const vs       = (invoice as any).variableSymbol as string | null;

  return (
    <>
      {/* Toolbar — skrytý pri tlači */}
      <div className="print:hidden" style={{ display:"flex", alignItems:"center", gap:12, background:"#f9f9f9", borderBottom:"1px solid #e5e5e5", padding:"10px 20px" }}>
        <a href={`/admin/orders/${invoice.orderId}`} style={{ fontSize:13, fontWeight:600, color:"#333", textDecoration:"none", border:"1px solid #ddd", borderRadius:10, padding:"6px 14px", background:"#fff" }}>
          ← Späť na objednávku
        </a>
        <PrintButton />
        {invoice.isTest && <span style={{ fontSize:11, fontWeight:700, color:"#b45309", background:"#fef3c7", borderRadius:20, padding:"3px 10px" }}>TESTOVACIA</span>}
      </div>

      {/* ══════════════ A4 FAKTÚRA ══════════════ */}
      <div id="invoice" style={S.page}>

        {/* ── 1. HLAVIČKA ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ fontSize:19, fontWeight:900, margin:0, letterSpacing:-0.5 }}>{isCN ? "DOBROPIS" : "FAKTÚRA"}</p>
            <p style={{ fontSize:8, color:"#888", margin:"2px 0 0" }}>
              {isCN ? "Dobropis – daňový doklad" : "Daňový doklad – §74 zák. č. 222/2004 Z.z. o DPH"}
            </p>
            {isCN && invoice.creditNoteFor && (
              <p style={{ fontSize:8, color:"#888", margin:"1px 0 0" }}>k faktúre č. <strong>{invoice.creditNoteFor.invoiceNumber}</strong></p>
            )}
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:19, fontWeight:900, color:"#FFAE00", margin:0 }}>VytlačTo3D</p>
            <p style={{ fontSize:8, color:"#bbb", margin:"2px 0 0" }}>vytlacto3d.sk</p>
            {invoice.isTest && <p style={{ fontSize:8, fontWeight:700, color:"#d97706", margin:"2px 0 0" }}>TESTOVACÍ DOKLAD</p>}
          </div>
        </div>

        {/* ── 2. METADATA ── */}
        <div style={{ marginTop:7, display:"flex", flexWrap:"wrap", gap:"4px 16px", background:"#f8f8f8", borderRadius:7, padding:"5px 10px" }}>
          {[
            { label:"Číslo dokladu",    value:invoice.invoiceNumber, big:true },
            invoice.order?.orderNumber ? { label:"Č. objednávky", value:String(invoice.order.orderNumber) } : null,
            { label:"Dátum vystavenia", value:date(invoice.issuedAt) },
            { label:"Dátum dodania",    value:date(invoice.issuedAt) },
            { label:"Dátum splatnosti", value:date(invoice.dueAt), bold:true },
            vs ? { label:"Variabilný symbol", value:vs, mono:true, bold:true } : null,
          ].filter(Boolean).map((f:any, i) => (
            <div key={i}>
              <p style={S.label}>{f.label}</p>
              <p style={f.big ? S.valBig : f.mono ? S.valMono : { ...S.val, fontWeight: f.bold ? 800 : 600 }}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* ── 3. DODÁVATEĽ / ODBERATEĽ ── */}
        <div style={{ marginTop:7, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {/* Dodávateľ */}
          <div style={{ fontSize:8.5, lineHeight:1.45 }}>
            <p style={S.label}>Dodávateľ</p>
            <p style={{ fontSize:11, fontWeight:800, margin:"2px 0 0" }}>{seller.name}</p>
            {seller.street  && <p style={{ margin:0, color:"#555" }}>{seller.street}</p>}
            {(seller.zip||seller.city) && <p style={{ margin:0, color:"#555" }}>{[seller.zip,seller.city].filter(Boolean).join(" ")}</p>}
            {seller.country && <p style={{ margin:0, color:"#555" }}>{seller.country}</p>}
            <div style={{ marginTop:3, color:"#555" }}>
              {seller.ico   && <p style={{ margin:0 }}>IČO: <strong>{seller.ico}</strong></p>}
              {seller.dic   && <p style={{ margin:0 }}>DIČ: <strong>{seller.dic}</strong></p>}
              {seller.icDph && <p style={{ margin:0 }}>IČ DPH: <strong>{seller.icDph}</strong></p>}
              {seller.iban  && <p style={{ margin:0 }}>IBAN: <strong style={{ fontFamily:"monospace" }}>{seller.iban}</strong></p>}
              {seller.swift && <p style={{ margin:0 }}>SWIFT: <strong>{seller.swift}</strong></p>}
              {seller.bank  && <p style={{ margin:0 }}>{seller.bank}</p>}
              {seller.email && <p style={{ margin:0 }}>{seller.email}</p>}
            </div>
          </div>
          {/* Odberateľ */}
          <div style={{ fontSize:8.5, lineHeight:1.45 }}>
            <p style={S.label}>Odberateľ</p>
            <p style={{ fontSize:11, fontWeight:800, margin:"2px 0 0" }}>{customer.companyName ?? customer.name ?? "—"}</p>
            {customer.companyName && customer.name && <p style={{ margin:0, color:"#777" }}>{customer.name}</p>}
            {customer.street && <p style={{ margin:0, color:"#555" }}>{customer.street}</p>}
            {(customer.zip||customer.city) && <p style={{ margin:0, color:"#555" }}>{[customer.zip,customer.city].filter(Boolean).join(" ")}</p>}
            {customer.country && <p style={{ margin:0, color:"#555" }}>{customer.country}</p>}
            <div style={{ marginTop:3, color:"#555" }}>
              {customer.email && <p style={{ margin:0 }}>{customer.email}</p>}
              {customer.phone && <p style={{ margin:0 }}>{customer.phone}</p>}
              {customer.ico   && <p style={{ margin:0 }}>IČO: <strong>{customer.ico}</strong></p>}
              {customer.dic   && <p style={{ margin:0 }}>DIČ: <strong>{customer.dic}</strong></p>}
              {customer.icDph && <p style={{ margin:0 }}>IČ DPH: <strong>{customer.icDph}</strong></p>}
            </div>
          </div>
        </div>

        {/* ── 4. POLOŽKY ── */}
        <table style={{ marginTop:8, width:"100%", borderCollapse:"collapse", fontSize:8.5 }}>
          <thead>
            <tr style={{ borderBottom:"2px solid #111" }}>
              <th style={{ textAlign:"left",  padding:"2px 6px 2px 0", fontWeight:700, color:"#444" }}>Popis tovaru / služby</th>
              <th style={{ textAlign:"right", padding:"2px 0", fontWeight:700, color:"#444", width:24 }}>Ks</th>
              <th style={{ textAlign:"right", padding:"2px 0", fontWeight:700, color:"#444", width:72 }}>Jedn. cena</th>
              <th style={{ textAlign:"right", padding:"2px 0", fontWeight:700, color:"#444", width:34 }}>DPH</th>
              <th style={{ textAlign:"right", padding:"2px 0", fontWeight:700, color:"#444", width:68 }}>Základ DPH</th>
              <th style={{ textAlign:"right", padding:"2px 0", fontWeight:700, color:"#444", width:68 }}>Cena s DPH</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom:"1px solid #f0f0f0" }}>
                <td style={{ padding:"3px 6px 3px 0", color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:260 }}>{item.description}</td>
                <td style={{ textAlign:"right", padding:"3px 0", color:"#555" }}>{item.quantity}</td>
                <td style={{ textAlign:"right", padding:"3px 0", color:"#555" }}>{eur(item.unitNet)}</td>
                <td style={{ textAlign:"right", padding:"3px 0", color:"#777" }}>{item.vatRate} %</td>
                <td style={{ textAlign:"right", padding:"3px 0", color:"#555" }}>{eur(item.totalNet)}</td>
                <td style={{ textAlign:"right", padding:"3px 0", fontWeight:600 }}>{eur(item.totalGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── SPACER ── */}
        <div style={{ flex:1 }} />

        {/* ── 5. SÚČTY ── */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
          <div style={{ width:210 }}>
            <div style={S.row}><span>Základ DPH 23 %</span><span>{eur(invoice.totalNet)}</span></div>
            <div style={S.row}><span>DPH 23 %</span><span>{eur(invoice.totalVat)}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0 0", fontSize:13, fontWeight:900 }}>
              <span>CELKOM K ÚHRADE</span><span>{eur(invoice.totalGross)}</span>
            </div>
          </div>
        </div>

        {/* ── 6. PLATOBNÉ ÚDAJE ── */}
        <div style={{ marginTop:7, background:"#f8f8f8", borderRadius:6, padding:"5px 10px", fontSize:8.5, color:"#555", display:"flex", flexWrap:"wrap", gap:"3px 16px" }}>
          <span><strong>Spôsob úhrady:</strong> {customer.paymentMethod === "TRANSFER" ? "Bankový prevod" : "Platobná karta"}</span>
          {seller.iban  && <span>IBAN: <strong style={{ fontFamily:"monospace" }}>{seller.iban}</strong></span>}
          {seller.swift && <span>SWIFT: <strong>{seller.swift}</strong></span>}
          {seller.bank  && <span>{seller.bank}</span>}
          {vs           && <span>VS: <strong style={{ fontFamily:"monospace" }}>{vs}</strong></span>}
        </div>

        {/* ── 7. POZNÁMKA ── */}
        {invoice.note && <p style={{ marginTop:4, fontSize:8, color:"#999", fontStyle:"italic" }}>{invoice.note}</p>}

        {/* ── 8. FOOTER ── */}
        <div style={{ marginTop:5, borderTop:"1px solid #eee", paddingTop:4, display:"flex", justifyContent:"space-between", fontSize:7, color:"#ccc" }}>
          <span>Daňový doklad v zmysle §74 zák. č. 222/2004 Z.z. o dani z pridanej hodnoty. Tovar/služba dodaná dňom dátumu dodania.</span>
          <span style={{ whiteSpace:"nowrap", marginLeft:8 }}>{seller.email}</span>
        </div>

      </div>

      {/* ── PRINT CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          #invoice {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            padding: 7mm 11mm 5mm !important;
            margin: 0 !important;
          }
        }
      ` }} />
    </>
  );
}
