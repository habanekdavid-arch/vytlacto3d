import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { PRODUCTS } from "@/content/produkty";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return {
    title: t("Hotové 3D produkty na mieru | VytlačTo3D"),
    description: t(
      "Vyberte si hotový 3D model, prispôsobte materiál, farbu a veľkosť v konfigurátore a objednajte si ho ako výtlačok."
    ),
  };
}

export default async function ProduktyPage() {
  const { t } = await getT();
  const steps = [
    { n: 1, title: t("Vyberte produkt"), text: t("Hotový model, ktorý sme pre vás pripravili.") },
    { n: 2, title: t("Prispôsobte si ho"), text: t("Materiál, farba, kvalita, veľkosť aj počet kusov.") },
    { n: 3, title: t("Objednajte výtlačok"), text: t("Cenu vidíte hneď, vytlačíme a pošleme vám ho.") },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <section className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
          {t("Produkty")}
        </div>
        <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-neutral-900 md:text-6xl">
          {t("Hotové 3D produkty, ktoré si prispôsobíte")}
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-neutral-600">
          {t("Nemáte vlastný model? Vyberte si niektorý z našich, vložte ho do konfigurátora, nastavte si ho podľa seba a objednajte ako výtlačok.")}
        </p>
      </section>

      <ol className="mx-auto mb-12 grid max-w-4xl gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
            <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-black text-sm font-bold text-white">
              {s.n}
            </span>
            <div>
              <div className="text-sm font-extrabold text-neutral-900">{s.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-neutral-500">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p, i) => (
          <ProductCard key={p.slug} product={p} priority={i < 4} />
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-neutral-500">
        {t("Máte vlastný model?")}{" "}
        <Link href="/#kalkulator" className="font-semibold text-neutral-900 underline">
          {t("Nahrajte ho do kalkulátora")}
        </Link>
      </p>
    </main>
  );
}
