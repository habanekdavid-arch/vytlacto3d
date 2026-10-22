import { VAT_MULTIPLIER } from "@/lib/vat";
import { useT } from "@/lib/i18n/client";

export default function MaterialPricing() {
  const t = useT();
  const materials = [
    {
      key: "PLA",
      name: "PLA",
      eurPerGram: 12 / 1000,
      density: "1.24 g/cm³",
      use: "Vizuálne prototypy, prezentačné modely, univerzálne diely",
      dot: "bg-green-500",
    },
    {
      key: "PETG",
      name: "PETG",
      eurPerGram: 16 / 1000,
      density: "1.27 g/cm³",
      use: "Funkčné diely, vyššia odolnosť, vhodné aj do exteriéru",
      dot: "bg-blue-500",
    },
    {
      key: "ABS",
      name: "ABS",
      eurPerGram: 30 / 1000,
      density: "1.04 g/cm³",
      use: "Technické diely, teplotná odolnosť, pevnosť (náročnejšia tlač)",
      dot: "bg-gray-500",
    },
    {
      key: "PA6-CF",
      name: "PA6-CF",
      eurPerGram: 80 / 1000,
      density: "1.20 g/cm³",
      use: "Nylon s uhlíkovými vláknami: najpevnejšie a najtuhšie technické diely, odolnosť voči teplu (len čierna a biela)",
      dot: "bg-neutral-900",
    },
  ];

  return (
    <section id="cennik" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
          {t("Cenník materiálov")}
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-center text-neutral-600">
          {t("Transparentné ceny pre materiály v konfigurátore. Konečná cena závisí aj od času tlače, kvality a pevnosti.")}
        </p>

        <div className="mt-12 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr className="text-sm font-semibold text-neutral-600">
                  <th className="px-6 py-4">{t("Materiál")}</th>
                  <th className="px-6 py-4">{t("Cena/gram")}</th>
                  <th className="px-6 py-4">{t("Hustota")}</th>
                  <th className="px-6 py-4">{t("Aplikácie")}</th>
                </tr>
              </thead>

              <tbody>
                {materials.map((m) => (
                  <tr
                    key={m.key}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 flex-none rounded-full ${m.dot}`} />

                        <div className="whitespace-nowrap font-semibold text-neutral-900">
                          {m.name}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 font-semibold text-[#FFAE00]">
                      {(m.eurPerGram * VAT_MULTIPLIER).toFixed(3)} €
                    </td>

                    <td className="px-6 py-5 text-neutral-700">
                      {m.density}
                    </td>

                    <td className="px-6 py-5 text-neutral-600">
                      {t(m.use)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-1 text-sm text-neutral-500">
          <div>
            {t("Poznámka: Cena/gram vychádza z ceny rolky (1 kg) nastavenej v kalkulácii.")}
          </div>

          <div>
            {t("Všetky uvedené ceny sú vrátane DPH.")}
          </div>
        </div>
      </div>
    </section>
  );
}