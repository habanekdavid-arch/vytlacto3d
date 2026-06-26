"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type ContentSection = {
  heading: string;
  paragraphs: string;
};

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
  year: string;
  material: string;
  size: string;
  leadTime: string;
  seoKeywords: string;
  featured: boolean;
  published: boolean;
  content: ContentSection[];
};

const CATEGORIES = [
  "Prototypovanie",
  "Diel na mieru",
  "Produktový dizajn",
  "Náhradné diely",
  "Firemná výroba",
  "Dizajn",
];

const EMPTY: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  image: "",
  category: CATEGORIES[0],
  year: new Date().getFullYear().toString(),
  material: "PLA",
  size: "",
  leadTime: "2 – 5 dní",
  seoKeywords: "",
  featured: false,
  published: true,
  content: [],
};

export default function RealizacieEditorPage({
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
      fetch(`/api/admin/cms/realizacie/${resolvedId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            slug: data.slug ?? "",
            title: data.title ?? "",
            subtitle: data.subtitle ?? "",
            description: data.description ?? "",
            image: data.image ?? "",
            category: data.category ?? CATEGORIES[0],
            year: data.year ?? "",
            material: data.material ?? "",
            size: data.size ?? "",
            leadTime: data.leadTime ?? "",
            seoKeywords: ((data.seoKeywords as string[]) ?? []).join("\n"),
            featured: data.featured ?? false,
            published: data.published ?? true,
            content: ((data.content as any[]) ?? []).map((s) => ({
              heading: s.heading ?? "",
              paragraphs: (s.paragraphs ?? []).join("\n"),
            })),
          });
        })
        .catch(() => setError("Chyba pri načítaní realizácie."))
        .finally(() => setLoading(false));
    });
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setSectionField(index: number, key: keyof ContentSection, value: string) {
    setForm((prev) => {
      const content = [...prev.content];
      content[index] = { ...content[index], [key]: value };
      return { ...prev, content };
    });
  }

  const addSection = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      content: [...prev.content, { heading: "", paragraphs: "" }],
    }));
  }, []);

  function removeSection(index: number) {
    setForm((prev) => ({
      ...prev,
      content: prev.content.filter((_, i) => i !== index),
    }));
  }

  function moveSection(index: number, dir: -1 | 1) {
    setForm((prev) => {
      const content = [...prev.content];
      const target = index + dir;
      if (target < 0 || target >= content.length) return prev;
      [content[index], content[target]] = [content[target], content[index]];
      return { ...prev, content };
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
        category: form.category,
        year: form.year,
        material: form.material,
        size: form.size,
        leadTime: form.leadTime,
        seoKeywords: form.seoKeywords.split("\n").map((l) => l.trim()).filter(Boolean),
        featured: form.featured,
        published: form.published,
        content: form.content.map((s) => ({
          heading: s.heading,
          paragraphs: s.paragraphs.split("\n").map((l) => l.trim()).filter(Boolean),
        })),
      };

      const url = isNew
        ? "/api/admin/cms/realizacie"
        : `/api/admin/cms/realizacie/${id}`;
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
        router.push(`/admin/cms/realizacie/${result.id}`);
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
    if (
      !confirm(
        `Naozaj vymazať realizáciu „${form.title}"? Táto akcia sa nedá vrátiť.`
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cms/realizacie/${id}`, {
        method: "DELETE",
      });
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
            <a
              href="/admin/cms"
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              ← Správa obsahu
            </a>
            <h1 className="mt-2 text-3xl font-extrabold text-neutral-900">
              {isNew ? "Nová realizácia" : "Upraviť realizáciu"}
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
                placeholder="napr. technicky-prototyp"
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
              <Field label="Kategória">
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rok">
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) => setField("year", e.target.value)}
                  placeholder="2026"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Materiál">
                <input
                  type="text"
                  value={form.material}
                  onChange={(e) => setField("material", e.target.value)}
                  placeholder="PLA / PETG"
                  className={inputCls}
                />
              </Field>
              <Field label="Rozmer / veľkosť">
                <input
                  type="text"
                  value={form.size}
                  onChange={(e) => setField("size", e.target.value)}
                  placeholder="podľa zadania"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Dodacia lehota">
              <input
                type="text"
                value={form.leadTime}
                onChange={(e) => setField("leadTime", e.target.value)}
                placeholder="2 – 4 dni"
                className={inputCls}
              />
            </Field>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField("featured", e.target.checked)}
                  className="h-4 w-4 accent-[#FFAE00]"
                />
                Hlavná realizácia (featured)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setField("published", e.target.checked)}
                  className="h-4 w-4 accent-[#FFAE00]"
                />
                Zverejnená
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
                placeholder="/realizacie/nazov-projektu.jpg"
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

          {/* SEO Keywords */}
          <Card title="SEO kľúčové slová">
            <Field label="Každé kľúčové slovo na novom riadku">
              <textarea
                value={form.seoKeywords}
                onChange={(e) => setField("seoKeywords", e.target.value)}
                rows={4}
                placeholder={"3D tlač prototypov\ntechnický prototyp\nvýroba prototypov"}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Content sections */}
          <Card
            title="Obsah realizácie"
            action={
              <button
                onClick={addSection}
                className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-700"
              >
                + Pridať sekciu
              </button>
            }
          >
            {form.content.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Žiadne sekcie. Kliknite na „Pridať sekciu".
              </p>
            ) : (
              <div className="space-y-4">
                {form.content.map((section, i) => (
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
                          disabled={i === form.content.length - 1}
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
                          onChange={(e) =>
                            setSectionField(i, "heading", e.target.value)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00]"
                        />
                      </Field>
                      <Field label="Odseky (každý odsek na novom riadku)">
                        <textarea
                          value={section.paragraphs}
                          onChange={(e) =>
                            setSectionField(i, "paragraphs", e.target.value)
                          }
                          rows={5}
                          placeholder={"Prvý odsek...\nDruhý odsek..."}
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
              {deleting ? "Mazanie..." : "Vymazať realizáciu"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black hover:bg-[#e09d00] disabled:opacity-50"
          >
            {saving ? "Ukladám..." : saved ? "Uložené ✓" : "Uložiť realizáciu"}
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
