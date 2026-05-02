"use client";

import Link from "next/link";
import Image from "next/image";
import AccountButton from "@/components/AccountButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* LOGO */}
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
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-5">
          <AccountButton />

          <a
            href="https://www.4from.media/?gad_source=1&gad_campaignid=19807682290&gbraid=0AAAAADyxKkmMGj88OWosPHyErFm4ryOiJ"
            target="_blank"
            rel="noreferrer"
            className="hidden opacity-80 transition hover:opacity-100 lg:block"
          >
            <Image
              src="/4from-media.png"
              alt="4from media"
              width={150}
              height={42}
              className="h-auto w-[150px]"
            />
          </a>
        </div>
      </div>
    </header>
  );
}