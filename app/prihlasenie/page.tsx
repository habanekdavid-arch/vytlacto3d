"use client";

import Link from "next/link";
import { Suspense, FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 px-4 py-12">
          <div className="mx-auto max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-neutral-500">
              Zákaznícka zóna
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
              Prihlásenie
            </h1>
            <p className="mt-2 text-sm text-neutral-600">Načítavam…</p>
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(() => {
    return searchParams.get("callbackUrl") || "/ucet/objednavky";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!res) {
        setError("Prihlásenie sa nepodarilo. Skúste to znova.");
        setLoading(false);
        return;
      }

      if (res.error) {
        setError("Nesprávny email alebo heslo.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Prihlásenie sa nepodarilo. Skúste to znova.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-semibold text-neutral-500">
            Zákaznícka zóna
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
            Prihlásenie
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Prihláste sa a zobrazte si svoje objednávky, ich stav a históriu.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
                autoComplete="current-password"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-[#FFAE00]"
                placeholder="Vaše heslo"
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
            className="w-full rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Prihlasujem..." : "Prihlásiť sa"}
          </button>
        </form>

        <div className="mt-5 text-sm text-neutral-600">
          Nemáte účet?{" "}
          <Link
            href="/registracia"
            className="font-semibold text-neutral-900 underline underline-offset-4"
          >
            Vytvoriť účet
          </Link>
        </div>
      </div>
    </div>
  );
}