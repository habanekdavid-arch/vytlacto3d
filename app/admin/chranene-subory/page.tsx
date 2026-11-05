import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import ProtectFileDrop from "@/components/admin/ProtectFileDrop";

export const dynamic = "force-dynamic";

export default async function AdminChraneneSuboryPage() {
  if (!(await isAdminSession())) redirect("/");

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Administrácia
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">Chránené súbory</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Súbor sa zamkne do formátu <strong>.v3d</strong>. Ten sa nedá otvoriť v inom programe, slicery ani u inej
              tlačiarne — len nahrať do nášho konfigurátora. Model sa nemení a cena sa počíta rovnako ako z pôvodného
              súboru. V 3D náhľade konfigurátora je viditeľná značka VytlačTo3D (na vytlačenom modeli nie je).
            </p>
          </div>
          <Link href="/admin/orders" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
            ← Objednávky
          </Link>
        </div>
        <ProtectFileDrop />
      </div>
    </main>
  );
}
