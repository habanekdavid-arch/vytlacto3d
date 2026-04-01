"use client";

import Link from "next/link";
import AccountButton from "@/components/AccountButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
            3D
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900">VytlačTo3D</div>
            <div className="text-xs text-neutral-500">
              Online konfigurátor 3D tlače
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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
        </nav>

        <div className="flex items-center gap-3">
          <AccountButton />
        </div>
      </div>
    </header>
  );
}