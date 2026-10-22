import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { PRODUCTS } from "@/content/produkty";
import { getProductImageOverrides } from "@/lib/product-images";
import ProductImageEditor from "@/components/admin/ProductImageEditor";

export const dynamic = "force-dynamic";

export default async function AdminProduktyPage() {
  if (!(await isAdminSession())) redirect("/");
  const overrides = await getProductImageOverrides();

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Administrácia
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">Produkty — náhľadové obrázky</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Obrázok sa zobrazí na karte produktu v katalógu a na jeho detaile. Najlepšie vyzerá štvorcový obrázok
              (napr. 1200 × 1200 px) — na karte sa oreže na štvorec. Po prejdení myšou sa na karte ukáže 3D model.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/produkty" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              Zobraziť katalóg
            </Link>
            <Link href="/admin/orders" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              Objednávky
            </Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <section key={p.slug} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-extrabold text-neutral-900">{p.name}</div>
                <Link href={`/produkty/${p.slug}`} className="text-xs text-neutral-500 underline">
                  /produkty/{p.slug}
                </Link>
              </div>
              <ProductImageEditor slug={p.slug} name={p.name} image={overrides[p.slug] ?? p.image} defaultImage={p.image} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
