"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useT } from "@/lib/i18n/client";
import { relaxAcceptOnMobile } from "@/lib/file-accept";
import { OUTPUT_LONGEST_MM, isRasterImage, loadPixels, rasterImageToSvgFile } from "@/lib/image-to-svg";
import { PALETTE_HEX, extractColorLayers, loadSvgPixels, type ColorLayer } from "@/lib/color-layers";
import { buildLayeredStl, type LayerSetting } from "@/lib/layer-extrude";
import { COLOR_LABELS } from "@/lib/print-options";
import { MULTICOLOR_FEE_EUR } from "@/lib/multicolor";
import { addVat, formatEur } from "@/lib/vat";
import type { CartItemConfig } from "@/lib/types";
import type { BuildPhase } from "@/components/ModelBuildAnimation";
import DrawingToModel from "@/components/DrawingToModel";

type Uploaded = {
  fileKey: string;
  fileName: string;
  fileSize: number;
  analysis: {
    dimsXmm: number;
    dimsYmm: number;
    dimsZmm: number;
    volumeCm3: number;
    surfaceAreaCm2?: number;
    supportCm3?: number;
  };
  /** Nastavenie, s ktorým sa model vloží do kalkulátora (farby dielov z obrázka). */
  configDefaults?: Partial<Pick<CartItemConfig, "material" | "color" | "partColors">>;
  /** Prepočet toho istého modelu — nahradí aktívnu položku, nepridá novú. */
  replaceActive?: boolean;
};

export type UploadBoxHandle = { triggerOpen: () => void };

// Zhodné s limitom v /api/analyze. Kontroluje sa aj tu, aby zákazník nečakal
// na nahranie stomegového súboru, ktorý server aj tak odmietne.
const MAX_MODEL_MB = 100;

const UploadBox = forwardRef<UploadBoxHandle, {
  onUploaded: (data: Uploaded) => void;
  onUploadingChange?: (value: boolean) => void;
  // Hides just the dropzone (e.g. once a model is already active) while
  // keeping the SVG thickness/reconvert panel visible and interactive —
  // this component must stay mounted so that state isn't lost.
  hideDropzone?: boolean;
  // Pre animáciu nahrávania: súbor na náhľad (null = ešte nie je k dispozícii)
  // a aktuálna fáza s priebehom 0–1.
  onPreviewFile?: (file: File | null) => void;
  onProgress?: (phase: BuildPhase, progress: number) => void;
}>(function UploadBox({ onUploaded, onUploadingChange, hideDropzone, onPreviewFile, onProgress }, ref) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    triggerOpen: () => inputRef.current?.click(),
  }));

  // Na mobile by .stl/.obj súbory boli vo výbere zosivené (pozri lib/file-accept).
  useEffect(() => relaxAcceptOnMobile(inputRef.current), []);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [svgThicknessMm, setSvgThicknessMm] = useState(10);

  const [originalSvgFile, setOriginalSvgFile] = useState<File | null>(null);
  // Viacfarebný obrázok/SVG: farebné vrstvy a ich výška a farba tlače.
  const [colorLayers, setColorLayers] = useState<{ layers: ColorLayer[]; name: string } | null>(null);
  const [layerSettings, setLayerSettings] = useState<LayerSetting[]>([]);
  const [layerNotice, setLayerNotice] = useState<string>("");
  const [isReconverting, setIsReconverting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  // Model z technického výkresu (components/DrawingToModel)
  const [drawingBusy, setDrawingBusy] = useState(false);
  const [drawingReset, setDrawingReset] = useState(0);

  // Zobraz panel hrúbky len ak nie je ešte uploadnutý súbor, alebo ak bol uploadnutý SVG.
  // Keď je v kalkulátore už iný model (napr. hotový produkt), panel nepatrí k nemu.
  const isSvgMode = originalSvgFile !== null && colorLayers === null;
  const showThicknessInput = isSvgMode || (!uploadedFileName && !hideDropzone);

  function sanitizeFileName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._\-]/g, "_")
      .replace(/_+/g, "_")
      .toLowerCase();
  }

  async function convertSvgToStl(file: File) {
    onPreviewFile?.(null);
    onProgress?.("convert", 0);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("thicknessMm", String(svgThicknessMm));

    const res = await fetch("/api/svg-to-stl", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      throw new Error(data?.error || "SVG konverzia zlyhala.");
    }

    const blob = await res.blob();
    const stlFileName = sanitizeFileName(file.name.replace(/\.svg$/i, ".stl"));
    const stlFile = new File([blob], stlFileName, { type: "model/stl" });
    onPreviewFile?.(stlFile);
    return stlFile;
  }

  async function uploadAndAnalyze(file: File, extra?: Pick<Uploaded, "configDefaults" | "replaceActive">): Promise<void> {
    if (file.size > MAX_MODEL_MB * 1024 * 1024) {
      throw new Error(
        t("Súbor má {size} MB, maximum je {max} MB. Skúste znížiť počet trojuholníkov modelu.", {
          size: (file.size / 1024 / 1024).toFixed(1),
          max: MAX_MODEL_MB,
        })
      );
    }

    const safeName = sanitizeFileName(file.name);
    onProgress?.("upload", 0);

    const blob = await upload(safeName, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      multipart: true,
      contentType: file.type || "application/octet-stream",
      onUploadProgress: ({ percentage }) => {
        onProgress?.("upload", percentage / 100);
      },
    });

    onProgress?.("analyze", 0);
    const analyzeRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey: blob.url,
        fileName: safeName,
        fileSize: file.size,
      }),
    });

    const analyzeText = await analyzeRes.text();
    let analyzeData: any = null;
    try { analyzeData = JSON.parse(analyzeText); } catch { analyzeData = { error: analyzeText }; }

    if (!analyzeRes.ok) throw new Error(analyzeData?.error || t("Analýza zlyhala."));
    if (!analyzeData?.analysis) throw new Error("Analyze API nevrátil analysis.");

    onUploaded({
      fileKey: blob.url,
      fileName: safeName,
      fileSize: file.size,
      analysis: analyzeData.analysis,
      ...extra,
    });

    setUploadedFileName(file.name);
  }

  /**
   * Viacfarebný obrázok alebo SVG → vrstvy. Vráti null pri jednej farbe
   * (vtedy ide doterajší jednofarebný prevod).
   */
  async function detectColorLayers(file: File) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".svg")) {
      const px = await loadSvgPixels(file).catch(() => null);
      return px ? extractColorLayers(px.w, px.h, px.data, px.scale, px.mmPerPx) : null;
    }
    const px = await loadPixels(file);
    return extractColorLayers(px.w, px.h, px.data, px.scale, OUTPUT_LONGEST_MM / Math.max(px.w, px.h));
  }

  async function buildLayersAndUpload(
    layers: ColorLayer[],
    settings: LayerSetting[],
    name: string,
    replaceActive: boolean
  ) {
    onPreviewFile?.(null);
    onProgress?.("convert", 0);
    // Nech sa stihne vykresliť priebeh — výpočet beží v hlavnom vlákne.
    await new Promise((r) => setTimeout(r, 30));
    const model = buildLayeredStl(layers, settings, sanitizeFileName(name));
    setLayerNotice(
      model.tooManyParts
        ? t("Model má priveľa samostatných častí na automatické zafarbenie — vytlačíme ho v jednej farbe.")
        : ""
    );
    onPreviewFile?.(model.file);
    const firstColor = settings.find((s) => s.enabled)?.colorId ?? "black";
    await uploadAndAnalyze(model.file, {
      configDefaults: model.partColors
        ? { material: "PLA", color: model.partColors[0], partColors: model.partColors }
        : { color: firstColor },
      replaceActive,
    });
  }

  async function handleFile(originalFile: File) {
    if (drawingBusy) return;
    setError("");
    setLayerNotice("");
    setDrawingReset((n) => n + 1);
    if (originalFile.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF výkres nahrajte nižšie v časti „Máte len technický výkres?“ — vygenerujeme z neho 3D model.");
      return;
    }
    onUploadingChange?.(true);

    try {
      const originalFileName = originalFile.name.toLowerCase();

      const isAllowed =
        originalFileName.endsWith(".stl") ||
        originalFileName.endsWith(".obj") ||
        originalFileName.endsWith(".svg") ||
        isRasterImage(originalFileName);

      if (!isAllowed) throw new Error(t("Podporujeme STL, OBJ, SVG a obrázky PNG alebo JPG."));

      // Viacfarebný obrázok/SVG: každá farba vlastná vrstva s vlastnou výškou.
      const multi =
        isRasterImage(originalFileName) || originalFileName.endsWith(".svg")
          ? (onPreviewFile?.(null), onProgress?.("convert", 0), await detectColorLayers(originalFile))
          : null;

      if (multi) {
        const settings = multi.layers.map((l) => ({
          heightMm: l.background ? 2 : svgThicknessMm,
          colorId: l.colorId,
          enabled: !l.background,
        }));
        setOriginalSvgFile(null);
        setColorLayers({ layers: multi.layers, name: originalFile.name });
        setLayerSettings(settings);
        await buildLayersAndUpload(multi.layers, settings, originalFile.name, false);
      } else if (isRasterImage(originalFileName)) {
        setColorLayers(null);
        // Obrázok → obrys (SVG) v prehliadači → rovnaké vytiahnutie ako SVG.
        // SVG obrys si pamätáme, aby „Použiť novú výšku“ fungovalo aj tu.
        onPreviewFile?.(null);
        onProgress?.("convert", 0);
        const svgFile = await rasterImageToSvgFile(originalFile);
        setOriginalSvgFile(svgFile);
        const stlFile = await convertSvgToStl(svgFile);
        await uploadAndAnalyze(stlFile);
      } else if (originalFileName.endsWith(".svg")) {
        setColorLayers(null);
        setOriginalSvgFile(originalFile);
        const stlFile = await convertSvgToStl(originalFile);
        await uploadAndAnalyze(stlFile);
      } else {
        setColorLayers(null);
        setOriginalSvgFile(null);
        onPreviewFile?.(originalFile);
        await uploadAndAnalyze(originalFile);
      }
    } catch (e: any) {
      console.error("UPLOAD FLOW ERROR:", e);
      setError(e?.message || t("Nepodarilo sa spracovať súbor."));
    } finally {
      onUploadingChange?.(false);
    }
  }

  async function handleReconvert() {
    if (!originalSvgFile && !colorLayers) return;
    setIsReconverting(true);
    setError("");
    onUploadingChange?.(true);
    try {
      if (colorLayers) {
        await buildLayersAndUpload(colorLayers.layers, layerSettings, colorLayers.name, true);
      } else if (originalSvgFile) {
        const stlFile = await convertSvgToStl(originalSvgFile);
        await uploadAndAnalyze(stlFile, { replaceActive: true });
      }
    } catch (e: any) {
      setError(e?.message || "Chyba pri konverzii.");
    } finally {
      setIsReconverting(false);
      onUploadingChange?.(false);
    }
  }

  /** Vygenerovaný model z výkresu → rovnaké nahranie a analýza ako pri STL. */
  async function handleDrawingModel(stlFile: File, replace: boolean) {
    setError("");
    setLayerNotice("");
    setColorLayers(null);
    setOriginalSvgFile(null);
    onUploadingChange?.(true);
    try {
      onPreviewFile?.(stlFile);
      await uploadAndAnalyze(stlFile, { replaceActive: replace });
    } finally {
      onUploadingChange?.(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {!hideDropzone && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => { if (!drawingBusy) inputRef.current?.click(); }}
          className={[
            drawingBusy ? "pointer-events-none opacity-50" : "",
            "cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition",
            dragging
              ? "border-[#FFAE00] bg-[#FFAE00]/10"
              : "border-neutral-300 bg-white hover:border-[#FFAE00]/60 hover:bg-neutral-50",
          ].join(" ")}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFAE00] text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 10L12 6L16 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 18H19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h3 className="mt-4 text-xl font-extrabold text-neutral-900">
            {t("Nahrajte STL, OBJ, SVG alebo obrázok")}
          </h3>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
            {t("SVG aj obrázok (PNG, JPG) automaticky vytiahneme do 3D s nastavenou výškou. STL a OBJ súbory sa spracujú priamo.")}
          </p>

          <div className="mt-5 inline-flex rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm">
            {t("Vybrať súbor")}
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            {t("Podporované formáty:")} .STL, .OBJ, .SVG, .PNG, .JPG
          </p>
        </div>
      )}

      <DrawingToModel
        hideForm={hideDropzone}
        resetSignal={drawingReset}
        onBusyChange={setDrawingBusy}
        onModel={handleDrawingModel}
      />

      {colorLayers && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-800">{t("Farby a výšky")}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {t("V obrázku sme našli {n} farby. Každej nastavte výšku (mm) a farbu, v ktorej ju vytlačíme.", {
              n: colorLayers.layers.filter((l) => !l.background).length,
            })}
          </div>
          <div className="mt-3 space-y-2">
            {colorLayers.layers.map((layer, i) => {
              const s = layerSettings[i];
              if (!s) return null;
              const update = (patch: Partial<LayerSetting>) =>
                setLayerSettings((prev) => prev.map((x, k) => (k === i ? { ...x, ...patch } : x)));
              return (
                <div
                  key={i}
                  className={[
                    "flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2",
                    s.enabled ? "border-neutral-200" : "border-dashed border-neutral-200 opacity-60",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => update({ enabled: e.target.checked })}
                    aria-label={t("Tlačiť túto farbu")}
                    className="h-4 w-4 accent-[#FFAE00]"
                  />
                  <span
                    className="h-6 w-6 shrink-0 rounded-md border border-black/10"
                    style={{ background: layer.hex }}
                    title={layer.hex}
                  />
                  <span className="min-w-0 flex-1 text-xs text-neutral-600">
                    {layer.background ? t("Pozadie ako podložka") : `${Math.round(layer.share * 100)} %`}
                    <span className="ml-1 text-neutral-400">{layer.hex.toUpperCase()}</span>
                  </span>
                  <select
                    value={s.colorId}
                    onChange={(e) => update({ colorId: e.target.value })}
                    aria-label={t("Farba tlače")}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold"
                    style={{ boxShadow: `inset 4px 0 0 ${PALETTE_HEX[s.colorId]}` }}
                  >
                    {Object.keys(PALETTE_HEX).map((id) => (
                      <option key={id} value={id}>
                        {t(COLOR_LABELS[id] ?? id)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0.4}
                    max={200}
                    step={0.2}
                    value={s.heightMm}
                    onChange={(e) => update({ heightMm: Math.max(0.4, Math.min(200, Number(e.target.value) || 0.4)) })}
                    aria-label={t("Výška (mm)")}
                    className="w-20 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-[#FFAE00]"
                  />
                  <span className="text-xs text-neutral-500">mm</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleReconvert}
              disabled={isReconverting}
              className="rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e09d00] disabled:opacity-60"
            >
              {isReconverting ? t("Prepočítavam...") : t("↺ Použiť výšky a farby")}
            </button>
            <span className="text-xs text-neutral-500">
              {t("Viac farieb = viacfarebná tlač z PLA (+{fee} s DPH).", { fee: formatEur(addVat(MULTICOLOR_FEE_EUR)) })}
            </span>
          </div>
          {layerNotice && <p className="mt-2 text-xs font-semibold text-amber-700">{layerNotice}</p>}
        </div>
      )}

      {showThicknessInput && !colorLayers && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-800">
            {t("Výška modelu zo SVG alebo obrázka")}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {t("Používa sa pri SVG a obrázkoch (PNG, JPG). Z obrázka sa vytiahne tmavý tvar alebo nepriehľadná časť PNG. Odporúčaná hodnota je 10 mm.")}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              value={svgThicknessMm}
              onChange={(e) => setSvgThicknessMm(Number(e.target.value || 10))}
              onKeyDown={(e) => { if (e.key === "." || e.key === ",") e.preventDefault(); }}
              className="w-32 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00]"
            />
            <span className="text-sm text-neutral-600">mm</span>

            {isSvgMode && (
              <button
                onClick={handleReconvert}
                disabled={isReconverting}
                className="rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e09d00] disabled:opacity-60"
              >
                {isReconverting ? t("Prepočítavam...") : t("↺ Použiť novú výšku")}
              </button>
            )}
          </div>

          {isSvgMode && !isReconverting && (
            <p className="mt-2 text-xs text-neutral-400">
              {t("Aktuálna výška modelu:")} <strong>{svgThicknessMm} mm</strong>.{" "}
              {t("Zmeň hodnotu a klikni „Použiť novú výšku“ — model sa prepočíta a cena sa automaticky aktualizuje.")}
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".stl,.obj,.svg,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t(error)}
        </div>
      )}
    </div>
  );
});

export default UploadBox;
