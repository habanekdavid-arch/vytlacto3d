"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import UploadBox from "@/components/UploadBox";
import Configurator, { ConfigState } from "@/components/Configurator";
import StlViewer from "@/components/StlViewer";
import CartSidebar from "@/components/CartSidebar";
import MaterialPricing from "@/components/MaterialPricing";
import HowItWorks from "@/components/HowItWorks";
import FaqPreview from "@/components/FaqPreview";
import FloatingCta from "@/components/FloatingCta";
import ModelSummaryBar from "@/components/ModelSummaryBar";
import { CartItem, CartItemConfig, CartItemPricing } from "@/lib/types";
import { formatPriceWithVat, formatEur, addVat } from "@/lib/vat";
import { SHIPPING_RATES } from "@/lib/shipping";

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

type ContactForm = {
  name: string;
  phone: string;
  shippingName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
  billingStreet: string;
  billingCity: string;
  billingZip: string;
  billingCountry: string;
};

const EMPTY_CONTACT: ContactForm = {
  name: "", phone: "",
  shippingName: "", shippingStreet: "", shippingCity: "", shippingZip: "", shippingCountry: "Slovensko",
  billingStreet: "", billingCity: "", billingZip: "", billingCountry: "Slovensko",
};

type PacketaPoint = {
  id: string;
  name: string;
  nameStreet: string;
  city: string;
  zip: string;
  country: string;
};

export default function Home() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"packeta" | "courier">("packeta");
  const [packetaPoint, setPacketaPoint] = useState<PacketaPoint | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { status: sessionStatus } = useSession();
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setContactForm({
          name: data.name ?? "",
          phone: data.phone ?? "",
          shippingName: data.shippingName ?? data.name ?? "",
          shippingStreet: data.shippingStreet ?? "",
          shippingCity: data.shippingCity ?? "",
          shippingZip: data.shippingZip ?? "",
          shippingCountry: data.shippingCountry ?? "Slovensko",
          billingStreet: data.billingStreet ?? "",
          billingCity: data.billingCity ?? "",
          billingZip: data.billingZip ?? "",
          billingCountry: data.billingCountry ?? "Slovensko",
        });
        setProfileLoaded(true);
      })
      .catch(() => {});
  }, [sessionStatus]);

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

  const updateItemPricing = useCallback((id: string, pricing: CartItemPricing) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pricing } : item))
    );
  }, []);

  const updateItemConfig = useCallback((id: string, config: CartItemConfig) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, config } : item))
    );
  }, []);

  const handleQuote = useCallback(
    (q: CartItemPricing, cfg: ConfigState) => {
      if (!activeItemId) return;
      updateItemPricing(activeItemId, q);
      updateItemConfig(activeItemId, cfg as CartItemConfig);
    },
    [activeItemId, updateItemPricing, updateItemConfig]
  );

  function addToCart(uploaded: Uploaded) {
    const id = String(Date.now());
    const newItem: CartItem = {
      id,
      fileKey: uploaded.fileKey,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      analysis: uploaded.analysis,
      config: { material: "PLA", quality: "STANDARD", infillPct: 20, color: "black", quantity: 1, scalePct: 100 },
      pricing: null,
    };
    setCartItems((prev) => [...prev, newItem]);
    setActiveItemId(id);
  }

  function removeItem(id: string) {
    setCartItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeItemId === id) {
        setActiveItemId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }

  const activeItem = cartItems.find((i) => i.id === activeItemId) ?? null;
  const scaleFactor = (activeItem?.config.scalePct ?? 100) / 100;

  const scaledAnalysis = useMemo(() => {
    if (!activeItem) return null;
    return {
      dimsXmm: activeItem.analysis.dimsXmm * scaleFactor,
      dimsYmm: activeItem.analysis.dimsYmm * scaleFactor,
      dimsZmm: activeItem.analysis.dimsZmm * scaleFactor,
      volumeCm3: activeItem.analysis.volumeCm3 * Math.pow(scaleFactor, 3),
    };
  }, [activeItem, scaleFactor]);

  const allItemsPriced = cartItems.length > 0 && cartItems.every((i) => i.pricing !== null);
  const cartTotalNet = cartItems.reduce((s, i) => s + (i.pricing?.total ?? 0), 0);
  const shippingCostWithVat = deliveryMethod === "courier" ? SHIPPING_RATES.COURIER : SHIPPING_RATES.PACKETA;
  const grandTotal = addVat(cartTotalNet) + shippingCostWithVat;

  async function payByTransfer() {
    if (!allItemsPriced) return;
    setOrderLoading(true);
    try {
      const res = await fetch("/api/order/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            fileKey: item.fileKey,
            fileName: item.fileName,
            fileSize: item.fileSize,
            analysis: item.analysis,
            config: item.config,
            pricing: item.pricing,
          })),
          deliveryMethod,
          packetaPoint: deliveryMethod === "packeta" ? packetaPoint : null,
          contactOverride: profileLoaded ? contactForm : null,
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
    if (!allItemsPriced) return;
    setOrderLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            fileKey: item.fileKey,
            fileName: item.fileName,
            fileSize: item.fileSize,
            analysis: item.analysis,
            config: item.config,
            pricing: item.pricing,
          })),
          deliveryMethod,
          packetaPoint: deliveryMethod === "packeta" ? packetaPoint : null,
          contactOverride: profileLoaded ? contactForm : null,
        }),
      });
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      if (!res.ok) { alert(data.error || "Stripe error"); return; }
      if (data.url) { window.location.href = data.url; }
      else { alert("Stripe session bez URL"); }
    } finally {
      setOrderLoading(false);
    }
  }

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

        <section id="kalkulator" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-500">Konfigurátor</div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                Nahraj modely a nastav parametre tlače
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Môžete nahrať viacero modelov — každý s vlastnými parametrami — a objednať ich naraz.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* ─── Left column: upload / configure ─── */}
            <div className="space-y-4">
              {/* Upload box — shown when no active item */}
              {!activeItem && (
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                      +
                    </div>
                    <div className="text-lg font-extrabold">Nahraj STL / OBJ / SVG model</div>
                  </div>
                  <UploadBox
                    onUploadingChange={setUploadLoading}
                    onUploaded={(u) => addToCart(u)}
                  />
                  {uploadLoading && (
                    <div className="mt-4 rounded-2xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FFAE00]" />
                        <div>
                          <div className="text-sm font-bold text-neutral-900">Nahrávam a analyzujem model</div>
                          <div className="text-xs text-neutral-600">Počkajte chvíľu, pripravujeme 3D náhľad a výpočet parametrov.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active item: 3D viewer + configurator */}
              {activeItem && scaledAnalysis && (
                <>
                  <ModelSummaryBar
                    dimsX={scaledAnalysis.dimsXmm}
                    dimsY={scaledAnalysis.dimsYmm}
                    dimsZ={scaledAnalysis.dimsZmm}
                    volume={scaledAnalysis.volumeCm3}
                    totalWithVat={formatPriceWithVat(activeItem.pricing?.total ?? null)}
                  />

                  <div className="rounded-3xl border border-neutral-200 bg-white p-5">
                    <div className="mb-3 text-sm font-semibold text-neutral-500">3D náhľad</div>
                    <StlViewer
                      key={`${activeItem.fileKey}-${activeItem.config.scalePct}-${activeItem.config.color}`}
                      fileKey={activeItem.fileKey}
                      title="Model sa dá otáčať a zoomovať"
                      colorId={activeItem.config.color}
                      height={380}
                      scalePct={activeItem.config.scalePct}
                    />
                  </div>

                  <Configurator
                    key={activeItemId}
                    analysis={{
                      volumeCm3: activeItem.analysis.volumeCm3,
                      dimsXmm: activeItem.analysis.dimsXmm,
                      dimsYmm: activeItem.analysis.dimsYmm,
                      dimsZmm: activeItem.analysis.dimsZmm,
                    }}
                    initialConfig={activeItem.config}
                    onQuote={handleQuote}
                  />

                  <button
                    type="button"
                    onClick={() => setActiveItemId(null)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-5 py-4 text-sm font-semibold text-neutral-600 transition hover:border-[#FFAE00] hover:bg-[#FFAE00]/5 hover:text-neutral-900"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="8" y1="2" x2="8" y2="14" />
                      <line x1="2" y1="8" x2="14" y2="8" />
                    </svg>
                    Pridať ďalší model
                  </button>
                </>
              )}
            </div>

            {/* ─── Right column: cart + checkout ─── */}
            <div className="space-y-4 lg:self-start">
              <CartSidebar
                items={cartItems}
                activeItemId={activeItemId}
                onSelect={setActiveItemId}
                onRemove={removeItem}
                onAddNew={() => setActiveItemId(null)}
              />

              {/* Checkout panel */}
              {allItemsPriced && (
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 space-y-5">

                  {/* Delivery */}
                  <div>
                    <div className="mb-3 text-sm font-extrabold text-neutral-800">Spôsob doručenia</div>
                    <div className="grid gap-2 grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod("packeta")}
                        className={[
                          "flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-all",
                          deliveryMethod === "packeta" ? "border-[#FFAE00] bg-[#FFAE00]/5" : "border-neutral-200 bg-white hover:border-neutral-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#b07a00]">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                          {deliveryMethod === "packeta" && (
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFAE00]">
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-neutral-900">Packeta</div>
                        <div className="text-xs font-extrabold text-neutral-900">{formatEur(SHIPPING_RATES.PACKETA)}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMethod("courier")}
                        className={[
                          "flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-all",
                          deliveryMethod === "courier" ? "border-[#FFAE00] bg-[#FFAE00]/5" : "border-neutral-200 bg-white hover:border-neutral-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                            <rect x="1" y="3" width="15" height="13" rx="1"/>
                            <path d="M16 8h4l3 5v3h-7V8z"/>
                            <circle cx="5.5" cy="18.5" r="2.5"/>
                            <circle cx="18.5" cy="18.5" r="2.5"/>
                          </svg>
                          {deliveryMethod === "courier" && (
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFAE00]">
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-neutral-900">Kuriér</div>
                        <div className="text-xs font-extrabold text-neutral-900">{formatEur(SHIPPING_RATES.COURIER)}</div>
                      </button>
                    </div>

                    {deliveryMethod === "packeta" && (
                      <div className="mt-2">
                        {packetaPoint ? (
                          <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-3 py-2">
                            <svg className="shrink-0 text-green-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-xs font-bold text-neutral-900">{packetaPoint.name}</div>
                              <div className="truncate text-[11px] text-neutral-600">{packetaPoint.city}</div>
                            </div>
                            <button type="button" onClick={openPacketaWidget} className="shrink-0 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50">
                              Zmeniť
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={openPacketaWidget} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-xs font-semibold text-neutral-600 transition hover:border-[#FFAE00] hover:bg-[#FFAE00]/5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            Vybrať výdajné miesto →
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contact info */}
                  {sessionStatus === "authenticated" && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-extrabold text-neutral-800">Kontaktné údaje</div>
                        <button type="button" onClick={() => setEditingContact((v) => !v)} className="text-xs font-semibold text-[#FFAE00] hover:text-[#b07a00]">
                          {editingContact ? "Zatvoriť" : "Upraviť"}
                        </button>
                      </div>

                      {!editingContact ? (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                          {contactForm.name ? (
                            <div className="space-y-0.5 text-xs">
                              <div className="font-semibold text-neutral-900">{contactForm.name}</div>
                              {contactForm.phone && <div className="text-neutral-500">{contactForm.phone}</div>}
                              {deliveryMethod === "courier" && contactForm.shippingStreet && (
                                <div className="text-neutral-600">{contactForm.shippingStreet}, {contactForm.shippingCity}</div>
                              )}
                              {deliveryMethod === "courier" && !contactForm.shippingStreet && (
                                <div className="font-medium text-orange-600">Dodacia adresa chýba — kliknite Upraviť</div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400">
                              Profil sa načítava… alebo <button type="button" onClick={() => setEditingContact(true)} className="text-[#FFAE00] underline">Upraviť</button>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                          <div className="grid gap-2 grid-cols-2">
                            <CField label="Meno" value={contactForm.name} onChange={(v) => setContactForm((f) => ({ ...f, name: v }))} />
                            <CField label="Telefón" value={contactForm.phone} onChange={(v) => setContactForm((f) => ({ ...f, phone: v }))} />
                          </div>
                          {deliveryMethod === "courier" && (
                            <>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Dodacia adresa</div>
                              <div className="grid gap-2 grid-cols-2">
                                <CField label="Meno na balíku" value={contactForm.shippingName} onChange={(v) => setContactForm((f) => ({ ...f, shippingName: v }))} />
                                <CField label="Ulica" value={contactForm.shippingStreet} onChange={(v) => setContactForm((f) => ({ ...f, shippingStreet: v }))} />
                                <CField label="Mesto" value={contactForm.shippingCity} onChange={(v) => setContactForm((f) => ({ ...f, shippingCity: v }))} />
                                <CField label="PSČ" value={contactForm.shippingZip} onChange={(v) => setContactForm((f) => ({ ...f, shippingZip: v }))} />
                              </div>
                            </>
                          )}
                          <p className="text-[10px] text-neutral-400">
                            Firemné údaje a fakturačnú adresu upravíte v{" "}
                            <a href="/ucet" className="text-[#FFAE00] underline">nastaveniach účtu</a>.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment method */}
                  <div>
                    <div className="mb-3 text-sm font-extrabold text-neutral-800">Spôsob platby</div>
                    <div className="grid gap-2 grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CARD")}
                        className={[
                          "flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-all",
                          paymentMethod === "CARD" ? "border-[#FFAE00] bg-[#FFAE00]/5" : "border-neutral-200 bg-white hover:border-neutral-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFAE00]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                              <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                          </div>
                          {paymentMethod === "CARD" && (
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFAE00]">
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-neutral-900">Platba kartou</div>
                        <div className="text-[11px] text-neutral-500">Stripe</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (sessionStatus !== "authenticated") { setShowTransferModal(true); }
                          else { setPaymentMethod("TRANSFER"); }
                        }}
                        className={[
                          "flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-all",
                          paymentMethod === "TRANSFER" ? "border-orange-400 bg-orange-50" : "border-neutral-200 bg-white hover:border-neutral-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <path d="M3 9h18"/>
                              <path d="M9 21V9"/>
                            </svg>
                          </div>
                          {paymentMethod === "TRANSFER" && (
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-400">
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-neutral-900">Prevod</div>
                        <div className="text-[11px] text-neutral-500">
                          IBAN SK{" "}
                          {sessionStatus !== "authenticated" && (
                            <span className="rounded-full bg-orange-100 px-1 py-0.5 text-[10px] font-bold text-orange-700">účet</span>
                          )}
                        </div>
                      </button>
                    </div>

                    {paymentMethod === "TRANSFER" && (
                      <div className="mt-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                        Platobné údaje (IBAN, VS, sumu) dostanete emailom. Výroba začne po prijatí platby.
                      </div>
                    )}
                  </div>

                  {/* Price summary */}
                  <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>Výroba ({cartItems.length} {cartItems.length === 1 ? "model" : "modely/modelov"})</span>
                      <span className="font-semibold">{formatEur(addVat(cartTotalNet))}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Doprava</span>
                      <span className="font-semibold">{formatEur(shippingCostWithVat)}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-base font-extrabold text-neutral-900">
                      <span>Celkom s DPH</span>
                      <span>{formatEur(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Terms + Order button */}
                  <div className="space-y-3">
                    <label className={[
                      "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition-colors",
                      termsAccepted ? "border-[#FFAE00] bg-[#FFAE00]/5" : "border-neutral-200 bg-white hover:border-neutral-300",
                    ].join(" ")}>
                      <div className={[
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        termsAccepted ? "border-[#FFAE00] bg-[#FFAE00]" : "border-neutral-300 bg-white",
                      ].join(" ")}>
                        {termsAccepted && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="sr-only" />
                      <span className="text-xs leading-5 text-neutral-700">
                        Súhlasím so{" "}
                        <a href="/podmienky" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-neutral-900 underline hover:text-[#b07a00]">
                          VOP
                        </a>
                      </span>
                    </label>

                    <button
                      disabled={
                        !allItemsPriced || orderLoading ||
                        (deliveryMethod === "packeta" && !packetaPoint) ||
                        !termsAccepted
                      }
                      onClick={paymentMethod === "TRANSFER" ? payByTransfer : payByCard}
                      className={[
                        "w-full rounded-2xl px-5 py-3 text-sm font-extrabold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
                        paymentMethod === "TRANSFER" ? "bg-orange-500 text-white" : "bg-[#FFAE00] text-black",
                      ].join(" ")}
                    >
                      {orderLoading
                        ? (paymentMethod === "TRANSFER" ? "Vytváram objednávku…" : "Presmerúvam…")
                        : (paymentMethod === "TRANSFER" ? "Objednať — zaplatiť prevodom" : "Objednať a zaplatiť kartou")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="9" y2="9"/>
                    <line x1="9" y1="1" x2="1" y2="9"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 pt-5 pb-6">
              <p className="text-[14px] leading-relaxed text-neutral-600">
                Platbu bankovým prevodom môžu využiť iba registrovaní zákazníci. Účet vám umožní sledovať stav objednávky a variabilný symbol je viazaný na váš profil.
              </p>
              <ul className="mt-4 space-y-2">
                {["Variabilný symbol spojený s vašou objednávkou", "Stav platby vidíte v histórii objednávok", "Predvyplnená adresa pri ďalšej objednávke"].map((b) => (
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
                <a href="/registracia" className="flex-1 rounded-xl bg-[#FFAE00] px-4 py-2.5 text-center text-[13px] font-extrabold text-black transition hover:bg-[#e09d00]">
                  Vytvoriť účet
                </a>
                <a href="/prihlasenie" className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
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

function CField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none transition focus:border-[#FFAE00] focus:ring-1 focus:ring-[#FFAE00]/30"
      />
    </div>
  );
}
