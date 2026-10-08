import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer, reactionCounts } from "@/lib/komunita-db";
import { COMMUNITY_CATEGORIES, isCommunityCategory, publicName } from "@/lib/komunita";
import PostCard from "@/components/komunita/PostCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Komunita – vaše 3D výtlačky v praxi",
  description:
    "Príbehy zákazníkov VytlačTo3D: ako im 3D výtlačky pomohli, ako vyzerajú v praxi a čo by poradili ostatným. Pridajte aj ten svoj.",
};

export default async function KomunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; zoradit?: string }>;
}) {
  const { kategoria, zoradit } = await searchParams;
  const category = isCommunityCategory(kategoria) ? kategoria : null;
  const sort = zoradit === "oblubene" ? "oblubene" : "najnovsie";

  await ensureCommunityTables();
  const viewer = await getCommunityViewer();

  const [posts, myPending, stats] = await Promise.all([
    prisma.communityPost.findMany({
      where: { status: "PUBLISHED", ...(category ? { category } : {}) },
      orderBy:
        sort === "oblubene"
          ? [{ reactions: { _count: "desc" } }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      take: 60,
      include: {
        user: { select: { name: true } },
        _count: { select: { comments: { where: { hidden: false } } } },
      },
    }),
    viewer
      ? prisma.communityPost.count({ where: { userId: viewer.id, status: "PENDING" } })
      : Promise.resolve(0),
    prisma.communityPost.aggregate({ where: { status: "PUBLISHED" }, _count: { _all: true } }),
  ]);
  const reactions = await reactionCounts(posts.map((p) => p.id));

  const addHref = viewer ? "/komunita/pridat" : "/prihlasenie?callbackUrl=/komunita/pridat";

  function filterHref(next: { kategoria?: string | null; zoradit?: string }) {
    const params = new URLSearchParams();
    const k = next.kategoria === undefined ? category : next.kategoria;
    const z = next.zoradit ?? sort;
    if (k) params.set("kategoria", k);
    if (z !== "najnovsie") params.set("zoradit", z);
    const qs = params.toString();
    return qs ? `/komunita?${qs}` : "/komunita";
  }

  const chip = (active: boolean) =>
    [
      "rounded-full border px-4 py-2 text-sm font-semibold transition",
      active
        ? "border-[#FFAE00] bg-[#FFAE00] text-black"
        : "border-neutral-200 bg-white text-neutral-700 hover:border-[#FFAE00]",
    ].join(" ");

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
          Komunita
        </div>

        <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-neutral-900 md:text-6xl">
          Vaše výtlačky v praxi
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-neutral-600">
          Ako vám 3D tlač pomohla? Ukážte, ako váš výtlačok vyzerá po mesiacoch používania, inšpirujte
          ostatných a pýtajte sa na skúsenosti.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={addHref}
            className="rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black shadow-sm transition hover:brightness-95"
          >
            + Pridať môj výtlačok
          </Link>
          <Link
            href="/#kalkulator"
            className="rounded-2xl border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
          >
            Vytlačiť vlastný model
          </Link>
        </div>

        {stats._count._all > 0 && (
          <p className="mt-4 text-sm text-neutral-500">{stats._count._all} príbehov od zákazníkov</p>
        )}
      </section>

      {myPending > 0 && (
        <div className="mb-8 rounded-2xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 px-5 py-4 text-sm text-neutral-800">
          Ďakujeme! {myPending === 1 ? "Tvoj príspevok čaká" : `${myPending} tvoje príspevky čakajú`} na schválenie —
          zvyčajne to netrvá dlhšie ako deň.
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href={filterHref({ kategoria: null })} className={chip(!category)}>
            Všetko
          </Link>
          {COMMUNITY_CATEGORIES.map((c) => (
            <Link key={c} href={filterHref({ kategoria: c })} className={chip(category === c)}>
              {c}
            </Link>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={filterHref({ zoradit: "najnovsie" })} className={chip(sort === "najnovsie")}>
            Najnovšie
          </Link>
          <Link href={filterHref({ zoradit: "oblubene" })} className={chip(sort === "oblubene")}>
            Najobľúbenejšie
          </Link>
        </div>
      </div>

      {posts.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={{
                id: p.id,
                title: p.title,
                story: p.story,
                cover: p.images[0],
                photoCount: p.images.length,
                category: p.category,
                material: p.material,
                author: publicName(p.user.name),
                verified: Boolean(p.orderId),
                createdAt: p.createdAt,
                reactions: reactions.get(p.id) ?? {},
                commentCount: p._count.comments,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center">
          <div className="text-4xl">🧩</div>
          <h2 className="mt-4 text-xl font-extrabold text-neutral-900">
            {category ? "V tejto kategórii zatiaľ nič nie je" : "Buďte prví!"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            Máte od nás výtlačok, ktorý vám uľahčil život? Odfoťte ho a podeľte sa o svoj príbeh.
          </p>
          <Link
            href={addHref}
            className="mt-6 inline-flex rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black shadow-sm transition hover:brightness-95"
          >
            Pridať môj výtlačok
          </Link>
        </div>
      )}
    </main>
  );
}
