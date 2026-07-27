"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, website }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Niečo sa pokazilo. Skúste to prosím znova.");
        setStatus("error");
        return;
      }

      setStatus("ok");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setError("Sieťová chyba. Skúste to prosím znova.");
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-lg font-bold text-neutral-900">Ďakujeme za správu!</div>
          <p className="mt-2 text-sm text-neutral-600">
            Ozveme sa vám čo najskôr na uvedený email.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900">Nenašli ste odpoveď?</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Napíšte nám priamo cez formulár nižšie, odpovieme vám čo najskôr.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        <div className="sm:col-span-1">
          <label className="text-sm font-semibold text-neutral-700">Meno *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:border-[#FFAE00] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="text-sm font-semibold text-neutral-700">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:border-[#FFAE00] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">Telefón (nepovinné)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:border-[#FFAE00] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">Správa *</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:border-[#FFAE00] focus:outline-none"
          />
        </div>

        {status === "error" && error && (
          <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "Odosielam..." : "Odoslať správu"}
          </button>
        </div>
      </form>
    </section>
  );
}
