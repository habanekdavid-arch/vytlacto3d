"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import AccountButton from "@/components/AccountButton";
import { useCartUi } from "@/lib/cart-ui-context";
import { useT } from "@/lib/i18n/client";
import LanguageSwitcher, { LanguageButtons } from "@/components/LanguageSwitcher";

const FOURFROM_URL =
  "https://www.4from.media/?gad_source=1&gad_campaignid=21391373681&gbraid=0AAAAADyxKkl3uOWw6VN6UM8ekC4FAegi_";

const LINKS = [
  { href: "/#kalkulator", label: "Kalkulátor" },
  { href: "/#cennik", label: "Cenník" },
  { href: "/realizacie", label: "Realizácie" },
  { href: "/komunita", label: "Komunita" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
];

export default function Navbar() {
  const { cartCount, openCart } = useCartUi();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* LEFT */}
        <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-80">
          <Image
            src="/logo-full.svg"
            alt="VytlačTo3D"
            width={6397}
            height={1530}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* CENTER NAVIGATION — v toku riadku, aby sa neprekrývalo s logom ani
            s pravou časťou (prepínač jazyka, účet) pri dlhších prekladoch. */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 whitespace-nowrap lg:flex xl:gap-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
            >
              {t(l.label)}
            </Link>
          ))}

          <a
            href={FOURFROM_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-neutral-700 transition hover:text-neutral-900 xl:inline"
          >
            4from media
          </a>
        </nav>

        {/* RIGHT */}
        <div className="flex shrink-0 items-center gap-3">
          {cartCount > 0 && (
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-[#FFAE00] hover:shadow-md"
              aria-label={t("Otvoriť košík")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FFAE00] px-1 text-xs font-bold text-black">
                {cartCount}
              </span>
            </button>
          )}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <AccountButton />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("Zavrieť menu") : t("Otvoriť menu")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-[#FFAE00] lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu pre mobil a tablet */}
      {menuOpen && (
        <nav className="border-t border-neutral-100 bg-white px-6 pb-4 pt-2 lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  {t(l.label)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={FOURFROM_URL}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl px-3 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
              >
                4from media
              </a>
            </li>
          </ul>
          <div className="mx-auto mt-2 max-w-7xl border-t border-neutral-100 px-3 pt-3 sm:hidden">
            <LanguageButtons />
          </div>
        </nav>
      )}
    </header>
  );
}