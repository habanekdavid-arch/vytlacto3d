"use client";

import { useRef, useState } from "react";

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

  async function handleFile(file: File) {
    setError("");
    onUploadingChange?.(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const uploadText = await uploadRes.text();
      let uploadData: any = null;

      try {
        uploadData = JSON.parse(uploadText);
      } catch {
        uploadData = { error: uploadText };
      }

      console.log("UPLOAD STATUS:", uploadRes.status);
      console.log("UPLOAD DATA:", uploadData);

      if (!uploadRes.ok) {
        throw new Error(uploadData?.error || "Upload zlyhal.");
      }

      if (!uploadData?.fileKey) {
        throw new Error("Upload nevrátil fileKey.");
      }

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileKey: uploadData.fileKey,
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
        }),
      });

      const analyzeText = await analyzeRes.text();
      let analyzeData: any = null;

      try {
        analyzeData = JSON.parse(analyzeText);
      } catch {
        analyzeData = { error: analyzeText };
      }

      console.log("ANALYZE STATUS:", analyzeRes.status);
      console.log("ANALYZE DATA:", analyzeData);

      if (!analyzeRes.ok) {
        throw new Error(analyzeData?.error || "Analýza zlyhala.");
      }

      if (!analyzeData?.analysis) {
        throw new Error("Analyze API nevrátil analysis.");
      }

      onUploaded({
        fileKey: uploadData.fileKey,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
        analysis: analyzeData.analysis,
      });
    } catch (e: any) {
      console.error("UPLOAD FLOW ERROR:", e);
      setError(e?.message || "Nepodarilo sa spracovať súbor.");
    } finally {
      onUploadingChange?.(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 16V6"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 10L12 6L16 10"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 18H19"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="mt-4 text-xl font-extrabold text-neutral-900">
          Nahrajte STL súbor
        </h3>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
          Pretiahnite súbor sem alebo kliknite a vyberte STL model z počítača.
          Po nahratí automaticky prebehne analýza modelu.
        </p>

        <div className="mt-5 inline-flex rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm">
          Vybrať STL súbor
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          Podporovaný formát: .STL
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".stl"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}