export const dynamic = "force-dynamic";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import AccountNav from "@/components/AccountNav";
import { getSafeServerSession } from "@/lib/session";


export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSafeServerSession();
  const user = session?.user as { id?: string } | undefined;

  if (!user?.id) {
    redirect("/prihlasenie");
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
            Zákaznícka zóna
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
            Môj účet
          </h1>

          <p className="mt-2 max-w-2xl text-neutral-600">
            Tu nájdete svoje objednávky, ich stav a históriu.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AccountNav />
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}