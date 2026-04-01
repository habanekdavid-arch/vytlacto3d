"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export default function AccountButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-500">
        <span className="inline-flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-neutral-100" />
        <span className="hidden sm:inline">Načítavam...</span>
      </div>
    );
  }

  if (session?.user) {
    const initial =
      session.user.name?.trim()?.charAt(0)?.toUpperCase() ||
      session.user.email?.trim()?.charAt(0)?.toUpperCase() ||
      "U";

    return (
      <Link
        href="/ucet/objednavky"
        className="inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFAE00] text-sm font-bold text-black">
          {initial}
        </span>
        <span className="hidden sm:inline">Môj účet</span>
      </Link>
    );
  }

  return (
    <Link
      href="/prihlasenie"
      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFAE00]/15 text-[#FFAE00]">
        <UserIcon />
      </span>
      <span className="hidden sm:inline">Prihlásiť sa</span>
    </Link>
  );
}