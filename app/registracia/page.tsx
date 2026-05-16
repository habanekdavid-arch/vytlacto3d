"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"PERSON" | "COMPANY">("PERSON");
  const [vatPayer, setVatPayer] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [loading, setLoading] = useState(false);

  function copyBillingToShipping(form: HTMLFormElement) {
    const billingStreet = form.elements.namedItem("billingStreet") as HTMLInputElement | null;
    const billingCity = form.elements.namedItem("billingCity") as HTMLInputElement | null;
    const billingZip = form.elements.namedItem("billingZip") as HTMLInputElement | null;
    const billingCountry = form.elements.namedItem("billingCountry") as HTMLInputElement | null;

    const shippingStreet = form.elements.namedItem("shippingStreet") as HTMLInputElement | null;
    const shippingCity = form.elements.namedItem("shippingCity") as HTMLInputElement | null;
    const shippingZip = form.elements.namedItem("shippingZip") as HTMLInputElement | null;
    const shippingCountry = form.elements.namedItem("shippingCountry") as HTMLInputElement | null;

    if (shippingStreet && billingStreet) shippingStreet.value = billingStreet.value;
    if (shippingCity && billingCity) shippingCity.value = billingCity.value;
    if (shippingZip && billingZip) shippingZip.value = billingZip.value;
    if (shippingCountry && billingCountry) shippingCountry.value = billingCountry.value;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formElement = e.currentTarget;

    if (sameAddress) {
      copyBillingToShipping(formElement);
    }

    const form = new FormData(formElement);

    const payload = {
      accountType,
      vatPayer,

      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      phone: String(form.get("phone") || ""),

      companyName: String(form.get("companyName") || ""),
      ico: String(form.get("ico") || ""),
      dic: String(form.get("dic") || ""),
      icDph: vatPayer ? String(form.get("icDph") || "") : "",
      contactPerson: String(form.get("contactPerson") || ""),

      billingStreet: String(form.get("billingStreet") || ""),
      billingCity: String(form.get("billingCity") || ""),
      billingZip: String(form.get("billingZip") || ""),
      billingCountry: String(form.get("billingCountry") || "Slovensko"),

      shippingName: String(form.get("shippingName") || ""),
      shippingContact: String(form.get("shippingContact") || ""),
      shippingStreet: String(form.get("shippingStreet") || ""),
      shippingCity: String(form.get("shippingCity") || ""),
      shippingZip: String(form.get("shippingZip") || ""),
      shippingCountry: String(form.get("shippingCountry") || "Slovensko"),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Registrácia zlyhala.");
        return;
      }

      router.push("/prihlasenie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Registrácia</div>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Vytvoriť účet
        </h1>

        <p className="mt-2 text-sm text-neutral-600">
          Vyberte, či sa registrujete ako súkromná osoba alebo firma.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <section>
            <label className="text-sm font-semibold text-neutral-800">
              Typ účtu
            </label>

            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as "PERSON" | "COMPANY");
                setVatPayer(false);
                setSameAddress(false);
              }}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
            >
              <option value="PERSON">Súkromná osoba</option>
              <option value="COMPANY">Firma</option>
            </select>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Input name="name" label="Meno a priezvisko" required />
            <Input name="email" label="E-mail" type="email" required />
            <Input name="phone" label="Telefónne číslo" required />
            <Input name="password" label="Heslo" type="password" required />
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={vatPayer}
                onChange={(e) => setVatPayer(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#FFAE00]"
              />
              <div>
                <div className="text-sm font-bold text-neutral-900">
                  Som platca DPH
                </div>
                <div className="mt-1 text-xs leading-relaxed text-neutral-600">
                  Ak ste platca DPH, pri firemnom účte vyplňte aj IČ DPH.
                </div>
              </div>
            </label>
          </section>

          {accountType === "COMPANY" ? (
            <>
              <section>
                <h2 className="text-xl font-bold">Firemné údaje</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input name="companyName" label="Názov spoločnosti" required />
                  <Input name="contactPerson" label="Kontaktná osoba" required />
                  <Input name="ico" label="IČO" required />
                  <Input name="dic" label="DIČ" />
                  {vatPayer ? (
                    <Input name="icDph" label="IČ DPH" required />
                  ) : null}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold">Fakturačná adresa</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input name="billingStreet" label="Ulica" required />
                  <Input name="billingCity" label="Mesto" required />
                  <Input name="billingZip" label="PSČ" required />
                  <Input
                    name="billingCountry"
                    label="Krajina"
                    defaultValue="Slovensko"
                    required
                  />
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">Dodacia adresa</h2>

                  <button
                    type="button"
                    onClick={(e) => {
                      const form = e.currentTarget.form;
                      if (!form) return;

                      const nextValue = !sameAddress;
                      setSameAddress(nextValue);

                      if (nextValue) {
                        copyBillingToShipping(form);
                      }
                    }}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-bold transition",
                      sameAddress
                        ? "border-[#FFAE00] bg-[#FFAE00] text-black"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    {sameAddress
                      ? "Používam rovnakú adresu"
                      : "Použiť fakturačnú adresu"}
                  </button>
                </div>

                <p className="mt-2 text-sm text-neutral-500">
                  Ak je dodacia adresa rovnaká ako fakturačná, kliknite na tlačidlo vyššie.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input name="shippingName" label="Názov / firma" />
                  <Input name="shippingContact" label="Kontaktná osoba" />
                  <Input
                    name="shippingStreet"
                    label="Ulica"
                    disabled={sameAddress}
                  />
                  <Input
                    name="shippingCity"
                    label="Mesto"
                    disabled={sameAddress}
                  />
                  <Input
                    name="shippingZip"
                    label="PSČ"
                    disabled={sameAddress}
                  />
                  <Input
                    name="shippingCountry"
                    label="Krajina"
                    defaultValue="Slovensko"
                    disabled={sameAddress}
                  />
                </div>
              </section>
            </>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
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

function Input({
  name,
  label,
  type = "text",
  required = false,
  defaultValue = "",
  disabled = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-neutral-800">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#FFAE00] disabled:bg-neutral-100 disabled:text-neutral-500"
      />
    </label>
  );
}