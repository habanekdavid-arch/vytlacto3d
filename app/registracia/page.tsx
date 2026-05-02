"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"PERSON" | "COMPANY">("PERSON");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const payload = {
      accountType,
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      phone: String(form.get("phone") || ""),

      companyName: String(form.get("companyName") || ""),
      ico: String(form.get("ico") || ""),
      dic: String(form.get("dic") || ""),
      icDph: String(form.get("icDph") || ""),
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
              onChange={(e) =>
                setAccountType(e.target.value as "PERSON" | "COMPANY")
              }
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

          {accountType === "COMPANY" ? (
            <>
              <section>
                <h2 className="text-xl font-bold">Firemné údaje</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input name="companyName" label="Názov spoločnosti" required />
                  <Input name="contactPerson" label="Kontaktná osoba" required />
                  <Input name="ico" label="IČO" required />
                  <Input name="dic" label="DIČ" />
                  <Input name="icDph" label="IČ DPH" />
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold">Fakturačná adresa</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input name="billingStreet" label="Ulica" />
                  <Input name="billingCity" label="Mesto" />
                  <Input name="billingZip" label="PSČ" />
                  <Input name="billingCountry" label="Krajina" defaultValue="Slovensko" />
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold">Dodacia adresa</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input name="shippingName" label="Názov / firma" />
                  <Input name="shippingContact" label="Kontaktná osoba" />
                  <Input name="shippingStreet" label="Ulica" />
                  <Input name="shippingCity" label="Mesto" />
                  <Input name="shippingZip" label="PSČ" />
                  <Input name="shippingCountry" label="Krajina" defaultValue="Slovensko" />
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-neutral-800">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#FFAE00]"
      />
    </label>
  );
}