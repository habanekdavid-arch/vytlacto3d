"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json().catch(() => null);

    setLoading(false);

    if (!res.ok) {
      setError(data?.error || "Registrácia zlyhala.");
      return;
    }

    router.push("/prihlasenie");
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-semibold text-neutral-500">
            Zákaznícka zóna
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
            Registrácia
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Vytvorte si účet a získajte prístup k svojim objednávkam.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Meno
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]"
              placeholder="Vaše meno"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]"
              placeholder="vas@email.sk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Heslo
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-[#FFAE00]"
                placeholder="Minimálne 6 znakov"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-500 transition hover:text-neutral-800"
              >
                {showPassword ? "Skryť" : "Zobraziť"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Vytváram účet..." : "Vytvoriť účet"}
          </button>
        </form>

        <div className="mt-5 text-sm text-neutral-600">
          Už máte účet?{" "}
          <Link
            href="/prihlasenie"
            className="font-semibold text-neutral-900 underline underline-offset-4"
          >
            Prihlásiť sa
          </Link>
        </div>
      </div>
    </div>
  );
}