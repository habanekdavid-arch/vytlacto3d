import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSafeServerSession();
  const email = String((session?.user as { email?: string | null })?.email ?? "").toLowerCase();
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!email || !admins.includes(email)) redirect("/");
}

export default async function CmsPage() {
  await requireAdmin();

  const [blogPosts, realizacie] = await Promise.all([
    prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.realizacia.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              CMS
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">
              Správa obsahu
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Tu spravujete blogové články a realizácie zobrazené na webe.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/orders"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              ← Objednávky
            </a>
            <a
              href="/"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-50"
            >
              Späť na web
            </a>
          </div>
        </div>

        {/* Blog posts section */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-neutral-900">
              Blog ({blogPosts.length})
            </h2>
            <Link
              href="/admin/cms/blog/new"
              className="rounded-2xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black hover:bg-[#e09d00]"
            >
              + Nový článok
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            {blogPosts.length === 0 ? (
              <p className="p-6 text-sm text-neutral-400">Žiadne články.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3">Titulok</th>
                    <th className="px-5 py-3">Slug</th>
                    <th className="px-5 py-3">Dátum</th>
                    <th className="px-5 py-3">Stav</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900">
                            {post.title}
                          </span>
                          {post.featured && (
                            <span className="rounded-full bg-[#FFAE00]/20 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {post.readingTime}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-neutral-500">
                        {post.slug}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {post.publishedAt}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            "rounded-full px-2 py-1 text-xs font-bold",
                            post.published
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-100 text-neutral-500",
                          ].join(" ")}
                        >
                          {post.published ? "Zverejnený" : "Skrytý"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/cms/blog/${post.id}`}
                          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          Upraviť
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Realizacie section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-neutral-900">
              Realizácie ({realizacie.length})
            </h2>
            <Link
              href="/admin/cms/realizacie/new"
              className="rounded-2xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black hover:bg-[#e09d00]"
            >
              + Nová realizácia
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            {realizacie.length === 0 ? (
              <p className="p-6 text-sm text-neutral-400">Žiadne realizácie.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3">Titulok</th>
                    <th className="px-5 py-3">Kategória</th>
                    <th className="px-5 py-3">Materiál</th>
                    <th className="px-5 py-3">Stav</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {realizacie.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900">
                            {item.title}
                          </span>
                          {item.featured && (
                            <span className="rounded-full bg-[#FFAE00]/20 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-neutral-400">
                          {item.slug}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {item.category}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {item.material}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            "rounded-full px-2 py-1 text-xs font-bold",
                            item.published
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-100 text-neutral-500",
                          ].join(" ")}
                        >
                          {item.published ? "Zverejnená" : "Skrytá"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/cms/realizacie/${item.id}`}
                          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          Upraviť
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
