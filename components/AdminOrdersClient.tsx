"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModelPreviewAllButton from "@/components/ModelPreviewAllButton";
import FlowiiCheckButton from "@/components/FlowiiCheckButton";
import FlowiiTestOrderButton from "@/components/FlowiiTestOrderButton";
import PacketaIcon from "@/components/admin/PacketaIcon";

type Order = {
  id: string;
  orderNumber: string | null;
  fileName: string;
  fileKey: string;
  status: string;
  customerEmail: string;
  shippingMethod: string;
  stripeSessionId: string | null;
  paidTotalEur: number | null;
  createdAtText: string;
  configLabel: string;
  allowModelAdjustments: boolean;
  modelCount: number;
  models: { fileKey: string; fileName: string; scalePct?: number; colorId?: string }[];
  isPacketa: boolean;
  packetaBarcodeText: string | null;
};

type Stats = {
  total: number;
  pending: number;
  awaitingTransfer: number;
  paid: number;
  inProduction: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  revenueTotal: number;
};

type FilterType = "ALL" | "PENDING" | "AWAITING_TRANSFER" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  PENDING:            { label: "Čaká na platbu",  classes: "border-neutral-300 bg-neutral-100 text-neutral-700" },
  AWAITING_TRANSFER:  { label: "Čaká na prevod",  classes: "border-orange-400 bg-orange-100 text-orange-800" },
  PAID:               { label: "Zaplatená",        classes: "border-[#FFAE00] bg-[#FFAE00] text-black" },
  IN_PRODUCTION:      { label: "V produkcii",      classes: "border-blue-600 bg-blue-600 text-white" },
  SHIPPED:            { label: "Odoslaná",         classes: "border-blue-600 bg-blue-600 text-white" },
  DELIVERED:          { label: "Doručená",         classes: "border-green-600 bg-green-600 text-white" },
  CANCELLED:          { label: "Zrušená",          classes: "border-red-500 bg-red-500 text-white" },
};

function formatEur(val: number | null) {
  if (val === null) return "—";
  return val.toLocaleString("sk-SK", { style: "currency", currency: "EUR" });
}

export default function AdminOrdersClient({
  orders,
  stats,
}: {
  orders: Order[];
  stats: Stats;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [allEmailsStatus, setAllEmailsStatus] = useState<"idle" | "sending">("idle");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const router = useRouter();

  async function resendTransferEmail(orderId: string) {
    setResendingId(orderId);
    try {
      const res = await fetch("/api/admin/resend-transfer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert("Mail sa neodoslal: " + (d.error ?? "Neznáma chyba"));
        return;
      }
      alert("Platobné údaje odoslané na " + d.to);
    } catch {
      alert("Sieťová chyba pri odosielaní mailu.");
    } finally {
      setResendingId(null);
    }
  }

  // Rozpošle vzorku od každej šablóny na internú schránku. Trvá to desiatky
  // sekúnd — správy idú cez SMTP po jednej — preto je tlačidlo dovtedy zamknuté.
  async function sendAllSampleEmails() {
    if (!confirm("Odoslať vzorku od každého typu mailu na internú schránku? Môže to trvať aj minútu.")) {
      return;
    }
    setAllEmailsStatus("sending");
    try {
      const res = await fetch("/api/admin/test-all-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && !d?.results) {
        alert("Rozposlanie zlyhalo: " + (d.error ?? res.status));
        return;
      }
      const failed = (d.results ?? []).filter((r: { ok: boolean }) => !r.ok);
      alert(
        failed.length === 0
          ? `Odoslaných ${d.sent} vzoriek na ${d.to}.\nV schránke ich nájdeš podľa predmetu "${d.subjectPrefix}".`
          : `Odoslaných ${d.sent}, zlyhalo ${failed.length}:\n\n` +
              failed
                .map((r: { label: string; error?: string }) => `• ${r.label}: ${r.error ?? "neznáma chyba"}`)
                .join("\n")
      );
    } catch {
      alert("Sieťová chyba pri rozposielaní vzoriek.");
    } finally {
      setAllEmailsStatus("idle");
    }
  }

  async function sendTestEmail() {
    setTestEmailStatus("sending");
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      setTestEmailStatus(res.ok ? "ok" : "error");
      if (!res.ok) {
        alert(
          "Testovací email sa nepodarilo odoslať.\n\n" +
            (d.hint ? `Čo s tým: ${d.hint}\n\n` : "") +
            `Chyba: ${d.error ?? res.status}` +
            (d.config ? `\n\nOdosiela: ${d.config.from}\nPrihlásenie: ${d.config.user}\nPríjemca: ${d.to}` : "")
        );
      } else if (d.transport === "fallback") {
        alert(
          "Email odišiel len cez záložný Gmail — hlavné odosielanie cez Microsoft 365 nefunguje. Detail je vo Vercel logoch."
        );
      }
    } catch {
      setTestEmailStatus("error");
    }
    setTimeout(() => setTestEmailStatus("idle"), 4000);
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    setChangingId(orderId);
    try {
      const res = await fetch("/api/admin/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert("Chyba: " + (d.error ?? "Neznáma chyba"));
        return;
      }
      router.refresh();
    } catch {
      alert("Sieťová chyba.");
    } finally {
      setChangingId(null);
    }
  }

  const filtered =
    activeFilter === "ALL" ? orders : orders.filter((o) => o.status === activeFilter);

  async function handleDelete(order: Order) {
    const label = order.orderNumber ? `#${order.orderNumber}` : order.id.slice(0, 8);
    if (
      !confirm(
        `Naozaj chcete NATRVALO vymazať objednávku ${label} – ${order.fileName}?\n\nTáto akcia sa nedá vrátiť.`
      )
    )
      return;

    setDeletingId(order.id);
    try {
      const res = await fetch("/api/admin/delete-order", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert("Chyba: " + (d.error ?? "Neznáma chyba"));
        return;
      }
      router.refresh();
    } catch {
      alert("Sieťová chyba pri mazaní.");
    } finally {
      setDeletingId(null);
    }
  }

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filterCards = [
    { filter: "ALL" as FilterType,               title: "Všetky",     value: stats.total },
    { filter: "PENDING" as FilterType,           title: "Čakajúce",   value: stats.pending },
    { filter: "AWAITING_TRANSFER" as FilterType, title: "Prevod",     value: stats.awaitingTransfer },
    { filter: "PAID" as FilterType,              title: "Zaplatené",  value: stats.paid },
    { filter: "IN_PRODUCTION" as FilterType,     title: "Tlačia sa",  value: stats.inProduction },
    { filter: "SHIPPED" as FilterType,           title: "Odoslané",   value: stats.shipped },
    { filter: "DELIVERED" as FilterType,         title: "Doručené",   value: stats.delivered },
    { filter: "CANCELLED" as FilterType,         title: "Zrušené",    value: stats.cancelled },
  ];

  const navLink = "rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50";
  const toolBtn = "w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60";
  const actBtn = "rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50";

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 text-neutral-900 sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* Hlavička */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Objednávky</h1>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/admin/kupony" className={navLink}>Kupóny</a>
            <a href="/admin/ucty" className={navLink}>Účty</a>
            <a href="/admin/cms" className={navLink}>CMS</a>
            {/* Testovacie nástroje — netreba ich na očiach každý deň. */}
            <details className="relative">
              <summary className={`${navLink} cursor-pointer list-none select-none`}>Nástroje ▾</summary>
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
                <button onClick={sendTestEmail} disabled={testEmailStatus === "sending"} className={toolBtn}>
                  {testEmailStatus === "sending" ? "Odosiela..." : testEmailStatus === "ok" ? "Email odoslaný ✓" : testEmailStatus === "error" ? "Chyba ✗" : "Testovací email"}
                </button>
                <button onClick={sendAllSampleEmails} disabled={allEmailsStatus === "sending"} className={toolBtn}>
                  {allEmailsStatus === "sending" ? "Rozposielam..." : "Vzorky všetkých mailov"}
                </button>
                <FlowiiCheckButton label="Test FLOWii" className={toolBtn} />
                <FlowiiTestOrderButton className={toolBtn} />
              </div>
            </details>
            <a href="/" className={navLink}>Späť na web</a>
          </div>
        </div>

        {/* Filtre podľa stavu */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {filterCards.map(({ filter, title, value }) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                activeFilter === filter
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
              ].join(" ")}
            >
              {title} <span className="opacity-60">{value}</span>
            </button>
          ))}
          <span className="ml-auto text-xs text-neutral-500">
            Tržby: <span className="font-bold text-neutral-900">{formatEur(stats.revenueTotal)}</span> s DPH
          </span>
        </div>

        {/* Zoznam — tenké riadky, po kliknutí detail a akcie */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="hidden grid-cols-[20px_130px_minmax(0,1.3fr)_minmax(0,1.3fr)_90px_120px_130px] items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500 lg:grid">
            <span />
            <span>Číslo</span>
            <span>Zákazník</span>
            <span>Model</span>
            <span className="text-right">Suma</span>
            <span>Dátum</span>
            <span>Stav</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-neutral-500">
              Žiadne objednávky pre filter „{STATUS_LABELS[activeFilter]?.label ?? activeFilter}“.{" "}
              <button onClick={() => setActiveFilter("ALL")} className="font-semibold text-neutral-900 underline">
                Zobraziť všetky
              </button>
            </div>
          ) : (
            filtered.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? {
                label: order.status,
                classes: "border-neutral-200 bg-neutral-100 text-neutral-700",
              };
              const open = openIds.has(order.id);
              const busy = changingId === order.id;

              return (
                <div key={order.id} className="border-b border-neutral-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggle(order.id)}
                    aria-expanded={open}
                    className={[
                      "grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-left text-sm transition hover:bg-neutral-50",
                      "lg:grid-cols-[20px_130px_minmax(0,1.3fr)_minmax(0,1.3fr)_90px_120px_130px]",
                      open ? "bg-neutral-50" : "",
                    ].join(" ")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span className="truncate font-bold text-neutral-900">
                      {order.orderNumber ?? <span className="font-mono text-xs text-neutral-500">{order.id.slice(0, 10)}…</span>}
                      {order.allowModelAdjustments && <span className="ml-1 text-amber-600" title="Súhlasí s úpravou modelu">⚠</span>}
                      {order.packetaBarcodeText && <span className="ml-1 text-green-600" title={`Štítok Packeta ${order.packetaBarcodeText}`}>✓</span>}
                    </span>
                    <span className="col-start-2 row-start-2 truncate text-xs text-neutral-500 lg:col-start-auto lg:row-start-auto lg:text-sm lg:text-neutral-700">
                      {order.customerEmail}
                    </span>
                    <span className="hidden truncate text-neutral-600 lg:block">
                      {order.fileName}
                      {order.modelCount > 1 && <span className="ml-1 text-xs font-bold text-[#b07a00]">+{order.modelCount - 1}</span>}
                    </span>
                    <span className="hidden text-right font-semibold text-neutral-900 lg:block">{formatEur(order.paidTotalEur)}</span>
                    <span className="hidden text-xs text-neutral-500 lg:block">{order.createdAtText}</span>
                    <span className="col-start-3 row-span-2 row-start-1 lg:col-start-auto lg:row-span-1 lg:row-start-auto">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.classes}`}>
                        {statusInfo.label}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="grid gap-4 border-t border-neutral-100 bg-neutral-50/60 px-4 py-4 text-sm md:grid-cols-[1fr_1fr_auto] md:pl-12">
                      <div className="space-y-1.5">
                        <div><span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Model: </span>{order.fileName}{order.modelCount > 1 ? ` (+${order.modelCount - 1} ďalšie)` : ""}</div>
                        <div><span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Konfigurácia: </span>{order.configLabel}</div>
                        <div className="text-xs">
                          {order.allowModelAdjustments ? (
                            <span className="font-bold text-amber-700">⚠ Súhlasí s úpravou modelu</span>
                          ) : (
                            <span className="text-neutral-500">Úprava modelu nepovolená</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div><span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kontakt: </span>{order.customerEmail}</div>
                        <div><span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Doprava: </span>{order.shippingMethod}</div>
                        <div><span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Suma: </span><span className="font-bold">{formatEur(order.paidTotalEur)}</span> <span className="text-xs text-neutral-500">s DPH a dopravou · {order.createdAtText}</span></div>
                        {order.stripeSessionId && (
                          <div className="font-mono text-[11px] text-neutral-400">Stripe {order.stripeSessionId.slice(0, 18)}…</div>
                        )}
                      </div>

                      <div className="flex flex-wrap content-start gap-1.5 md:w-[330px] md:justify-end">
                        {/* Ďalší krok v stave objednávky */}
                        {order.status === "PENDING" && (
                          <button onClick={() => handleStatusChange(order.id, "PAID")} disabled={busy} className="rounded-lg bg-[#FFAE00] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e09d00] disabled:opacity-50">
                            {busy ? "..." : "Označiť PAID"}
                          </button>
                        )}
                        {order.status === "AWAITING_TRANSFER" && (
                          <>
                            <button onClick={() => handleStatusChange(order.id, "PAID")} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                              {busy ? "..." : "✓ Platba prijatá"}
                            </button>
                            <button onClick={() => resendTransferEmail(order.id)} disabled={resendingId === order.id} className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-100 disabled:opacity-50">
                              {resendingId === order.id ? "Odosielam..." : "Poslať znova platobné údaje"}
                            </button>
                          </>
                        )}
                        {order.status === "PAID" && (
                          <button onClick={() => handleStatusChange(order.id, "IN_PRODUCTION")} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                            {busy ? "..." : "Spustiť tlač"}
                          </button>
                        )}
                        {order.status === "IN_PRODUCTION" && (
                          <button onClick={() => handleStatusChange(order.id, "SHIPPED")} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                            {busy ? "..." : "Označiť ODOSLANÉ"}
                          </button>
                        )}
                        {order.status === "SHIPPED" && (
                          <button onClick={() => handleStatusChange(order.id, "DELIVERED")} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                            {busy ? "..." : "Označiť DORUČENÉ"}
                          </button>
                        )}

                        <Link
                          href={`/admin/orders/${order.id}#packeta`}
                          title={
                            order.packetaBarcodeText
                              ? `Zásielka ${order.packetaBarcodeText} — stiahnuť štítok`
                              : order.isPacketa
                              ? "Vytvoriť štítok Packeta"
                              : "Objednávka nemá výdajné miesto Packeta"
                          }
                          className={[
                            "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                            order.packetaBarcodeText
                              ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                              : order.isPacketa
                              ? "border-[#BA1B02]/30 bg-[#BA1B02]/5 text-[#BA1B02] hover:bg-[#BA1B02]/10"
                              : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50",
                          ].join(" ")}
                        >
                          <PacketaIcon />
                          {order.packetaBarcodeText ? `Štítok ✓` : "Štítok Packeta"}
                        </Link>
                        <ModelPreviewAllButton
                          items={order.models}
                          className={actBtn}
                          label={order.models.length > 1 ? `Náhľad (${order.models.length})` : "Náhľad"}
                        />
                        <a href={`/api/file?key=${encodeURIComponent(order.fileKey)}`} target="_blank" rel="noreferrer" className={actBtn}>
                          Otvoriť STL
                        </a>
                        <a href={`/api/file?key=${encodeURIComponent(order.fileKey)}`} download className={actBtn}>
                          {order.modelCount > 1 ? "Stiahnuť 1. model" : "Stiahnuť STL"}
                        </a>
                        {order.modelCount > 1 && (
                          <a href={`/api/admin/orders/${order.id}/download-all`} className={actBtn}>
                            ZIP ({order.modelCount})
                          </a>
                        )}
                        <Link href={`/admin/orders/${order.id}`} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800">
                          Detail →
                        </Link>
                        <button
                          onClick={() => handleDelete(order)}
                          disabled={deletingId === order.id}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === order.id ? "Mazanie..." : "Vymazať"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
