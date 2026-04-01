export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPriceWithVat } from "@/lib/vat";
import { getSafeServerSession } from "@/lib/session";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined;

  if (!sessionUser?.id) {
    redirect("/prihlasenie");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: sessionUser.id,
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      fileName: true,
      fileKey: true,
      analysis: true,
      config: true,
      pricing: true,
      customerEmail: true,
      paidTotalEur: true,
      shippingAddress: true,
      shippingCost: true,
      shippingMethod: true,
      stripeSessionId: true,
    },
  });

  if (!order) {
    notFound();
  }

  const analysis = (order.analysis ?? {}) as Record<string, any>;
  const config = (order.config ?? {}) as Record<string, any>;
  const pricing = (order.pricing ?? {}) as Record<string, any>;
  const shippingAddress = (order.shippingAddress ?? {}) as Record<string, any>;
  const shippingCost = (order.shippingCost ?? {}) as Record<string, any>;

  const total =
    typeof order.paidTotalEur === "number"
      ? order.paidTotalEur
      : typeof pricing.total === "number"
      ? pricing.total
      : null;

  const shippingCostEur =
    typeof shippingCost.amount === "number"
      ? shippingCost.amount / 100
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-neutral-500">
              Detail objednávky
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              {order.fileName}
            </h2>
            <div className="mt-2 text-sm text-neutral-600">
              ID objednávky: <span className="font-mono">{order.id}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#FFAE00]/30 bg-[#FFAE00]/10 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Stav objednávky
            </div>
            <div className="mt-1 text-lg font-extrabold text-neutral-900">
              {order.status}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <DetailCard
            label="Dátum"
            value={new Date(order.createdAt).toLocaleString("sk-SK")}
          />
          <DetailCard
            label="Cena spolu"
            value={total !== null ? formatPriceWithVat(total) : "—"}
          />
          <DetailCard
            label="Doprava"
            value={order.shippingMethod ?? "—"}
          />
          <DetailCard
            label="Cena dopravy"
            value={
              shippingCostEur !== null ? formatPriceWithVat(shippingCostEur) : "—"
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Konfigurácia</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCard label="Materiál" value={String(config.material ?? "—")} />
          <DetailCard label="Kvalita" value={String(config.quality ?? "—")} />
          <DetailCard label="Farba" value={String(config.color ?? "—")} />
          <DetailCard label="Počet kusov" value={String(config.quantity ?? "—")} />
          <DetailCard label="Infill" value={`${String(config.infillPct ?? "—")}%`} />
          <DetailCard label="Mierka" value={`${String(config.scalePct ?? "100")}%`} />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Analýza modelu</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCard
            label="Rozmer X"
            value={
              analysis.dimsXmm !== undefined ? `${analysis.dimsXmm} mm` : "—"
            }
          />
          <DetailCard
            label="Rozmer Y"
            value={
              analysis.dimsYmm !== undefined ? `${analysis.dimsYmm} mm` : "—"
            }
          />
          <DetailCard
            label="Rozmer Z"
            value={
              analysis.dimsZmm !== undefined ? `${analysis.dimsZmm} mm` : "—"
            }
          />
          <DetailCard
            label="Objem"
            value={
              analysis.volumeCm3 !== undefined ? `${analysis.volumeCm3} cm³` : "—"
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Cenový rozpis</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCard
            label="Cena výroby spolu"
            value={
              typeof pricing.productionSubtotal === "number"
                ? formatPriceWithVat(pricing.productionSubtotal)
                : "—"
            }
          />
          <DetailCard
            label="Základ za model"
            value={
              typeof pricing.setupFee === "number"
                ? formatPriceWithVat(pricing.setupFee)
                : "—"
            }
          />
          <DetailCard
            label="Množstevná zľava"
            value={
              typeof pricing.quantityDiscountAmount === "number"
                ? pricing.quantityDiscountAmount > 0
                  ? `-${formatPriceWithVat(pricing.quantityDiscountAmount)}`
                  : "bez zľavy"
                : "—"
            }
          />
          <DetailCard
            label="Cena dopravy"
            value={
              shippingCostEur !== null ? formatPriceWithVat(shippingCostEur) : "—"
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Dodacie údaje</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCard
            label="Email zákazníka"
            value={order.customerEmail ?? sessionUser.email ?? "—"}
          />
          <DetailCard
            label="Meno"
            value={String(shippingAddress.name ?? "—")}
          />
          <DetailCard
            label="Telefón"
            value={String(shippingAddress.phone ?? "—")}
          />
          <DetailCard
            label="Adresa"
            value={String(shippingAddress.address ?? shippingAddress.line1 ?? "—")}
          />
          <DetailCard
            label="Druhý riadok adresy"
            value={String(shippingAddress.line2 ?? "—")}
          />
          <DetailCard
            label="Mesto"
            value={String(shippingAddress.city ?? "—")}
          />
          <DetailCard
            label="PSČ"
            value={String(shippingAddress.postal_code ?? "—")}
          />
          <DetailCard
            label="Krajina"
            value={String(shippingAddress.country ?? "—")}
          />
        </div>
      </section>
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-neutral-900">
        {value}
      </div>
    </div>
  );
}