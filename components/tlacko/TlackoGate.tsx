"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/client";

// Lazy — nespomaľuje prvé vykreslenie (LCP).
const Tlacko = dynamic(() => import("@/components/tlacko/Tlacko"), { ssr: false });

/** Cesty bez chatu: administrácia a stránky po platbe (návrat zo Stripe). */
const HIDDEN = ["/admin", "/success", "/cancel"];

export default function TlackoGate() {
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  // Odpovede sú po slovensky — v iných jazykových verziách sa chat nezobrazí.
  if (locale !== "sk") return null;
  if (HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return <Tlacko />;
}
