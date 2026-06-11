"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "PENDING",       label: "Čaká na platbu",  color: "bg-yellow-100 text-yellow-800" },
  { value: "PAID",          label: "Zaplatená",        color: "bg-green-100 text-green-800" },
  { value: "IN_PRODUCTION", label: "V produkcii",      color: "bg-blue-100 text-blue-800" },
  { value: "SHIPPED",       label: "Odoslaná",         color: "bg-purple-100 text-purple-800" },
  { value: "DELIVERED",     label: "Doručená",         color: "bg-emerald-100 text-emerald-800" },
  { value: "CANCELLED",     label: "Zrušená",          color: "bg-red-100 text-red-800" },
];

export default function AdminStatusChanger({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [selected, setSelected] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleChange(newStatus: string) {
    if (newStatus === selected) return;
    const label = STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
    if (!confirm(`Zmeniť stav na "${label}"?\nKlientovi bude odoslaný email.`)) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage("Chyba: " + (data.error ?? "Neznáma chyba"));
        return;
      }
      setSelected(newStatus);
      setMessage("Stav aktualizovaný, email odoslaný klientovi.");
      router.refresh();
    } catch {
      setMessage("Sieťová chyba.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">
        Zmeniť stav objednávky
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleChange(s.value)}
            disabled={loading}
            className={[
              "rounded-xl px-4 py-2 text-sm font-bold transition border-2",
              selected === s.value
                ? "border-[#FFAE00] ring-2 ring-[#FFAE00]/30 " + s.color
                : "border-transparent opacity-50 hover:opacity-100 " + s.color,
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
      </div>
      {message && (
        <p className="mt-3 text-sm font-semibold text-neutral-700">{message}</p>
      )}
    </div>
  );
}
