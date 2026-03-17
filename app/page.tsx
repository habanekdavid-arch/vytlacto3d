"use client";

import { useCallback, useState } from "react";
import Navbar from "@/components/Navbar";
import UploadBox from "@/components/UploadBox";
import Configurator, { ConfigState } from "@/components/Configurator";
import StlViewer from "@/components/StlViewer";
import MaterialPricing from "@/components/MaterialPricing";
import HowItWorks from "@/components/HowItWorks";
import FaqPreview from "@/components/FaqPreview";
import FloatingCta from "@/components/FloatingCta";
import { formatPriceWithVat } from "@/lib/vat";

type Uploaded = {
  fileKey: string;
  fileName: string;
  fileSize: number;
  analysis: {
    dimsXmm: number;
    dimsYmm: number;
    dimsZmm: number;
    volumeCm3: number;
  };
};

type Quote = {
  gramsPerPart: number;
  printTimeMinPerPart: number;
  materialCostPerPart: number;
  machineCostPerPart: number;
  subtotalPerPart: number;
  total: number;
};

export default function Home() {
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [latestQuote, setLatestQuote] = useState<Quote | null>(null);
  const [latestConfig, setLatestConfig] = useState<ConfigState | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const handleQuote = useCallback((q: Quote, cfg: ConfigState) => {
    setLatestQuote(q);
    setLatestConfig(cfg);
  }, []);

  async function payByCard() {
    if (!uploaded || !latestConfig) return;

    setOrderLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploaded, config: latestConfig }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        alert(data.error || "Stripe error");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Stripe session bez URL");
      }
    } finally {
      setOrderLoading(false);
    }
  }

  const totalWithVat = formatPriceWithVat(latestQuote?.total ?? null);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Navbar />
      <FloatingCta />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
            Online konfigurátor 3D tlače
          </div>

          <h1 className="mx-auto mt-5 max-w-5xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Nahrajte váš model, vyberte si parametre a my váš model dostaneme až k vám
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-neutral-600 md:text-lg">
            Nahrajte STL súbor, vyberte materiál, kvalitu, pevnosť, farbu a počet kusov.
            Systém automaticky vypočíta cenu a po dokončení objednávky vám model vyrobíme
            a odošleme priamo na adresu.
          </p>
        </section>

        <section
          id="kalkulator"
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-500">Konfigurátor</div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                Nahraj model a nastav parametre tlače
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Zákazník si vykliká parametre modelu a konfigurátor ich automaticky premietne do ceny.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
              <div className="text-neutral-500">Aktuálne</div>
              <div className="mt-1 text-lg font-extrabold">
                {totalWithVat}
              </div>
              <div className="text-xs text-neutral-500">
                Cena je uvedená s DPH
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                1
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-500">Krok 1</div>
                <div className="text-lg font-extrabold">Nahraj STL</div>
              </div>
            </div>

            <div className="mt-4">
              <UploadBox
                onUploadingChange={setUploadLoading}
                onUploaded={(u) => setUploaded(u)}
              />
            </div>

            {uploadLoading ? (
              <div className="mt-4 rounded-2xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FFAE00]" />
                  <div>
                    <div className="text-sm font-bold text-neutral-900">
                      Nahrávam a analyzujem model
                    </div>
                    <div className="text-xs text-neutral-600">
                      Počkajte chvíľu, pripravujeme 3D náhľad a výpočet parametrov.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {uploaded?.analysis ? (
              <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
                <div className="font-semibold text-neutral-900">Analýza modelu</div>
                <div className="mt-2 grid gap-2 text-neutral-700 md:grid-cols-2">
                  <div>
                    Rozmery (mm): {uploaded.analysis.dimsXmm.toFixed(1)} ×{" "}
                    {uploaded.analysis.dimsYmm.toFixed(1)} ×{" "}
                    {uploaded.analysis.dimsZmm.toFixed(1)}
                  </div>
                  <div>Objem (cm³): {uploaded.analysis.volumeCm3.toFixed(2)}</div>
                </div>
              </div>
            ) : null}
          </div>

          {uploaded?.analysis ? (
            <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                  2
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-500">Krok 2</div>
                  <div className="text-lg font-extrabold">3D náhľad</div>
                </div>
              </div>

              <div className="mt-4">
                <StlViewer
                  fileKey={uploaded.fileKey}
                  title="Model sa dá otáčať a zoomovať"
                  colorId={latestConfig?.color ?? "black"}
                  height={380}
                />
              </div>
            </div>
          ) : null}

          {uploaded?.analysis ? (
            <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-500">Krok 3</div>
                    <div className="text-lg font-extrabold">Nastav parametre tlače</div>
                  </div>
                </div>

                <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  aktuálne
                </div>
              </div>

              <div className="mt-4">
                <Configurator
                  analysis={{ volumeCm3: uploaded.analysis.volumeCm3 }}
                  onQuote={handleQuote}
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  disabled={!latestQuote || !latestConfig || orderLoading}
                  onClick={payByCard}
                  className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {orderLoading ? "Presmerúvam…" : "Objednať"}
                </button>

                <div className="text-xs text-neutral-500">
                  Poštovné a adresa sa vyberajú v ďalšom kroku v Stripe checkoute.
                </div>

                {latestQuote ? (
                  <div className="ml-auto text-right text-sm text-neutral-600">
                    <div>
                      Aktuálne:{" "}
                      <span className="font-extrabold text-neutral-900">
                        {totalWithVat}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      Všetky ceny sú uvedené s DPH
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <HowItWorks />
        <MaterialPricing />
        <FaqPreview />
      </main>
    </div>
  );
}