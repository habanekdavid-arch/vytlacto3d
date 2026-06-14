"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserData = {
  name: string | null;
  phone: string | null;
  accountType: string;
  companyName: string | null;
  ico: string | null;
  dic: string | null;
  icDph: string | null;
  contactPerson: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  shippingName: string | null;
  shippingContact: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
};

export default function AccountEditForm({ user }: { user: UserData }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<UserData>(user);
  const router = useRouter();

  function update<K extends keyof UserData>(key: K, value: UserData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function copyShippingFromBilling() {
    setForm((f) => ({
      ...f,
      shippingName: f.companyName || f.contactPerson || f.name,
      shippingContact: f.contactPerson,
      shippingStreet: f.billingStreet,
      shippingCity: f.billingCity,
      shippingZip: f.billingZip,
      shippingCountry: f.billingCountry,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/account/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Chyba pri ukladaní.");
        return;
      }
      setSuccess(true);
      setEditing(false);
      router.refresh();
    } catch {
      setError("Sieťová chyba.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
    setForm(user);
    setError("");
  }

  if (!editing) {
    return (
      <div className="mt-4">
        <button
          onClick={() => { setSuccess(false); setEditing(true); }}
          className="flex items-center gap-2 rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e09d00]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFAE00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          Upraviť údaje
        </button>
        {success && (
          <p className="mt-2 text-sm font-semibold text-green-600">Údaje boli uložené.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">

      {/* Typ účtu */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Typ účtu
        </div>
        <div className="flex gap-2">
          <TypeBtn
            active={form.accountType === "PERSON"}
            onClick={() => update("accountType", "PERSON")}
          >
            Fyzická osoba
          </TypeBtn>
          <TypeBtn
            active={form.accountType === "COMPANY"}
            onClick={() => update("accountType", "COMPANY")}
          >
            Firma
          </TypeBtn>
        </div>
      </div>

      {/* Základné údaje */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Základné údaje
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Meno a priezvisko" value={form.name} onChange={(v) => update("name", v)} />
          <Field label="Telefón" value={form.phone} onChange={(v) => update("phone", v)} />
          <Field label="Kontaktná osoba" value={form.contactPerson} onChange={(v) => update("contactPerson", v)} />
        </div>
      </div>

      {/* Firemné údaje */}
      {form.accountType === "COMPANY" && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
            Firemné údaje
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Názov firmy" value={form.companyName} onChange={(v) => update("companyName", v)} />
            <Field label="IČO" value={form.ico} onChange={(v) => update("ico", v)} />
            <Field label="DIČ" value={form.dic} onChange={(v) => update("dic", v)} />
            <Field label="IČ DPH" value={form.icDph} onChange={(v) => update("icDph", v)} />
          </div>
        </div>
      )}

      {/* Fakturačná adresa */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Fakturačná adresa
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Ulica a číslo" value={form.billingStreet} onChange={(v) => update("billingStreet", v)} />
          <Field label="Mesto" value={form.billingCity} onChange={(v) => update("billingCity", v)} />
          <Field label="PSČ" value={form.billingZip} onChange={(v) => update("billingZip", v)} />
          <Field label="Krajina" value={form.billingCountry} onChange={(v) => update("billingCountry", v)} />
        </div>
      </div>

      {/* Dodacia adresa */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Dodacia adresa
          </div>
          <button
            type="button"
            onClick={copyShippingFromBilling}
            className="text-xs font-semibold text-[#FFAE00] underline hover:text-[#b07a00]"
          >
            Skopírovať z fakturačnej
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Meno / Firma" value={form.shippingName} onChange={(v) => update("shippingName", v)} />
          <Field label="Kontaktná osoba" value={form.shippingContact} onChange={(v) => update("shippingContact", v)} />
          <Field label="Ulica a číslo" value={form.shippingStreet} onChange={(v) => update("shippingStreet", v)} />
          <Field label="Mesto" value={form.shippingCity} onChange={(v) => update("shippingCity", v)} />
          <Field label="PSČ" value={form.shippingZip} onChange={(v) => update("shippingZip", v)} />
          <Field label="Krajina" value={form.shippingCountry} onChange={(v) => update("shippingCountry", v)} />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#FFAE00] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e09d00] disabled:opacity-60"
        >
          {saving ? "Ukladám..." : "Uložiť zmeny"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          Zrušiť
        </button>
      </div>
    </div>
  );
}

function TypeBtn({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border-2 px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-[#FFAE00] bg-[#FFAE00]/10 text-neutral-900"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({
  label, value, onChange,
}: {
  label: string; value: string | null; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-neutral-500">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-[#FFAE00] focus:ring-1 focus:ring-[#FFAE00]/30"
      />
    </div>
  );
}
