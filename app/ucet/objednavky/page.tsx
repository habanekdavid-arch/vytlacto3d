import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPriceWithVat } from "@/lib/vat";
import { getSafeServerSession } from "@/lib/session";

export default async function OrdersPage() {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) {
    return null;
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: sessionUser.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      fileName: true,
      pricing: true,
      paidTotalEur: true,
      shippingMethod: true,
    },
  });

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-neutral-500">
            Moje objednávky
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
            História objednávok
          </h2>
        </div>

        <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
          {orders.length} objednávok
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
          Zatiaľ tu nevidíte žiadne objednávky.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const pricing = order.pricing as { total?: number } | null | undefined;

            const total =
              typeof order.paidTotalEur === "number"
                ? order.paidTotalEur
                : typeof pricing?.total === "number"
                ? pricing.total
                : null;

            return (
              <Link
                key={order.id}
                href={`/ucet/objednavky/${order.id}`}
                className="block rounded-2xl border border-neutral-200 p-4 transition hover:bg-neutral-50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-neutral-500">{order.id}</div>
                    <div className="mt-1 truncate text-lg font-bold text-neutral-900">
                      {order.fileName}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600">
                      {new Date(order.createdAt).toLocaleString("sk-SK")}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 md:min-w-[420px]">
                    <InfoMini label="Stav" value={order.status} />
                    <InfoMini
                      label="Cena"
                      value={total !== null ? formatPriceWithVat(total) : "—"}
                    />
                    <InfoMini
                      label="Doprava"
                      value={order.shippingMethod ?? "—"}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InfoMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}