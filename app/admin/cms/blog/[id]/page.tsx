"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Section = {
  heading: string;
  paragraphs: string;
  bullets: string;
};

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  publishedAt: string;
  readingTime: string;
  featured: boolean;
  published: boolean;
  cta: string;
  sections: Section[];
};

const EMPTY: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  image: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  readingTime: "5 min",
  featured: false,
  published: true,
  cta: "",
  sections: [],
};

export default function BlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const isNew = id === "new";

  useEffect(() => {
    params.then(({ id: resolvedId }) => {
      setId(resolvedId);
      if (resolvedId === "new") {
        setLoading(false);
        return;
      }
      fetch(`/api/admin/cms/blog/${resolvedId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            slug: data.slug ?? "",
            title: data.title ?? "",
            subtitle: data.subtitle ?? "",
            description: data.description ?? "",
            image: data.image ?? "",
            publishedAt: data.publishedAt ?? "",
            readingTime: data.readingTime ?? "",
            featured: data.featured ?? false,
            published: data.published ?? true,
            cta: data.cta ?? "",
            sections: ((data.sections as any[]) ?? []).map((s) => ({
              heading: s.heading ?? "",
              paragraphs: (s.paragraphs ?? []).join("\n"),
              bullets: (s.bullets ?? []).join("\n"),
            })),
          });
        })
        .catch(() => setError("Chyba pri načítaní článku."))
        .finally(() => setLoading(false));
    });
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setSectionField(index: number, key: keyof Section, value: string) {
    setForm((prev) => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], [key]: value };
      return { ...prev, sections };
    });
  }

  const addSection = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, { heading: "", paragraphs: "", bullets: "" }],
    }));
  }, []);

  function removeSection(index: number) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  }

  function moveSection(index: number, dir: -1 | 1) {
    setForm((prev) => {
      const sections = [...prev.sections];
      const target = index + dir;
      if (target < 0 || target >= sections.length) return prev;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...prev, sections };
    });
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });
      setField("image", blob.url);
    } catch (e: unknown) {
      setError("Chyba pri nahrávaní: " + (e instanceof Error ? e.message : ""));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        slug: form.slug,
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        image: form.image,
        publishedAt: form.publishedAt,
        readingTime: form.readingTime,
        featured: form.featured,
        published: form.published,
        cta: form.cta || null,
        sections: form.sections.map((s) => ({
          heading: s.heading,
          paragraphs: s.paragraphs.split("\n").map((l) => l.trim()).filter(Boolean),
          bullets: s.bullets.split("\n").map((l) => l.trim()).filter(Boolean),
        })),
      };

      const url = isNew ? "/api/admin/cms/blog" : `/api/admin/cms/blog/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Chyba pri ukladaní.");
      }

      const result = await res.json();
      if (isNew) {
        router.push(`/admin/cms/blog/${result.id}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Neznáma chyba.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Naozaj vymazať článok „${form.title}"? Táto akcia sa nedá vrátiť.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cms/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Chyba pri mazaní.");
      router.push("/admin/cms");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Neznáma chyba.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-neutral-200" />
          <div className="mt-4 h-12 w-80 animate-pulse rounded-2xl bg-neutral-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <a href="/admin/cms" className="text-sm text-neutral-500 hover:text-neutral-700">
              ← Správa obsahu
            </a>
            <h1 className="mt-2 text-3xl font-extrabold text-neutral-900">
              {isNew ? "Nový článok" : "Upraviť článok"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "Mazanie..." : "Vymazať"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-[#FFAE00] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e09d00] disabled:opacity-50"
            >
              {saving ? "Ukladám..." : saved ? "Uložené ✓" : "Uložiť"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Metadata */}
          <Card title="Základné informácie">
            <Field label="Slug (URL)" required>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="napr. kolko-stoji-3d-tlac"
                className={inputCls}
              />
            </Field>
            <Field label="Titulok" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Podtitulok">
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Popis (meta description / SEO)">
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Dátum publikácie">
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setField("publishedAt", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Čas čítania">
                <input
                  type="text"
                  value={form.readingTime}
                  onChange={(e) => setField("readingTime", e.target.value)}
                  placeholder="5 min"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField("featured", e.target.checked)}
                  className="h-4 w-4 accent-[#FFAE00]"
                />
                Hlavný článok (featured)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setField("published", e.target.checked)}
                  className="h-4 w-4 accent-[#FFAE00]"
                />
                Zverejnený
              </label>
            </div>
          </Card>

          {/* Image */}
          <Card title="Obrázok">
            <Field label="URL obrázka">
              <input
                type="text"
                value={form.image}
                onChange={(e) => setField("image", e.target.value)}
                placeholder="/blog/nazov-clanku.jpg"
                className={inputCls}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`cursor-pointer rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 ${uploading ? "pointer-events-none opacity-50" : ""}`}
              >
                {uploading ? "Nahrávam..." : "Nahrať obrázok"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {form.image && (
                <img
                  src={form.image}
                  alt=""
                  className="h-14 w-24 rounded-xl border border-neutral-200 object-cover"
                />
              )}
            </div>
          </Card>

          {/* CTA */}
          <Card title="CTA (voliteľné)">
            <Field label="Text výzvy k akcii (zobrazí sa na konci článku)">
              <textarea
                value={form.cta}
                onChange={(e) => setField("cta", e.target.value)}
                rows={2}
                placeholder="Máte model? Nahrajte ho do konfigurátora..."
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Sections */}
          <Card
            title="Sekcie obsahu"
            action={
              <button
                onClick={addSection}
                className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-700"
              >
                + Pridať sekciu
              </button>
            }
          >
            {form.sections.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Žiadne sekcie. Kliknite na „Pridať sekciu".
              </p>
            ) : (
              <div className="space-y-4">
                {form.sections.map((section, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Sekcia {i + 1}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveSection(i, -1)}
                          disabled={i === 0}
                          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSection(i, 1)}
                          disabled={i === form.sections.length - 1}
                          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeSection(i)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Field label="Nadpis sekcie">
                        <input
                          type="text"
                          value={section.heading}
                          onChange={(e) => setSectionField(i, "heading", e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00]"
                        />
                      </Field>
                      <Field label="Odseky (každý odsek na novom riadku)">
                        <textarea
                          value={section.paragraphs}
                          onChange={(e) => setSectionField(i, "paragraphs", e.target.value)}
                          rows={4}
                          placeholder={"Prvý odsek...\nDruhý odsek..."}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00]"
                        />
                      </Field>
                      <Field label="Odrážky / bullet points (každá na novom riadku)">
                        <textarea
                          value={section.bullets}
                          onChange={(e) => setSectionField(i, "bullets", e.target.value)}
                          rows={3}
                          placeholder={"Prvá odrážka\nDruhá odrážka"}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00]"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Bottom save bar */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? "Mazanie..." : "Vymazať článok"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black hover:bg-[#e09d00] disabled:opacity-50"
          >
            {saving ? "Ukladám..." : saved ? "Uložené ✓" : "Uložiť článok"}
          </button>
        </div>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#FFAE00] bg-white";

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
