"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  type: string;
  isTest: boolean;
  issuedAt: string;
  totalGross: number;
  creditNotes: { id: string; invoiceNumber: string }[];
};

function fmt(n: number) {
  return n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("sk-SK").format(new Date(s));
}

export default function InvoiceSection({
  orderId,
  initialInvoices,
}: {
  orderId: string;
  initialInvoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  const [creating, setCreating] = useState(false);
  const [isTest, setIsTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mainInvoice = invoices.find((i) => i.type === "INVOICE");

  async function createInvoice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, isTest }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chyba pri vytváraní faktúry");
        return;
      }
      setInvoices((prev) => [...prev, { ...data.invoice, creditNotes: [] }]);
      setCreating(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function createCreditNote(invoiceId: string) {
    setCreditLoading(invoiceId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chyba pri vytváraní dobropisu");
        return;
      }
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, creditNotes: [...(inv.creditNotes ?? []), data.creditNote] }
            : inv
        )
      );
      router.refresh();
    } finally {
      setCreditLoading(null);
    }
  }

  return (
    <section className="mt-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-extrabold text-neutral-900">Faktúry</h2>

        {!creating && (
          <button
            type="button"
            onClick={() => { setCreating(true); setError(null); }}
            className="rounded-2xl bg-[#FFAE00] px-4 py-2.5 text-sm font-extrabold text-black shadow-sm hover:opacity-90"
          >
            Vystaviť faktúru
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <div className="mb-1 text-xs font-bold text-neutral-500">Číselný rad</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsTest(false)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-bold transition",
                  !isTest
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100",
                ].join(" ")}
              >
                Produkčná&nbsp;<span className="opacity-60">3026…</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTest(true)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-bold transition",
                  isTest
                    ? "bg-amber-500 text-white"
                    : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100",
                ].join(" ")}
              >
                Testovacia&nbsp;<span className="opacity-60">4026…</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={createInvoice}
            disabled={loading}
            className="rounded-2xl bg-[#FFAE00] px-5 py-2.5 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Vystavujem…" : "Vystaviť"}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setError(null); }}
            className="text-sm font-semibold text-neutral-400 hover:text-neutral-700"
          >
            Zrušiť
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Invoice list */}
      {invoices.length === 0 && !creating && (
        <p className="mt-4 text-sm text-neutral-400">Žiadna faktúra ešte nebola vystavená.</p>
      )}

      <div className="mt-4 space-y-3">
        {invoices.map((inv) => {
          const isCreditNote = inv.type === "CREDIT_NOTE";
          const hasCreditNote = (inv.creditNotes ?? []).length > 0;

          return (
            <div
              key={inv.id}
              className={[
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3",
                isCreditNote
                  ? "border-blue-200 bg-blue-50"
                  : "border-neutral-200 bg-neutral-50",
              ].join(" ")}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-neutral-900">
                    {inv.invoiceNumber}
                  </span>
                  {isCreditNote && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      Dobropis
                    </span>
                  )}
                  {inv.isTest && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      Test
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  Vystavená: {fmtDate(inv.issuedAt)} &nbsp;·&nbsp; {fmt(inv.totalGross)}
                </div>

                {/* Linked credit notes */}
                {!isCreditNote && (inv.creditNotes ?? []).map((cn) => (
                  <div key={cn.id} className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-600">
                      Dobropis: {cn.invoiceNumber}
                    </span>
                    <a
                      href={`/admin/invoices/${cn.id}`}
                      target="_blank"
                      className="text-blue-500 underline hover:text-blue-700"
                    >
                      Zobraziť
                    </a>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/admin/invoices/${inv.id}`}
                  target="_blank"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50"
                >
                  Zobraziť / Tlačiť
                </a>

                {!isCreditNote && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Naozaj vystaviť dobropis k faktúre ${inv.invoiceNumber}?`)) return;
                      createCreditNote(inv.id);
                    }}
                    disabled={creditLoading === inv.id}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {creditLoading === inv.id ? "Vystavujem…" : "Dobropis"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
