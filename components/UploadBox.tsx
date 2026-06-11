"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

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

export default function UploadBox({
  onUploaded,
  onUploadingChange,
}: {
  onUploaded: (data: Uploaded) => void;
  onUploadingChange?: (value: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [svgThicknessMm, setSvgThicknessMm] = useState(10);

  const [originalSvgFile, setOriginalSvgFile] = useState<File | null>(null);
  const [isReconverting, setIsReconverting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // Zobraz panel hrúbky len ak nie je ešte uploadnutý súbor, alebo ak bol uploadnutý SVG
  const isSvgMode = originalSvgFile !== null;
  const showThicknessInput = !uploadedFileName || isSvgMode;

  function sanitizeFileName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._\-]/g, "_")
      .replace(/_+/g, "_")
      .toLowerCase();
  }

  async function convertSvgToStl(file: File) {
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
    return new File([blob], stlFileName, { type: "model/stl" });
  }

  async function uploadAndAnalyze(file: File): Promise<void> {
    const safeName = sanitizeFileName(file.name);

    const blob = await upload(safeName, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      multipart: true,
      contentType: file.type || "application/octet-stream",
      onUploadProgress: ({ percentage }) => {
        console.log(`Upload progress: ${percentage}%`);
      },
    });

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

    if (!analyzeRes.ok) throw new Error(analyzeData?.error || "Analýza zlyhala.");
    if (!analyzeData?.analysis) throw new Error("Analyze API nevrátil analysis.");

    onUploaded({
      fileKey: blob.url,
      fileName: safeName,
      fileSize: file.size,
      analysis: analyzeData.analysis,
    });

    setUploadedFileName(file.name);
  }

  async function handleFile(originalFile: File) {
    setError("");
    onUploadingChange?.(true);

    try {
      const originalFileName = originalFile.name.toLowerCase();

      const isAllowed =
        originalFileName.endsWith(".stl") ||
        originalFileName.endsWith(".obj") ||
        originalFileName.endsWith(".svg");

      if (!isAllowed) throw new Error("Podporujeme len STL, OBJ a SVG súbory.");

      if (originalFileName.endsWith(".svg")) {
        setOriginalSvgFile(originalFile);
        const stlFile = await convertSvgToStl(originalFile);
        await uploadAndAnalyze(stlFile);
      } else {
        setOriginalSvgFile(null);
        await uploadAndAnalyze(originalFile);
      }
    } catch (e: any) {
      console.error("UPLOAD FLOW ERROR:", e);
      setError(e?.message || "Nepodarilo sa spracovať súbor.");
    } finally {
      onUploadingChange?.(false);
    }
  }

  async function handleReconvert() {
    if (!originalSvgFile) return;
    setIsReconverting(true);
    setError("");
    onUploadingChange?.(true);
    try {
      const stlFile = await convertSvgToStl(originalSvgFile);
      await uploadAndAnalyze(stlFile);
    } catch (e: any) {
      setError(e?.message || "Chyba pri konverzii.");
    } finally {
      setIsReconverting(false);
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
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
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
          Nahrajte STL, OBJ alebo SVG súbor
        </h3>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
          SVG súbor automaticky prevedieme na 3D model s nastavenou hrúbkou.
          STL a OBJ súbory sa spracujú priamo.
        </p>

        <div className="mt-5 inline-flex rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm">
          Vybrať súbor
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          Podporované formáty: .STL, .OBJ, .SVG
        </p>
      </div>

      {showThicknessInput && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-800">
            Výška SVG modelu
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Používa sa iba pri SVG súboroch. Odporúčaná hodnota je 10 mm.
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
                {isReconverting ? "Prepočítavam..." : "↺ Použiť novú výšku"}
              </button>
            )}
          </div>

          {isSvgMode && !isReconverting && (
            <p className="mt-2 text-xs text-neutral-400">
              Aktuálna výška modelu: <strong>{svgThicknessMm} mm</strong>. Zmeň hodnotu a klikni
              „Použiť novú výšku" — model sa prepočíta a cena sa automaticky aktualizuje.
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".stl,.obj,.svg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
