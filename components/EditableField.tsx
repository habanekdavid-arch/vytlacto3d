"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  label: string;
  value: string;
  field?: string;
  jsonField?: string;
  jsonKey?: string;
  mono?: boolean;
};

export default function EditableField({
  orderId, label, value, field, jsonField, jsonKey, mono = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/update-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, field, jsonField, jsonKey, value: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chyba pri ukladaní.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Sieťová chyba.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group rounded-2xl bg-neutral-50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          {label}
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); setError(""); }}
            className="opacity-0 transition group-hover:opacity-100"
            title="Upraviť"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-400 hover:text-[#FFAE00]"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setError(""); } }}
            autoFocus
            disabled={saving}
            className={[
              "w-full rounded-xl border border-[#FFAE00] bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#FFAE00]",
              mono ? "font-mono text-xs" : "",
            ].join(" ")}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-[#FFAE00] px-3 py-1 text-xs font-bold text-black hover:bg-[#e09d00] disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {saving ? "Ukladám..." : "Uložiť"}
            </button>
            <button
              onClick={() => { setEditing(false); setError(""); }}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Zrušiť
            </button>
          </div>
          {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
      ) : (
        <div
          className={[
            "mt-2 break-words text-sm font-semibold text-neutral-900",
            mono ? "font-mono text-xs" : "",
          ].join(" ")}
        >
          {value || "—"}
        </div>
      )}
    </div>
  );
}
