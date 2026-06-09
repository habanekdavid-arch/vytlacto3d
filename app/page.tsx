"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import UploadBox from "@/components/UploadBox";
import Configurator, { ConfigState } from "@/components/Configurator";
import StlViewer from "@/components/StlViewer";
import MaterialPricing from "@/components/MaterialPricing";
import HowItWorks from "@/components/HowItWorks";
import FaqPreview from "@/components/FaqPreview";
import FloatingCta from "@/components/FloatingCta";
import ModelSummaryBar from "@/components/ModelSummaryBar";
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

type PacketaPoint = {
  id: string;
  name: string;
  nameStreet: string;
  city: string;
  zip: string;
  country: string;
};

type Quote = {
  gramsPerPart: number;
  printTimeMinPerPart: number;
  materialCostPerPart: number;
  machineCostPerPart: number;
  subtotalPerPart: number;

  setupFee: number;
  productionSubtotal: number;
  quantityDiscountPct: number;
  quantityDiscountAmount: number;

  total: number;
};

export default function Home() {
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [latestQuote, setLatestQuote] = useState<Quote | null>(null);
  const [latestConfig, setLatestConfig] = useState<ConfigState | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"packeta" | "courier">("packeta");
  const [packetaPoint, setPacketaPoint] = useState<PacketaPoint | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://widget.packeta.com/v6/www/js/library.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  function openPacketaWidget() {
    const w = window as any;
    if (!w.Packeta?.Widget?.pick) {
      alert("Widget sa ešte načítava, skúste o chvíľu.");
      return;
    }
    w.Packeta.Widget.pick(
      "7953395f61a129cf",
      (point: PacketaPoint | null) => { if (point) setPacketaPoint(point); },
      { country: "sk", language: "sk" }
    );
  }

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
        body: JSON.stringify({
          uploaded,
          config: latestConfig,
          deliveryMethod,
          packetaPoint: deliveryMethod === "packeta" ? packetaPoint : null,
        }),
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

  const scaleFactor = (latestConfig?.scalePct ?? 100) / 100;

  const scaledAnalysis = useMemo(() => {
    if (!uploaded?.analysis) return null;

    return {
      dimsXmm: uploaded.analysis.dimsXmm * scaleFactor,
      dimsYmm: uploaded.analysis.dimsYmm * scaleFactor,
      dimsZmm: uploaded.analysis.dimsZmm * scaleFactor,
      volumeCm3: uploaded.analysis.volumeCm3 * Math.pow(scaleFactor, 3),
    };
  }, [uploaded, scaleFactor]);

  const totalWithVat = formatPriceWithVat(latestQuote?.total ?? null);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
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
          </div>

          {scaledAnalysis ? (
            <div className="mt-6">
              <ModelSummaryBar
                dimsX={scaledAnalysis.dimsXmm}
                dimsY={scaledAnalysis.dimsYmm}
                dimsZ={scaledAnalysis.dimsZmm}
                volume={scaledAnalysis.volumeCm3}
                totalWithVat={totalWithVat}
              />
            </div>
          ) : null}

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
                  key={`${uploaded.fileKey}-${latestConfig?.scalePct ?? 100}-${latestConfig?.color ?? "black"}`}
                  fileKey={uploaded.fileKey}
                  title="Model sa dá otáčať a zoomovať"
                  colorId={latestConfig?.color ?? "black"}
                  height={380}
                  scalePct={latestConfig?.scalePct ?? 100}
                />
              </div>
            </div>
          ) : null}

          {scaledAnalysis ? (
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
                  analysis={{
                    volumeCm3: scaledAnalysis.volumeCm3,
                    dimsXmm: uploaded?.analysis.dimsXmm,
                    dimsYmm: uploaded?.analysis.dimsYmm,
                    dimsZmm: uploaded?.analysis.dimsZmm,
                  }}
                  onQuote={handleQuote}
                />
              </div>
            </div>
          ) : null}

          {/* Krok 4 — doručenie */}
          {scaledAnalysis && latestQuote ? (
            <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                  4
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-500">Krok 4</div>
                  <div className="text-lg font-extrabold">Vyberte spôsob doručenia</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* Packeta */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("packeta")}
                  className={[
                    "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-150",
                    deliveryMethod === "packeta"
                      ? "border-[#FFAE00] bg-[#FFAE00]/5"
                      : "border-neutral-200 bg-white hover:border-neutral-300",
                  ].join(" ")}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFAE00]/15">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#b07a00]">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-neutral-900">Packeta výdajňa / Z-Box</div>
                    <div className="mt-0.5 text-xs text-neutral-500">Vyzdvihnutie na výdajnom mieste · SK</div>
                    <div className="mt-1.5 text-sm font-extrabold text-neutral-900">3,99 €</div>
                  </div>
                  {deliveryMethod === "packeta" && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFAE00]">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>

                {/* Kuriér */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("courier")}
                  className={[
                    "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-150",
                    deliveryMethod === "courier"
                      ? "border-[#FFAE00] bg-[#FFAE00]/5"
                      : "border-neutral-200 bg-white hover:border-neutral-300",
                  ].join(" ")}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                      <rect x="1" y="3" width="15" height="13" rx="1"/>
                      <path d="M16 8h4l3 5v3h-7V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-neutral-900">Kuriér na adresu</div>
                    <div className="mt-0.5 text-xs text-neutral-500">Doručenie domov · SK</div>
                    <div className="mt-1.5 text-sm font-extrabold text-neutral-900">5,99 €</div>
                  </div>
                  {deliveryMethod === "courier" && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFAE00]">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              {/* Packeta widget výber */}
              {deliveryMethod === "packeta" && (
                <div className="mt-4">
                  {packetaPoint ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                      <svg className="shrink-0 text-green-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-neutral-900 truncate">{packetaPoint.name}</div>
                        <div className="text-xs text-neutral-600 truncate">{packetaPoint.nameStreet}, {packetaPoint.city}</div>
                      </div>
                      <button
                        type="button"
                        onClick={openPacketaWidget}
                        className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                      >
                        Zmeniť
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openPacketaWidget}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm font-semibold text-neutral-600 transition hover:border-[#FFAE00] hover:bg-[#FFAE00]/5 hover:text-neutral-900"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Vybrať výdajné miesto alebo Z-Box →
                    </button>
                  )}
                </div>
              )}

              {/* Objednať */}
              <div className="mt-6 space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#FFAE00]"
                  />
                  <span className="text-sm text-neutral-600">
                    Súhlasím so{" "}
                    <a
                      href="/podmienky"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-[#b07a00]"
                    >
                      všeobecnými obchodnými podmienkami
                    </a>
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={
                      !latestQuote || !latestConfig || orderLoading ||
                      (deliveryMethod === "packeta" && !packetaPoint) ||
                      !termsAccepted
                    }
                    onClick={payByCard}
                    className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {orderLoading ? "Presmerúvam…" : "Objednať a zaplatiť"}
                  </button>
                  <div className="text-xs text-neutral-500">
                    {deliveryMethod === "packeta"
                      ? "Fakturačná adresa sa zadáva pri platbe."
                      : "Adresa doručenia a platba v ďalšom kroku."}
                  </div>
                </div>
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