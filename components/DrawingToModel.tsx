"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { loadRecaptcha, recaptchaToken } from "@/lib/recaptcha-client";
import { addVat, formatEur } from "@/lib/vat";
import {
  DRAWING_ACCEPT,
  DRAWING_MAX_BYTES,
  DRAWING_MODEL_FEE_EUR,
  DRAWING_NOTE_MAX_CHARS,
  type DrawingModelResult,
} from "@/lib/drawing-model";

// Bambu H2S: 340 × 320 × 340 mm
const MAX_PRINT_MM = 340;
// Väčší obrázok AI aj tak zmenší; menší súbor sa rýchlejšie nahrá.
const MAX_IMAGE_PX = 2400;

/** Veľký obrázok zmenší na MAX_IMAGE_PX (JPEG), aby sa zmestil do limitu požiadavky. */
async function prepareImage(file: File): Promise<File> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_IMAGE_PX / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= DRAWING_MAX_BYTES * 0.9) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

export default function DrawingToModel({
  hideForm,
  disabled,
  resetSignal,
  onBusyChange,
  onModel,
}: {
  /** Skryje nahrávanie výkresu (napr. keď je v kalkulátore aktívny model); výsledok ostane. */
  hideForm?: boolean;
  disabled?: boolean;
  /** Zmena hodnoty = zákazník nahral iný súbor, výsledok z výkresu už neplatí. */
  resetSignal: number;
  onBusyChange?: (busy: boolean) => void;
  /** Vložiť vygenerovaný model do kalkulátora; replace = prepočet toho istého modelu. */
  onModel: (file: File, replace: boolean) => Promise<void>;
}) {
  const t = useT();
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [drawing, setDrawing] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [result, setResult] = useState<DrawingModelResult | null>(null);

  const fee = formatEur(addVat(DRAWING_MODEL_FEE_EUR));

  useEffect(() => {
    setResult(null);
  }, [resetSignal]);

  useEffect(() => {
    if (!drawing || !drawing.type.startsWith("image/")) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(drawing);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [drawing]);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function pick(file: File | undefined) {
    setError("");
    setErrorDetail("");
    if (!file) return;
    if (!/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
      setError("Výkres nahrajte ako PDF, PNG, JPG alebo WEBP.");
      return;
    }
    if (/\.pdf$/i.test(file.name) && file.size > DRAWING_MAX_BYTES) {
      setError("PDF má viac ako 4 MB. Uložte výkres ako obrázok (PNG alebo JPG) alebo PDF zmenšite.");
      return;
    }
    setDrawing(file);
    setOpen(true);
    void loadRecaptcha();
  }

  async function generate(replace: boolean) {
    if (!drawing || busy) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    setErrorDetail("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const file = await prepareImage(drawing);
      if (file.size > DRAWING_MAX_BYTES) throw new Error("Výkres je príliš veľký. Uložte ho ako JPG s menším rozlíšením.");
      const form = new FormData();
      form.append("file", file);
      form.append("note", note);
      form.append("locale", locale);
      form.append("recaptcha", await recaptchaToken("drawing"));
      const res = await fetch("/api/drawing-to-model", { method: "POST", body: form, signal: controller.signal });
      const text = await res.text();
      let data: (Partial<DrawingModelResult> & { error?: string; detail?: string }) | null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: res.status === 504 ? "Generovanie trvalo príliš dlho. Skúste to znova." : "Model sa nepodarilo vygenerovať." };
      }
      if (!res.ok) {
        setErrorDetail(typeof data?.detail === "string" ? data.detail : "");
        throw new Error(data?.error || "Model sa nepodarilo vygenerovať.");
      }
      const r = data as DrawingModelResult;
      const bytes = Uint8Array.from(atob(r.stlBase64), (c) => c.charCodeAt(0));
      const stl = new File([bytes], r.fileName, { type: "model/stl" });
      setResult(r);
      setBusy(false);
      onBusyChange?.(false);
      await onModel(stl, replace);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setResult(null);
      setError((e instanceof Error && e.message) || "Model sa nepodarilo vygenerovať.");
    } finally {
      abortRef.current = null;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setBusy(false);
    onBusyChange?.(false);
  }

  const tooBig = result && Math.max(result.dims.x, result.dims.y, result.dims.z) > MAX_PRINT_MM;
  const showForm = !hideForm && !result;

  return (
    <div>
      {showForm && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M4 20h16M4 20V4h9l7 7v9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M13 4v7h7M8 15h3M8 11h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-neutral-900">{t("Máte len technický výkres?")}</div>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                {t("Nahrajte výkres alebo náčrt s rozmermi (PDF, PNG, JPG) a AI z neho vygeneruje 3D model na tlač. K cene položky sa pripočíta {fee} s DPH za vygenerovanie modelu.", { fee })}
              </p>
            </div>
            {!open && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border border-neutral-900 px-4 py-2 text-sm font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
              >
                {t("Nahrať výkres")}
              </button>
            )}
          </div>

          {open && drawing && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-neutral-200 bg-white object-contain" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs font-bold text-red-600">PDF</div>
                )}
                <div className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">{drawing.name}</div>
                {!busy && (
                  <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-neutral-500 underline">
                    {t("Zmeniť")}
                  </button>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-700">{t("Poznámka k výkresu (nepovinné)")}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, DRAWING_NOTE_MAX_CHARS))}
                  disabled={busy}
                  rows={2}
                  placeholder={t("Napr. hrúbka dosky 5 mm, otvory sú priechodné…")}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00] disabled:opacity-60"
                />
              </label>

              {busy ? (
                <div className="rounded-xl bg-[#FFAE00]/10 p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#FFAE00] border-t-transparent" />
                    <div className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">
                      {t("AI číta výkres a skladá 3D model…")}
                      <div className="text-xs font-normal text-neutral-500">
                        {t("Zvyčajne to trvá 1–3 minúty. Nezatvárajte stránku.")} ({elapsed} s)
                      </div>
                    </div>
                    <button type="button" onClick={cancel} className="text-xs font-semibold text-neutral-500 underline">
                      {t("Zrušiť")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => generate(false)}
                    className="rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e09d00] disabled:opacity-60"
                  >
                    {t("Vygenerovať 3D model")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setDrawing(null);
                      setError("");
                    }}
                    className="text-xs font-semibold text-neutral-500 underline"
                  >
                    {t("Zrušiť")}
                  </button>
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-neutral-400">
                {t("Výkres spracuje AI (Claude od Anthropic) len na vygenerovanie modelu. Nahrajte iba výkresy, ktoré môžete použiť.")}
              </p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <div className="text-sm font-extrabold text-neutral-900">
              {t("Model z výkresu:")} {result.partName}
            </div>
            <div className="text-xs text-neutral-500">
              {result.dims.x} × {result.dims.y} × {result.dims.z} mm
            </div>
          </div>
          {result.summary && <p className="mt-1 text-xs leading-relaxed text-neutral-600">{result.summary}</p>}
          {result.assumptions.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-neutral-700">{t("Odhadli sme:")}</div>
              <ul className="mt-0.5 list-disc pl-5 text-xs leading-relaxed text-neutral-600">
                {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {(result.warnings.length > 0 || tooBig) && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-amber-700">{t("Upozornenie:")}</div>
              <ul className="mt-0.5 list-disc pl-5 text-xs leading-relaxed text-amber-700">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                {tooBig && (
                  <li>{t("Model je väčší ako naša tlačiareň ({max} mm). Zmenšite mierku alebo nás kontaktujte.", { max: MAX_PRINT_MM })}</li>
                )}
              </ul>
            </div>
          )}
          <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-relaxed text-neutral-700">
            {result.confidence === "low" && <strong>{t("Výkres nebol úplne jasný.")} </strong>}
            {t("Skontrolujte prosím tvar a rozmery v 3D náhľade — vytlačíme model presne tak, ako ho vidíte. Ak niečo nesedí, doplňte poznámku a vygenerujte ho znova, alebo nám napíšte.")}
          </p>
          {drawing && (
            <div className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, DRAWING_NOTE_MAX_CHARS))}
                disabled={busy}
                rows={2}
                aria-label={t("Poznámka k výkresu (nepovinné)")}
                placeholder={t("Čo upraviť? Napr. otvor má mať Ø 8 mm…")}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00] disabled:opacity-60"
              />
              {busy ? (
                <div className="flex items-center gap-3 text-sm font-semibold text-neutral-800">
                  <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#FFAE00] border-t-transparent" />
                  {t("AI číta výkres a skladá 3D model…")} ({elapsed} s)
                  <button type="button" onClick={cancel} className="text-xs font-semibold text-neutral-500 underline">
                    {t("Zrušiť")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => generate(true)}
                  className="rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e09d00] disabled:opacity-60"
                >
                  {t("↺ Vygenerovať znova")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {t(error)}
          {errorDetail && <div className="mt-1 text-xs text-red-600">{errorDetail}</div>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={DRAWING_ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
