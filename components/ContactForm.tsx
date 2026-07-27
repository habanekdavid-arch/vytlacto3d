"use client";

import { useState } from "react";

const inputClasses =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 hover:border-neutral-300 focus:border-[#FFAE00] focus:outline-none focus:ring-4 focus:ring-[#FFAE00]/15";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
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
        body: JSON.stringify({ name, email, subject, message, website }),
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
      setSubject("");
      setMessage("");
    } catch {
      setError("Sieťová chyba. Skúste to prosím znova.");
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="relative mt-12 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#FFAE00]/10 blur-3xl" />
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-2xl text-white">
            ✓
          </div>
          <div className="mt-4 text-lg font-bold text-neutral-900">Ďakujeme za správu!</div>
          <p className="mt-2 text-sm text-neutral-600">
            Ozveme sa vám čo najskôr na uvedený email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/card relative mt-12 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#FFAE00]/30 hover:shadow-xl hover:shadow-[#FFAE00]/10 sm:p-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-[#FFAE00]/10 blur-3xl transition-opacity duration-300 group-hover/card:opacity-70" />
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
          Napíšte nám
        </div>

        <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
          Nenašli ste odpoveď?
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Napíšte nám priamo cez formulár nižšie, odpovieme vám čo najskôr.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
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
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-1">
          <label className="text-sm font-semibold text-neutral-700">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">Predmet *</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">Správa *</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClasses}
          />
        </div>

        {status === "error" && error && (
          <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-center sm:col-span-2">
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-2xl bg-[#FFAE00] px-8 py-3 text-sm font-bold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFAE00]/30 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {status === "sending" ? "Odosielam..." : "Odoslať správu"}
          </button>
        </div>
      </form>
    </div>
  );
}
