"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"PERSON" | "COMPANY">("PERSON");
  const [vatPayer, setVatPayer] = useState(false);
  const [isSzco, setIsSzco] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [payload, setPayload] = useState({
    name: "", email: "", password: "", phone: "",
    companyName: "", ico: "", dic: "", icDph: "", contactPerson: "",
    billingStreet: "", billingCity: "", billingZip: "", billingCountry: "Slovensko",
    shippingName: "", shippingContact: "",
    shippingStreet: "", shippingCity: "", shippingZip: "", shippingCountry: "Slovensko",
  });

  function set(field: keyof typeof payload, value: string) {
    setPayload(p => ({ ...p, [field]: value }));
    clearError(field);
  }

  function clearError(field: string) {
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate(data: typeof payload): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!data.name.trim()) errs.name = "Meno je povinné.";
    if (!data.email.trim()) errs.email = "E-mail je povinný.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = "Zadajte platný e-mail.";
    if (!data.password) errs.password = "Heslo je povinné.";
    else if (data.password.length < 8) errs.password = "Heslo musí mať aspoň 8 znakov.";
    if (!data.phone.trim()) errs.phone = "Telefón je povinný.";
    if (accountType === "COMPANY") {
      if (!data.companyName.trim()) errs.companyName = "Názov firmy je povinný.";
      if (!data.ico.trim()) errs.ico = "IČO je povinné.";
      if (!data.contactPerson.trim()) errs.contactPerson = "Kontaktná osoba je povinná.";
      if (vatPayer && !data.icDph.trim()) errs.icDph = "IČ DPH je povinné pre platcu DPH.";
      if (!data.billingStreet.trim()) errs.billingStreet = "Ulica je povinná.";
      if (!data.billingCity.trim()) errs.billingCity = "Mesto je povinné.";
      if (!data.billingZip.trim()) errs.billingZip = "PSČ je povinné.";
    }
    if (!data.shippingStreet.trim()) errs.shippingStreet = "Ulica je povinná.";
    if (!data.shippingCity.trim()) errs.shippingCity = "Mesto je povinné.";
    if (!data.shippingZip.trim()) errs.shippingZip = "PSČ je povinné.";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const shippingOverride = sameAddress
      ? { shippingStreet: payload.billingStreet, shippingCity: payload.billingCity, shippingZip: payload.billingZip, shippingCountry: payload.billingCountry }
      : {};

    const finalPayload = {
      ...payload,
      ...shippingOverride,
      // Billing fallback: if PERSON didn't fill billing, copy from shipping
      billingStreet: payload.billingStreet || payload.shippingStreet,
      billingCity: payload.billingCity || payload.shippingCity,
      billingZip: payload.billingZip || payload.shippingZip,
      billingCountry: payload.billingCountry || payload.shippingCountry,
      accountType,
      vatPayer,
      icDph: vatPayer ? payload.icDph : "",
      // Clear SZČO fields if not SZČO and not COMPANY
      ico: accountType === "COMPANY" || isSzco ? payload.ico : "",
      dic: accountType === "COMPANY" || isSzco ? payload.dic : "",
    };

    const errs = validate({ ...payload, ...shippingOverride });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => {
        document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.toLowerCase().includes("email")) {
          setErrors({ email: "Účet s týmto e-mailom už existuje." });
          setTimeout(() => {
            document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
        } else {
          setErrors({ _form: data.error || "Registrácia zlyhala." });
        }
        return;
      }
      router.push("/prihlasenie?registered=1");
    } catch {
      setErrors({ _form: "Sieťová chyba. Skúste znova." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Registrácia</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Vytvoriť účet</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Vyberte, či sa registrujete ako súkromná osoba alebo firma.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
          {/* Typ účtu */}
          <section>
            <label className="text-sm font-semibold text-neutral-800">Typ účtu</label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as "PERSON" | "COMPANY");
                setVatPayer(false);
                setIsSzco(false);
                setSameAddress(false);
              }}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#FFAE00]"
            >
              <option value="PERSON">Súkromná osoba</option>
              <option value="COMPANY">Firma</option>
            </select>
          </section>

          {/* Osobné údaje */}
          <section>
            <SectionTitle>Osobné údaje</SectionTitle>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input label="Meno a priezvisko" value={payload.name} onChange={v => set("name", v)} error={errors.name} required />
              <Input label="E-mail" type="email" value={payload.email} onChange={v => set("email", v)} error={errors.email} required />
              <Input label="Telefónne číslo" type="tel" value={payload.phone} onChange={v => set("phone", v)} error={errors.phone} required />
              <Input label="Heslo" type="password" value={payload.password} onChange={v => set("password", v)} error={errors.password} required />
            </div>
          </section>

          {/* DPH */}
          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={vatPayer}
                onChange={(e) => setVatPayer(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#FFAE00]"
              />
              <div>
                <div className="text-sm font-bold text-neutral-900">Som platca DPH</div>
                <div className="mt-1 text-xs leading-relaxed text-neutral-600">
                  Ak ste platca DPH, pri firemnom účte vyplňte aj IČ DPH.
                </div>
              </div>
            </label>
          </section>

          {/* SZČO — len pre súkromné osoby */}
          {accountType === "PERSON" && (
            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSzco}
                  onChange={(e) => setIsSzco(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#FFAE00]"
                />
                <div>
                  <div className="text-sm font-bold text-neutral-900">Som živnostník / SZČO</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    Vyplňte IČO a DIČ ak potrebujete faktúru na živnosť.
                  </div>
                </div>
              </label>
              {isSzco && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input label="IČO" value={payload.ico} onChange={v => set("ico", v)} />
                  <Input label="DIČ" value={payload.dic} onChange={v => set("dic", v)} />
                  {vatPayer && (
                    <Input label="IČ DPH" value={payload.icDph} onChange={v => set("icDph", v)} />
                  )}
                </div>
              )}
            </section>
          )}

          {/* Firemné údaje — len pre firmy */}
          {accountType === "COMPANY" && (
            <section>
              <SectionTitle>Firemné údaje</SectionTitle>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="Názov spoločnosti" value={payload.companyName} onChange={v => set("companyName", v)} error={errors.companyName} required />
                <Input label="Kontaktná osoba" value={payload.contactPerson} onChange={v => set("contactPerson", v)} error={errors.contactPerson} required />
                <Input label="IČO" value={payload.ico} onChange={v => set("ico", v)} error={errors.ico} required />
                <Input label="DIČ" value={payload.dic} onChange={v => set("dic", v)} />
                {vatPayer && <Input label="IČ DPH" value={payload.icDph} onChange={v => set("icDph", v)} error={errors.icDph} required />}
              </div>
            </section>
          )}

          {/* Fakturačná adresa — vždy viditeľná */}
          <section>
            <SectionTitle>Fakturačná adresa</SectionTitle>
            {accountType === "PERSON" && (
              <p className="mb-3 mt-1 text-xs text-neutral-500">
                Adresa pre faktúry. Ak je rovnaká ako doručovacia, môžete ju nechať prázdnu — použije sa doručovacia adresa.
              </p>
            )}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input label="Ulica a číslo" value={payload.billingStreet} onChange={v => set("billingStreet", v)} error={errors.billingStreet} required={accountType === "COMPANY"} />
              <Input label="Mesto" value={payload.billingCity} onChange={v => set("billingCity", v)} error={errors.billingCity} required={accountType === "COMPANY"} />
              <Input label="PSČ" value={payload.billingZip} onChange={v => set("billingZip", v)} error={errors.billingZip} required={accountType === "COMPANY"} />
              <Input label="Krajina" value={payload.billingCountry} onChange={v => set("billingCountry", v)} />
            </div>
          </section>

          {/* Dodacia / Doručovacia adresa */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>
                {accountType === "COMPANY" ? "Dodacia adresa" : "Doručovacia adresa"}
              </SectionTitle>
              <button
                type="button"
                onClick={() => {
                  const next = !sameAddress;
                  setSameAddress(next);
                  if (next) {
                    set("shippingStreet", payload.billingStreet);
                    set("shippingCity", payload.billingCity);
                    set("shippingZip", payload.billingZip);
                    set("shippingCountry", payload.billingCountry);
                  }
                }}
                className={[
                  "rounded-full border px-4 py-2 text-xs font-bold transition",
                  sameAddress
                    ? "border-[#FFAE00] bg-[#FFAE00] text-black"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
              >
                {sameAddress ? "✓ Rovnaká ako fakturačná" : "Skopírovať z fakturačnej"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {accountType === "COMPANY" && (
                <>
                  <Input label="Názov / firma" value={payload.shippingName} onChange={v => set("shippingName", v)} />
                  <Input label="Kontaktná osoba" value={payload.shippingContact} onChange={v => set("shippingContact", v)} />
                </>
              )}
              <Input
                label="Ulica a číslo"
                value={payload.shippingStreet}
                onChange={v => set("shippingStreet", v)}
                disabled={sameAddress}
                error={errors.shippingStreet}
                required
              />
              <Input
                label="Mesto"
                value={payload.shippingCity}
                onChange={v => set("shippingCity", v)}
                disabled={sameAddress}
                error={errors.shippingCity}
                required
              />
              <Input
                label="PSČ"
                value={payload.shippingZip}
                onChange={v => set("shippingZip", v)}
                disabled={sameAddress}
                error={errors.shippingZip}
                required
              />
              <Input
                label="Krajina"
                value={payload.shippingCountry}
                onChange={v => set("shippingCountry", v)}
                disabled={sameAddress}
                required
              />
            </div>
          </section>

          {errors._form && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              ⚠ {errors._form}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Vytváram účet…" : "Registrovať sa"}
          </button>

          <p className="text-center text-sm text-neutral-600">
            Už máte účet?{" "}
            <Link href="/prihlasenie" className="font-semibold underline">
              Prihláste sa
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-extrabold text-neutral-900">{children}</h2>;
}

function Input({
  label, type = "text", required = false, disabled = false,
  value, onChange, error,
}: {
  label: string; type?: string; required?: boolean; disabled?: boolean;
  value: string; onChange?: (v: string) => void; error?: string;
}) {
  return (
    <label className="block" data-error={error ? true : undefined}>
      <div className="mb-2 text-sm font-semibold text-neutral-800">
        {label}
        {required && <span className="ml-1 text-[#FFAE00]">*</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        className={[
          "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
          "disabled:bg-neutral-100 disabled:text-neutral-400",
          error
            ? "border-red-400 bg-red-50 focus:border-red-500"
            : "border-neutral-200 focus:border-[#FFAE00]",
        ].join(" ")}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
          <span>⚠</span> {error}
        </p>
      )}
    </label>
  );
}
