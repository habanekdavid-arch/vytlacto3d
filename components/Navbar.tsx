"use client";

import Link from "next/link";
import AccountButton from "@/components/AccountButton";
import { useCartUi } from "@/lib/cart-ui-context";

export default function Navbar() {
  const { cartCount, openCart } = useCartUi();

  return (
    <header className="sticky top-0 z-50 bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* LEFT */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
            3D
          </div>

          <div>
            <div className="text-sm font-bold text-neutral-900">
              VytlačTo3D
            </div>

            <div className="text-xs text-neutral-500">
              Online konfigurátor 3D tlače
            </div>
          </div>
        </Link>

        {/* CENTER NAVIGATION */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <Link
            href="/#kalkulator"
            className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
          >
            Kalkulátor
          </Link>

          <Link
            href="/#cennik"
            className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
          >
            Cenník
          </Link>

          <Link
            href="/realizacie"
            className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
          >
            Realizácie
          </Link>

          <Link
            href="/#faq"
            className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
          >
            FAQ
          </Link>

          <Link
            href="/blog"
            className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
          >
            Blog
          </Link>

          <a
            href="https://www.4from.media/?gad_source=1&gad_campaignid=21391373681&gbraid=0AAAAADyxKkl3uOWw6VN6UM8ekC4FAegi_"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
          >
            4from media
          </a>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {cartCount > 0 && (
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-[#FFAE00] hover:shadow-md"
              aria-label="Otvoriť košík"
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
          <AccountButton />
        </div>
      </div>
    </header>
  );
}