"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
};

type Stats = {
  total: number;
  pending: number;
  paid: number;
  inProduction: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  revenueTotal: number;
};

type FilterType = "ALL" | "PENDING" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  PENDING:       { label: "Čaká na platbu",  classes: "border-neutral-300 bg-neutral-100 text-neutral-700" },
  PAID:          { label: "Zaplatená",        classes: "border-[#FFAE00] bg-[#FFAE00] text-black" },
  IN_PRODUCTION: { label: "V produkcii",      classes: "border-blue-600 bg-blue-600 text-white" },
  SHIPPED:       { label: "Odoslaná",         classes: "border-blue-600 bg-blue-600 text-white" },
  DELIVERED:     { label: "Doručená",         classes: "border-green-600 bg-green-600 text-white" },
  CANCELLED:     { label: "Zrušená",          classes: "border-red-500 bg-red-500 text-white" },
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
  const router = useRouter();

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

  function cardClass(filter: FilterType) {
    const base =
      "cursor-pointer rounded-3xl border p-5 transition-all select-none";
    const active =
      "border-[#FFAE00] bg-[#FFAE00]/10 shadow-md ring-2 ring-[#FFAE00]/30";
    const inactive =
      "border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300";
    return `${base} ${activeFilter === filter ? active : inactive}`;
  }

  const filterCards = [
    { filter: "ALL" as FilterType,          title: "Všetky",      value: stats.total,        hint: "Všetky objednávky" },
    { filter: "PENDING" as FilterType,      title: "Čakajúce",    value: stats.pending,      hint: "Status PENDING" },
    { filter: "PAID" as FilterType,         title: "Zaplatené",   value: stats.paid,         hint: "Status PAID" },
    { filter: "IN_PRODUCTION" as FilterType,title: "Tlačia sa",   value: stats.inProduction, hint: "Status IN_PRODUCTION" },
    { filter: "SHIPPED" as FilterType,      title: "Odoslané",    value: stats.shipped,      hint: "Status SHIPPED" },
    { filter: "DELIVERED" as FilterType,    title: "Doručené",    value: stats.delivered,    hint: "Status DELIVERED" },
    { filter: "CANCELLED" as FilterType,    title: "Zrušené",     value: stats.cancelled,    hint: "Status CANCELLED" },
  ];

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Klientský admin
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
              Správa objednávok 3D tlače
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Tu klient alebo administrátor vidí všetky objednávky, ich stav, cenu, konfiguráciu aj STL model od zákazníka.
            </p>
          </div>
          <a
            href="/"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-50"
          >
            Späť na web
          </a>
        </div>

        {/* Stat Cards — filter */}
        <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          {filterCards.map(({ filter, title, value, hint }) => (
            <div
              key={filter}
              className={cardClass(filter)}
              onClick={() => setActiveFilter(filter)}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {title}
              </div>
              <div className="mt-2 text-3xl font-extrabold text-neutral-900">{value}</div>
              <div className="mt-1 text-xs text-neutral-400">{hint}</div>
              {activeFilter === filter && (
                <div className="mt-2 text-xs font-bold text-[#FFAE00]">● Aktívny</div>
              )}
            </div>
          ))}

          {/* Tržby — neklikateľná */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Tržby
            </div>
            <div className="mt-2 text-2xl font-extrabold text-neutral-900">
              {formatEur(stats.revenueTotal)}
            </div>
            <div className="mt-1 text-xs text-neutral-400">vrátane DPH</div>
          </div>
        </section>

        {/* Aktívny filter info */}
        {activeFilter !== "ALL" && (
          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-semibold text-neutral-600">
              Filter:{" "}
              <span className="text-[#FFAE00]">
                {STATUS_LABELS[activeFilter]?.label ?? activeFilter}
              </span>{" "}
              — {filtered.length} objednávok
            </span>
            <button
              onClick={() => setActiveFilter("ALL")}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Zrušiť filter ×
            </button>
          </div>
        )}

        {/* Zoznam */}
        <section className="mt-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="text-lg font-semibold text-neutral-800">
                Žiadne objednávky pre filter „{STATUS_LABELS[activeFilter]?.label ?? activeFilter}"
              </div>
              <button
                onClick={() => setActiveFilter("ALL")}
                className="mt-4 text-sm font-semibold text-[#FFAE00] underline"
              >
                Zobraziť všetky
              </button>
            </div>
          ) : (
            filtered.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? {
                label: order.status,
                classes: "border-neutral-200 bg-neutral-100 text-neutral-700",
              };

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr_auto]">

                    {/* Stĺpec 1: Identifikácia */}
                    <div>
                      <div className="text-lg font-extrabold text-neutral-900">
                        {order.orderNumber ?? (
                          <span className="font-mono text-sm text-neutral-500">
                            {order.id.slice(0, 16)}…
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-neutral-700">
                        {order.fileName}
                      </div>
                      <div className="mt-1 font-mono text-xs text-neutral-400">
                        {order.id}
                      </div>
                      <div className="mt-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-sm font-semibold text-neutral-900 underline underline-offset-4"
                        >
                          Otvoriť detail objednávky
                        </Link>
                      </div>
                      {order.stripeSessionId && (
                        <div className="mt-2 text-xs text-neutral-500">
                          Stripe:{" "}
                          <span className="font-mono">
                            {order.stripeSessionId.slice(0, 18)}...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stĺpec 2: Konfigurácia + kontakt */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Konfigurácia
                      </div>
                      <div className="mt-2 text-sm text-neutral-700">
                        {order.configLabel}
                      </div>
                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Kontakt
                      </div>
                      <div className="mt-2 text-sm text-neutral-700">
                        {order.customerEmail}
                      </div>
                      {order.shippingMethod !== "—" && (
                        <div className="mt-2 text-xs text-neutral-500">
                          Doprava: {order.shippingMethod}
                        </div>
                      )}
                    </div>

                    {/* Stĺpec 3: Cena + dátum + stav */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Cena celkom
                      </div>
                      <div className="mt-2 text-lg font-bold text-neutral-900">
                        {formatEur(order.paidTotalEur)}
                      </div>
                      <div className="text-xs text-neutral-500">vrátane DPH a dopravy</div>
                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Dátum
                      </div>
                      <div className="mt-2 text-sm text-neutral-600">
                        {order.createdAtText}
                      </div>
                      <div className="mt-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.classes}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Stĺpec 4: Akcie */}
                    <div className="flex flex-col gap-2 xl:min-w-[160px]">
                      <a
                        href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-center text-xs font-bold text-neutral-900 hover:bg-neutral-50"
                      >
                        Otvoriť STL
                      </a>
                      <a
                        href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
                        download
                        className="rounded-xl bg-[#FFAE00] px-3 py-2 text-center text-xs font-bold text-black hover:opacity-90"
                      >
                        Stiahnuť STL
                      </a>

                      {order.status === "PENDING" && (
                        <button
                          onClick={() => handleStatusChange(order.id, "PAID")}
                          disabled={changingId === order.id}
                          className="w-full rounded-xl bg-[#FFAE00] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#e09d00] disabled:opacity-50"
                        >
                          {changingId === order.id ? "..." : "Označiť PAID"}
                        </button>
                      )}
                      {order.status === "PAID" && (
                        <button
                          onClick={() => handleStatusChange(order.id, "IN_PRODUCTION")}
                          disabled={changingId === order.id}
                          className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {changingId === order.id ? "..." : "Spustiť tlač"}
                        </button>
                      )}
                      {order.status === "IN_PRODUCTION" && (
                        <button
                          onClick={() => handleStatusChange(order.id, "SHIPPED")}
                          disabled={changingId === order.id}
                          className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {changingId === order.id ? "..." : "Označiť ODOSLANÉ"}
                        </button>
                      )}
                      {order.status === "SHIPPED" && (
                        <button
                          onClick={() => handleStatusChange(order.id, "DELIVERED")}
                          disabled={changingId === order.id}
                          className="w-full rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {changingId === order.id ? "..." : "Označiť DORUČENÉ"}
                        </button>
                      )}

                      <div className="mt-auto pt-2 border-t border-neutral-100">
                        <button
                          onClick={() => handleDelete(order)}
                          disabled={deletingId === order.id}
                          className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === order.id ? "Mazanie..." : "Vymazať"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
