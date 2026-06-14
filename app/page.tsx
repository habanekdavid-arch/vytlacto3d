"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { status: sessionStatus } = useSession();

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

  async function payByTransfer() {
    if (!uploaded || !latestConfig) return;
    setOrderLoading(true);
    try {
      const res = await fetch("/api/order/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploaded,
          config: latestConfig,
          deliveryMethod,
          packetaPoint: deliveryMethod === "packeta" ? packetaPoint : null,
        }),
      });
      let data: any = null;
      try { data = await res.json(); } catch { data = { error: "Parse error" }; }
      if (!res.ok) { alert(data.error || "Chyba pri vytváraní objednávky"); return; }
      window.location.href = data.redirectUrl;
    } finally {
      setOrderLoading(false);
    }
  }

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

              {/* Spôsob platby */}
              <div className="mt-6">
                <div className="mb-3 text-sm font-extrabold text-neutral-800">Spôsob platby</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Karta */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={[
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-150",
                      paymentMethod === "CARD"
                        ? "border-[#FFAE00] bg-[#FFAE00]/5"
                        : "border-neutral-200 bg-white hover:border-neutral-300",
                    ].join(" ")}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFAE00]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-neutral-900">Platba kartou</div>
                      <div className="mt-0.5 text-xs text-neutral-500">Okamžité spracovanie cez Stripe</div>
                    </div>
                    {paymentMethod === "CARD" && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFAE00]">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Prevod */}
                  <button
                    type="button"
                    onClick={() => {
                      if (sessionStatus !== "authenticated") {
                        setShowTransferModal(true);
                      } else {
                        setPaymentMethod("TRANSFER");
                      }
                    }}
                    className={[
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-150",
                      paymentMethod === "TRANSFER"
                        ? "border-orange-400 bg-orange-50"
                        : "border-neutral-200 bg-white hover:border-neutral-300",
                    ].join(" ")}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M3 9h18"/>
                        <path d="M9 21V9"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-neutral-900">Platba prevodom</div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        Bankový prevod · IBAN SK
                        {sessionStatus !== "authenticated" && (
                          <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                            vyžaduje účet
                          </span>
                        )}
                      </div>
                    </div>
                    {paymentMethod === "TRANSFER" && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-400">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                </div>

                {paymentMethod === "TRANSFER" && (
                  <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                    Platobné údaje (IBAN, variabilný symbol, sumu) dostanete emailom. Výroba začne po prijatí platby na náš účet.
                  </div>
                )}
              </div>

              {/* Objednať */}
              <div className="mt-6 space-y-4">
                <label
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors duration-150",
                    termsAccepted
                      ? "border-[#FFAE00] bg-[#FFAE00]/5"
                      : "border-neutral-200 bg-white hover:border-neutral-300",
                  ].join(" ")}
                >
                  <div className={[
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150",
                    termsAccepted
                      ? "border-[#FFAE00] bg-[#FFAE00]"
                      : "border-neutral-300 bg-white",
                  ].join(" ")}>
                    {termsAccepted && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-sm leading-5 text-neutral-700">
                    Súhlasím so{" "}
                    <a
                      href="/podmienky"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
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
                    onClick={paymentMethod === "TRANSFER" ? payByTransfer : payByCard}
                    className={[
                      "rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
                      paymentMethod === "TRANSFER"
                        ? "bg-orange-500 text-white"
                        : "bg-[#FFAE00] text-black",
                    ].join(" ")}
                  >
                    {orderLoading
                      ? (paymentMethod === "TRANSFER" ? "Vytváram objednávku…" : "Presmerúvam…")
                      : (paymentMethod === "TRANSFER" ? "Objednať — zaplatiť prevodom" : "Objednať a zaplatiť kartou")}
                  </button>
                  <div className="text-xs text-neutral-500">
                    {paymentMethod === "TRANSFER"
                      ? "Platobné údaje dostanete emailom."
                      : deliveryMethod === "packeta"
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

      {/* Modal: prevod vyžaduje účet */}
      {showTransferModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowTransferModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-neutral-900 px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18"/>
                      <path d="M9 21V9"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">Platba prevodom</div>
                    <div className="text-[15px] font-extrabold leading-snug text-white">Vyžaduje prihlásenie</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                  aria-label="Zatvoriť"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="9" y2="9"/>
                    <line x1="9" y1="1" x2="1" y2="9"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-5 pb-6">
              <p className="text-[14px] leading-relaxed text-neutral-600">
                Platbu bankovým prevodom môžu využiť iba registrovaní zákazníci. Účet vám umožní sledovať stav objednávky a variabilný symbol je viazaný na váš profil.
              </p>

              <ul className="mt-4 space-y-2">
                {[
                  "Variabilný symbol spojený s vašou objednávkou",
                  "Stav platby vidíte v histórii objednávok",
                  "Predvyplnená adresa pri ďalšej objednávke",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[13px] text-neutral-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FFAE00]">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex gap-3">
                <a
                  href="/registracia"
                  className="flex-1 rounded-xl bg-[#FFAE00] px-4 py-2.5 text-center text-[13px] font-extrabold text-black transition hover:bg-[#e09d00]"
                >
                  Vytvoriť účet
                </a>
                <a
                  href="/prihlasenie"
                  className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Prihlásiť sa
                </a>
              </div>

              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="mt-3 w-full text-center text-[12px] text-neutral-400 transition hover:text-neutral-600"
              >
                Pokračovať s platbou kartou
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}