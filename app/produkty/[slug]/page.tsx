import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StlViewer from "@/components/StlViewer";
import { getColor } from "@/lib/color-hex";
import { MulticolorBadge } from "@/components/ProductCard";
import { COLOR_LABELS } from "@/lib/print-options";
import { MULTICOLOR_FEE_EUR, distinctColors, isMulticolor } from "@/lib/multicolor";
import { addVat, formatEur } from "@/lib/vat";
import { PRODUCTS, getProduct, productModelFee } from "@/content/produkty";
import { getT } from "@/lib/i18n/server";
import { getProductsWithImages } from "@/lib/product-images";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = (await getProductsWithImages()).find((p) => p.slug === slug);
  if (!product) return {};
  const { t } = await getT();
  return {
    title: `${t(product.name)} – ${t("3D tlač na mieru")}`,
    description: t(product.description),
    openGraph: { images: [product.image] },
  };
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 6.5l2.2 2.2 4.8-5" />
    </svg>
  );
}

export default async function ProduktPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const { t } = await getT();

  const partColors = product.defaults?.partColors;
  const multicolor = isMulticolor(partColors);
  const options = [
    ...(multicolor
      ? [t("Farbu každého dielu (najviac 4 farby)")]
      : [t("Materiál PLA, PETG, ABS alebo PA6-CF"), t("8 farieb")]),
    t("Kvalita tlače"),
    t("Výplň (pevnosť)"),
    t("Veľkosť v percentách"),
    t("Počet kusov so zľavou"),
  ];
  const others = (await getProductsWithImages()).filter((p) => p.slug !== product.slug);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/produkty" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900">
        ← {t("Všetky produkty")}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <StlViewer
          fileKey={product.file}
          title={t("Model sa dá otáčať a zoomovať")}
          colorId={product.defaults?.color ?? "gray"}
          partColors={multicolor ? partColors : undefined}
          partLegend={false}
          height={420}
        />

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-neutral-800">
              {t(product.category)}
            </span>
            {multicolor && <MulticolorBadge label={t("Viacfarebný")} />}
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">{t(product.name)}</h1>
          <p className="mt-2 text-lg text-neutral-600">{t(product.subtitle)}</p>
          <p className="mt-5 leading-relaxed text-neutral-700">{t(product.description)}</p>

          <ul className="mt-6 space-y-2">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckIcon />
                </span>
                {t(h)}
              </li>
            ))}
          </ul>

          {multicolor && (
            <div className="mt-6 rounded-2xl border border-[#FFAE00] bg-[#FFAE00]/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-neutral-900">{t("Viacfarebná tlač z PLA")}</div>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-neutral-700">
                  +{formatEur(addVat(MULTICOLOR_FEE_EUR))}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {distinctColors(partColors).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-900">
                    <span
                      className={["h-3 w-3 rounded-full", id === "white" ? "border border-neutral-300" : ""].join(" ")}
                      style={{ background: getColor(id) }}
                    />
                    {t(COLOR_LABELS[id] ?? id)}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                {t("Každý diel tlačíme vo vlastnej farbe. V konfigurátore ich kýblikom v 3D náhľade zmeníte podľa seba.")}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-sm font-extrabold text-neutral-900">{t("V konfigurátore si nastavíte")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((o) => (
                <span key={o} className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
                  {o}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-neutral-500">
              {t("Rozmery pri 100 %:")} <strong>{product.dimsMm.join(" × ")} mm</strong>
            </div>
          </div>

          <Link
            href={`/?produkt=${product.slug}#kalkulator`}
            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-[#FFAE00] px-6 py-4 text-base font-extrabold text-black shadow-sm transition hover:bg-[#e09d00] sm:w-auto sm:inline-flex"
          >
            {t("Prispôsobiť a objednať")}
          </Link>
          <p className="mt-2 text-xs text-neutral-500">
            {t("Cenu uvidíte hneď v konfigurátore, ešte pred objednávkou.")}
            {productModelFee(product) > 0 &&
              " " + t("K cene výtlačku sa pripočíta poplatok za model {fee} s DPH.", { fee: formatEur(addVat(productModelFee(product))) })}
          </p>
        </section>
      </div>

      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold text-neutral-900">{t("Ďalšie produkty")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/produkty/${p.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-3 transition hover:shadow-md"
              >
                <div className="relative h-20 w-20 flex-none overflow-hidden rounded-xl bg-neutral-100">
                  <Image src={p.image} alt={t(p.name)} fill sizes="80px" className="object-cover" />
                </div>
                <div>
                  <div className="font-extrabold text-neutral-900 group-hover:underline">{t(p.name)}</div>
                  <div className="text-xs text-neutral-500">{t(p.subtitle)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
