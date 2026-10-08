"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "complete-profile-banner-dismissed";
// Na týchto stránkach je výzva zbytočná (účet má vlastnú) alebo by rušila.
const HIDDEN_ON = ["/ucet", "/registracia", "/prihlasenie", "/admin", "/success", "/cancel"];

// Zavretý pás sa v tej istej karte prehliadača už neukáže.
function isDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Pás pod navbarom pre prihlásených po rýchlej registrácii — kým v profile
 * chýba adresa (príp. firemné údaje), pripomína dokončenie registrácie.
 */
export default function CompleteProfileBanner() {
  const { status } = useSession();
  const pathname = usePathname() ?? "/";
  const [missing, setMissing] = useState(0);
  const inAccount = pathname.startsWith("/ucet");

  // Znova načítať aj po odchode z účtu — údaje tam mohli byť práve doplnené.
  useEffect(() => {
    if (status !== "authenticated" || inAccount) return;
    let cancelled = false;
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setMissing(isDismissed() ? 0 : Array.isArray(data?.missingFields) ? data.missingFields.length : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, inAccount]);

  if (status !== "authenticated" || !missing) return null;
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <div className="border-b border-[#FFAE00]/30 bg-[#FFAE00]/10">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5 text-sm text-neutral-800">
        <span className="hidden h-2 w-2 shrink-0 rounded-full bg-[#FFAE00] sm:inline-block" />
        <p className="min-w-0 flex-1">
          <span className="font-bold">Dokončite registráciu</span>
          <span className="hidden sm:inline"> — doplňte adresu, aby sme ju pri objednávke vyplnili za vás.</span>
        </p>
        <Link
          href="/ucet?dokoncit=1#upravit-udaje"
          className="shrink-0 rounded-xl bg-[#FFAE00] px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-95"
        >
          Dokončiť
        </Link>
        <button
          type="button"
          aria-label="Zavrieť"
          onClick={() => {
            setMissing(0);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {}
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
