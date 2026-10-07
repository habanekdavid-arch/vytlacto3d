import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import PublishToggle from "@/components/admin/PublishToggle";
import { getInstagramStatus, instagramRedirectUri, isInstagramLoginConfigured } from "@/lib/instagram";
import { syncRepoRealizacie } from "@/lib/realizacie-sync";
import { syncRepoBlog } from "@/lib/blog-sync";

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

export default async function CmsPage({
  searchParams,
}: {
  searchParams: Promise<{ instagram?: string; account?: string; msg?: string }>;
}) {
  const igResult = await searchParams;
  await requireAdmin();
  await Promise.all([syncRepoRealizacie(), syncRepoBlog()]);

  const [blogPosts, realizacie, instagram] = await Promise.all([
    prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.realizacia.findMany({ orderBy: { createdAt: "asc" } }),
    getInstagramStatus(),
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

        {/* Instagram */}
        <section className="mb-10 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-neutral-900">Instagram na hlavnej stránke</h2>
            <div className="flex flex-wrap items-center gap-2">
              {!instagram.configured ? (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">Nepripojené</span>
              ) : instagram.ok ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">✓ Pripojené</span>
              ) : (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">✗ Chyba</span>
              )}
              {isInstagramLoginConfigured() && (
                // Obyčajný odkaz: presmerovanie na instagram.com nesmie ísť cez klientsky router.
                <a
                  href="/api/admin/instagram/connect"
                  className="rounded-full bg-gradient-to-r from-[#FFAE00] via-[#ff5f6d] to-[#c13584] px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:opacity-90"
                >
                  {instagram.configured && instagram.ok ? "Pripojiť znova" : "Pripojiť Instagram"}
                </a>
              )}
            </div>
          </div>

          {igResult.instagram === "connected" && (
            <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
              Pripojený účet <span className="font-semibold">@{igResult.account || "?"}</span>. Príspevky sa na webe objavia do hodiny.
            </p>
          )}
          {igResult.instagram === "error" && (
            <p className="mt-3 break-words rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {igResult.msg === "missing-app"
                ? "Vo Verceli chýba INSTAGRAM_APP_ID alebo INSTAGRAM_APP_SECRET."
                : `Pripojenie sa nepodarilo: ${igResult.msg || "neznáma chyba"}`}
            </p>
          )}

          {!instagram.configured ? (
            <p className="mt-2 text-sm text-neutral-600">
              {isInstagramLoginConfigured()
                ? "Kliknite na „Pripojiť Instagram“ a prihláste sa ako @vytlacto3d. Kým to neurobíte, na webe sa zobrazí len pozvánka na Instagram bez príspevkov."
                : "Vo Verceli chýba INSTAGRAM_APP_ID a INSTAGRAM_APP_SECRET (alebo INSTAGRAM_ACCESS_TOKEN). Kým nie sú nastavené, na webe sa zobrazí len pozvánka na Instagram bez príspevkov."}
            </p>
          ) : instagram.ok ? (
            <p className="mt-2 text-sm text-neutral-600">
              Účet <span className="font-semibold">@{instagram.username ?? "?"}</span>
              {instagram.followersCount !== null && <> · {instagram.followersCount.toLocaleString("sk-SK")} sledujúcich</>}
              {" "}· načítaných príspevkov: {instagram.postCount}.{" "}
              {instagram.tokenRefreshedAt
                ? `Token naposledy obnovený ${new Date(instagram.tokenRefreshedAt).toLocaleDateString("sk-SK")} — web ho predlžuje sám každý týždeň.`
                : "Token z Vercelu — web ho sám predĺži, keď bude starší ako 24 hodín, a potom každý týždeň."}{" "}
              Nové príspevky sa na webe objavia do hodiny.
            </p>
          ) : (
            <p className="mt-2 break-words text-sm text-red-700">{instagram.error}</p>
          )}

          {instagram.configured && instagram.ok && instagram.username && instagram.username.toLowerCase() !== "vytlacto3d" && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Pozor: pripojený je účet @{instagram.username}, nie @vytlacto3d. Kliknite na „Pripojiť znova“ a prihláste sa do správneho účtu.
            </p>
          )}

          {isInstagramLoginConfigured() && (
            <p className="mt-3 text-xs text-neutral-400">
              Adresa návratu (musí byť v Meta aplikácii medzi „Valid OAuth Redirect URIs“):{" "}
              <code className="rounded bg-neutral-100 px-1 text-neutral-600">{instagramRedirectUri()}</code>
            </p>
          )}
        </section>

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
                        <div className="flex items-center gap-3">
                          <CmsThumb src={post.image} />
                          <div className="min-w-0">
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
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-neutral-500">
                        {post.slug}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {post.publishedAt}
                      </td>
                      <td className="px-5 py-4">
                        <PublishToggle
                          endpoint={`/api/admin/cms/blog/${post.id}`}
                          published={post.published}
                          labels={{ on: "Zverejnený", off: "Skrytý" }}
                        />
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
                        <div className="flex items-center gap-3">
                          <CmsThumb src={item.image} />
                          <div className="min-w-0">
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
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {item.category}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {item.material}
                      </td>
                      <td className="px-5 py-4">
                        <PublishToggle
                          endpoint={`/api/admin/cms/realizacie/${item.id}`}
                          published={item.published}
                          labels={{ on: "Zverejnená", off: "Skrytá" }}
                          missingImage={!item.image}
                        />
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

/** Malý náhľad fotky v zozname, aby bolo hneď jasné, o ktorú položku ide. */
function CmsThumb({ src }: { src: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-[10px] text-neutral-400">
        bez fotky
      </div>
    );
  }
  return (
    // Obyčajný <img>: v CMS môže byť URL z ľubovoľnej domény, ktorú next/image nepozná.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      className="h-12 w-16 shrink-0 rounded-lg border border-neutral-200 bg-neutral-100 object-cover"
    />
  );
}
