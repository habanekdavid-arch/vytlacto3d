import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCommunityViewer } from "@/lib/komunita-db";
import NewPostForm from "@/components/komunita/NewPostForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pridať výtlačok do komunity",
  robots: { index: false },
};

export default async function PridatPage() {
  const viewer = await getCommunityViewer();
  if (!viewer) redirect("/prihlasenie?callbackUrl=/komunita/pridat");

  const orders = await prisma.order.findMany({
    where: { userId: viewer.id, status: { in: ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, orderNumber: true, fileName: true, createdAt: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/komunita"
        className="mb-8 inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      >
        ← Späť do komunity
      </Link>

      <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">Pochváľ sa svojím výtlačkom</h1>
      <p className="mt-3 text-neutral-600">
        Ako ti výtlačok pomohol a ako vyzerá v praxi? Tvoja skúsenosť pomôže ostatným rozhodnúť sa.
      </p>

      <div className="mt-10 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <NewPostForm
          orders={orders.map((o) => ({
            id: o.id,
            label: `${o.orderNumber ?? "Objednávka"} · ${o.fileName} · ${o.createdAt.toLocaleDateString("sk-SK")}`,
          }))}
        />
      </div>
    </main>
  );
}
