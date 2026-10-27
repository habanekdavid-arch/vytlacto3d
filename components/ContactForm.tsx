"use client";

import { useEffect, useRef, useState } from "react";
import { relaxAcceptOnMobile } from "@/lib/file-accept";
import {
  CONTACT_ACCEPT,
  CONTACT_BLOB_PREFIX,
  CONTACT_FORMATS_HINT,
  CONTACT_MAX_FILES,
  CONTACT_MAX_FILE_MB,
  formatFileSize,
  isAllowedContactFile,
  safeContactFileName,
  type ContactAttachment,
} from "@/lib/contact-attachments";
import { useT } from "@/lib/i18n/client";
import { INQUIRY_TYPES, type InquiryType } from "@/lib/contact-inquiry";

type AttachmentItem = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  uploaded?: ContactAttachment;
};

function PaperclipIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

const inputClasses =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 hover:border-neutral-300 focus:border-[#FFAE00] focus:outline-none focus:ring-4 focus:ring-[#FFAE00]/15";

// Výber typu dopytu — dve karty nad formulárom.
const INQUIRY_CARDS: Record<InquiryType, { title: string; text: string; icon: string }> = {
  "mam-model": {
    title: "Mám 3D model",
    text: "Pošlite súbor (STL, OBJ, 3MF, STEP…) a napíšte, čo potrebujete.",
    icon: "📦",
  },
  "hladat-model": {
    title: "Nemám 3D model",
    text: "Nájdite si ho na internete, stiahnite a vložte sem.",
    icon: "🔎",
  },
};

// Stránky s 3D modelmi na stiahnutie — pre zákazníka, ktorý model nemá.
const MODEL_SITES = [
  { name: "Printables", url: "https://www.printables.com/" },
  { name: "Thingiverse", url: "https://www.thingiverse.com/" },
  { name: "MakerWorld", url: "https://makerworld.com/" },
];

export default function ContactForm({
  title = "Nenašli ste odpoveď?",
  subtitle = "Napíšte nám priamo cez formulár nižšie, odpovieme vám čo najskôr.",
}: {
  title?: string;
  subtitle?: string;
} = {}) {
  const t = useT();
  const [inquiryType, setInquiryType] = useState<InquiryType>("mam-model");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Na mobile by 3D súbory boli vo výbere zosivené (pozri lib/file-accept).
  useEffect(() => relaxAcceptOnMobile(fileInputRef.current), []);
  // Odkaz ?dopyt=hladat-model otvorí formulár rovno na hľadanie modelu.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("dopyt");
    if (INQUIRY_TYPES.includes(fromUrl as InquiryType)) setInquiryType(fromUrl as InquiryType);
  }, []);
  const searching = inquiryType === "hladat-model";

  const uploading = attachments.some((a) => a.status === "uploading");

  function patchAttachment(id: string, patch: Partial<AttachmentItem>) {
    setAttachments((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function uploadAttachment(item: AttachmentItem, file: File) {
    try {
      const { upload } = await import("@vercel/blob/client");
      const contentType = file.type || "application/octet-stream";
      const blob = await upload(`${CONTACT_BLOB_PREFIX}${safeContactFileName(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/contact/upload",
        multipart: file.size > 8 * 1024 * 1024,
        contentType,
        onUploadProgress: ({ percentage }) => patchAttachment(item.id, { progress: Math.round(percentage) }),
      });
      patchAttachment(item.id, {
        status: "done",
        progress: 100,
        uploaded: { url: blob.url, name: file.name, size: file.size, contentType },
      });
    } catch {
      patchAttachment(item.id, { status: "error", error: t("Nahrávanie zlyhalo.") });
    }
  }

  function addFiles(list: FileList | File[]) {
    setAttachError(null);
    const files = Array.from(list);
    const free = CONTACT_MAX_FILES - attachments.length;
    const problems: string[] = [];
    const accepted: { item: AttachmentItem; file: File }[] = [];

    for (const file of files) {
      if (accepted.length >= free) {
        problems.push(t("Najviac {n} príloh.", { n: CONTACT_MAX_FILES }));
        break;
      }
      if (!isAllowedContactFile(file.name)) {
        problems.push(`${file.name}: ${t("tento formát nepodporujeme.")}`);
        continue;
      }
      if (file.size > CONTACT_MAX_FILE_MB * 1024 * 1024) {
        problems.push(`${file.name}: ${t("má viac ako {n} MB.", { n: CONTACT_MAX_FILE_MB })}`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name}: ${t("súbor je prázdny.")}`);
        continue;
      }
      const item: AttachmentItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
      };
      accepted.push({ item, file });
    }

    if (problems.length) setAttachError(problems.join(" "));
    if (!accepted.length) return;
    setAttachments((cur) => [...cur, ...accepted.map((a) => a.item)]);
    for (const { item, file } of accepted) void uploadAttachment(item, file);
  }

  function removeAttachment(id: string) {
    setAttachments((list) => list.filter((a) => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) {
      setError(t("Počkajte prosím, kým sa nahrajú všetky prílohy."));
      setStatus("error");
      return;
    }
    if (attachments.some((a) => a.status === "error")) {
      setError(t("Niektorú prílohu sa nepodarilo nahrať — odstráňte ju alebo ju pridajte znova."));
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryType,
          name,
          email,
          subject,
          message,
          website,
          attachments: attachments.flatMap((a) => (a.uploaded ? [a.uploaded] : [])),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? t("Niečo sa pokazilo. Skúste to prosím znova."));
        setStatus("error");
        return;
      }

      setStatus("ok");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setAttachments([]);
      setAttachError(null);
    } catch {
      setError(t("Sieťová chyba. Skúste to prosím znova."));
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="relative mt-12 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#FFAE00]/10 blur-3xl" />
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-2xl text-white">
            ✓
          </div>
          <div className="mt-4 text-lg font-bold text-neutral-900">{t("Ďakujeme za správu!")}</div>
          <p className="mt-2 text-sm text-neutral-600">
            {t("Ozveme sa vám čo najskôr na uvedený email.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/card relative mt-12 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#FFAE00]/30 hover:shadow-xl hover:shadow-[#FFAE00]/10 sm:p-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-[#FFAE00]/10 blur-3xl transition-opacity duration-300 group-hover/card:opacity-70" />
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
          {t("Napíšte nám")}
        </div>

        <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
          {t(title)}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {t(subtitle)}
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("Typ dopytu")}>
        {INQUIRY_TYPES.map((type) => {
          const card = INQUIRY_CARDS[type];
          const active = inquiryType === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setInquiryType(type)}
              className={[
                "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition",
                active
                  ? "border-[#FFAE00] bg-[#FFAE00]/10 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300",
              ].join(" ")}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {card.icon}
              </span>
              <span>
                <span className="block text-sm font-extrabold text-neutral-900">{t(card.title)}</span>
                <span className="mt-1 block text-xs leading-relaxed text-neutral-600">{t(card.text)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {searching && (
        <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs leading-relaxed text-violet-900">
          <div className="font-bold">{t("Ako na to:")}</div>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>
              {t("Nájdite model na internete, napr. na")}{" "}
              {MODEL_SITES.map((site, i) => (
                <span key={site.url}>
                  <a href={site.url} target="_blank" rel="noreferrer" className="font-semibold underline">
                    {site.name}
                  </a>
                  {i < MODEL_SITES.length - 1 ? ", " : "."}
                </span>
              ))}
            </li>
            <li>{t("Stiahnite súbor modelu (STL alebo 3MF).")}</li>
            <li>
              {t("Vložte ho nižšie do príloh — alebo ho rovno nahrajte do")}{" "}
              <a href="/#kalkulator" className="font-semibold underline">
                {t("kalkulátora")}
              </a>{" "}
              {t("a cenu uvidíte hneď.")}
            </li>
          </ol>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        <div className="sm:col-span-1">
          <label className="text-sm font-semibold text-neutral-700">{t("Meno *")}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-1">
          <label className="text-sm font-semibold text-neutral-700">{t("Email *")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">{t("Predmet *")}</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={searching ? t("napr. Držiak na bicykel") : t("napr. Tlač 10 kusov držiaka")}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">
            {searching ? t("Čo potrebujete vytlačiť? *") : t("Správa *")}
          </label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              searching
                ? t("Popis, rozmery, počet kusov, materiál alebo farba…")
                : t("Materiál, farba, počet kusov, termín…")
            }
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-neutral-700">
            {searching ? t("Stiahnutý 3D model") : t("3D model a ďalšie prílohy")}{" "}
            <span className="font-normal text-neutral-400">{t("(nepovinné)")}</span>
          </label>

          <div
            role="button"
            tabIndex={attachments.length >= CONTACT_MAX_FILES ? -1 : 0}
            aria-label={t("Pridať prílohy")}
            onClick={() => {
              if (attachments.length < CONTACT_MAX_FILES) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && attachments.length < CONTACT_MAX_FILES) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            // Safari a Firefox pustia súbor na prvok, len keď ho prijme už pri dragenter.
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className={[
              "mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFAE00]/30",
              dragOver ? "border-[#FFAE00] bg-[#FFAE00]/10" : "border-neutral-200 bg-neutral-50/60 hover:border-neutral-300",
              attachments.length >= CONTACT_MAX_FILES ? "opacity-60" : "",
            ].join(" ")}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm">
              <PaperclipIcon />
            </span>
            <p className="text-sm text-neutral-700">
              <span className="hidden sm:inline">{t("Presuňte súbory sem alebo")} </span>
              <span className="font-bold text-neutral-900 underline decoration-[#FFAE00] decoration-2 underline-offset-4">
                {attachments.length >= CONTACT_MAX_FILES ? t("Maximálny počet príloh") : t("vyberte súbory")}
              </span>
            </p>
            <p className="text-xs text-neutral-500">
              {t(CONTACT_FORMATS_HINT)} · {t("najviac {n} súborov, každý do {mb} MB", { n: CONTACT_MAX_FILES, mb: CONTACT_MAX_FILE_MB })}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={CONTACT_ACCEPT}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {attachError && <p className="mt-2 text-xs text-red-600">{attachError}</p>}

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm"
                >
                  {a.status === "uploading" && (
                    <div
                      className="absolute inset-y-0 left-0 bg-[#FFAE00]/15 transition-all"
                      style={{ width: `${a.progress}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <PaperclipIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-neutral-800">{a.name}</span>
                    <span
                      className={`shrink-0 text-xs ${
                        a.status === "error" ? "text-red-600" : a.status === "done" ? "text-green-700" : "text-neutral-500"
                      }`}
                    >
                      {a.status === "uploading"
                        ? `${a.progress} %`
                        : a.status === "done"
                          ? `✓ ${formatFileSize(a.size)}`
                          : a.error}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label={`${t("Odstrániť")} ${a.name}`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {status === "error" && error && (
          <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-center sm:col-span-2">
          <button
            type="submit"
            disabled={status === "sending" || uploading}
            className="rounded-2xl bg-[#FFAE00] px-8 py-3 text-sm font-bold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFAE00]/30 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {status === "sending" ? "Odosielam..." : uploading ? t("Nahrávam prílohy...") : t("Odoslať správu")}
          </button>
        </div>
      </form>
    </div>
  );
}
