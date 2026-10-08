"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STORAGE_KEY = "vytlacto3d:complete-profile-last-seen";
const SHOW_AFTER_MS = 20_000;
const COOLDOWN_HOURS = 24; // „občas“ — najviac raz za deň
// Na týchto stránkach okno nedáva zmysel (účet má vlastnú výzvu) alebo by rušilo.
const HIDDEN_ON = ["/ucet", "/registracia", "/prihlasenie", "/admin", "/success", "/cancel"];

function shouldShow() {
  try {
    const t = Number(window.localStorage.getItem(STORAGE_KEY));
    return !t || !Number.isFinite(t) || (Date.now() - t) / 3_600_000 >= COOLDOWN_HOURS;
  } catch {
    return true;
  }
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Po rýchlej registrácii (meno, e-mail, telefón, heslo) občas pripomenie,
 * že na úplnú registráciu chýba adresa, prípadne firemné údaje.
 */
export default function CompleteProfilePopup() {
  const { status } = useSession();
  const pathname = usePathname() ?? "/";
  const [missing, setMissing] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (status !== "authenticated" || hiddenHere) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (!shouldShow()) return;
      try {
        const res = await fetch("/api/account/me");
        const data = res.ok ? await res.json() : null;
        const fields: string[] = Array.isArray(data?.missingFields) ? data.missingFields : [];
        if (!cancelled && fields.length) {
          setMissing(fields);
          setVisible(true);
        }
      } catch {}
    }, SHOW_AFTER_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [status, hiddenHere]);

  function doClose() {
    if (closing) return;
    setClosing(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    window.setTimeout(() => { setVisible(false); setClosing(false); }, 350);
  }

  useEffect(() => {
    if (!visible) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") doClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  if (!visible || hiddenHere) return null;

  return (
    <>
      <div
        className={[
          "fixed bottom-6 left-6 z-[89] w-[calc(100%-48px)] max-w-[400px]",
          closing
            ? "animate-[profileNudgeOut_0.35s_ease-in_forwards]"
            : "animate-[profileNudgeIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
        ].join(" ")}
      >
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.13),0_0_0_1px_rgba(0,0,0,0.05)]">
          <div className="bg-neutral-900 px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFAE00] text-lg">
                  📝
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">
                    Váš účet
                  </div>
                  <div className="text-[15px] font-extrabold leading-snug text-white">
                    Dokončite kompletnú registráciu
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={doClose}
                aria-label="Zatvoriť"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7">
                  <line x1="1" y1="1" x2="9" y2="9" />
                  <line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 pt-5 pb-6">
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Zaregistrovali ste sa rýchlo — ešte nám chýba:
            </p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {missing.map((f) => (
                <li key={f} className="rounded-full bg-[#FFAE00]/15 px-2.5 py-1 text-[12px] font-semibold text-neutral-800">
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-start gap-2 text-[13px] text-neutral-700">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FFAE00] text-black">
                <IconCheck />
              </span>
              Pri objednávke potom nič nevypisujete — adresu predvyplníme za vás.
            </div>

            <div className="mt-5 flex gap-2">
              <Link
                href="/ucet?dokoncit=1#upravit-udaje"
                onClick={doClose}
                className="flex-1 rounded-xl bg-[#FFAE00] px-4 py-2.5 text-center text-[13px] font-extrabold text-black transition hover:bg-[#e09d00]"
              >
                Dokončiť registráciu
              </Link>
              <button
                type="button"
                onClick={doClose}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Neskôr
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes profileNudgeIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes profileNudgeOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    }
          100% { opacity: 0; transform: translateY(14px) scale(0.96); }
        }
      `}</style>
    </>
  );
}
