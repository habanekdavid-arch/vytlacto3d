"use client";

import Link from "next/link";
import AccountButton from "@/components/AccountButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
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
        <div className="flex items-center">
          <AccountButton />
        </div>
      </div>
    </header>
  );
}