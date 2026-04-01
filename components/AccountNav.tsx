"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/ucet", label: "Môj účet" },
  { href: "/ucet/objednavky", label: "Moje objednávky" },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <aside className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-neutral-500">
        Zákaznícka zóna
      </div>

      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "rounded-2xl px-4 py-3 text-sm transition",
                active
                  ? "border border-[#FFAE00]/40 bg-[#FFAE00]/15 text-neutral-900"
                  : "border border-transparent text-neutral-700 hover:bg-neutral-50",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-2 rounded-2xl border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
        >
          Odhlásiť sa
        </button>
      </nav>
    </aside>
  );
}