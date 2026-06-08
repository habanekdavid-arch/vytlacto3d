import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEur, addVat, vatAmount, formatPriceWithVat } from "@/lib/vat";
import { getSafeServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined;

  if (!sessionUser?.id && !sessionUser?.email) {
    redirect("/prihlasenie");
  }

  const { id } = await params;

  const orClauses: any[] = [];
  if (sessionUser?.id) orClauses.push({ userId: sessionUser.id });
  if (sessionUser?.email) orClauses.push({ customerEmail: sessionUser.email });

  const order = await prisma.order.findFirst({
    where: {
      id,
      OR: orClauses,
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
      deliveryAddress: true,
      billingAddress: true,
      shippingCost: true,
      shippingMethod: true,
      stripeSessionId: true,
      orderNumber: true,
      phone: true,
    },
  });

  if (!order) {
    notFound();
  }

  const analysis = (order.analysis ?? {}) as Record<string, any>;
  const config = (order.config ?? {}) as Record<string, any>;
  const pricing = (order.pricing ?? {}) as Record<string, any>;
  // Adresa: preferuj deliveryAddress, fallback na shippingAddress, potom billingAddress
  const rawDelivery = (order.deliveryAddress ?? {}) as Record<string, any>;
  const rawShipping = (order.shippingAddress ?? {}) as Record<string, any>;
  const rawBilling = (order.billingAddress ?? {}) as Record<string, any>;
  const addr = {
    name: rawDelivery.name ?? rawShipping.name ?? rawBilling.name ?? null,
    phone: rawDelivery.phone ?? rawShipping.phone ?? rawBilling.phone ?? (order as any).phone ?? null,
    street: rawDelivery.street ?? rawShipping.street ?? rawBilling.street ?? rawBilling.line1 ?? null,
    line2: rawDelivery.line2 ?? rawShipping.line2 ?? rawBilling.line2 ?? null,
    city: rawDelivery.city ?? rawShipping.city ?? rawBilling.city ?? null,
    zip: rawDelivery.zip ?? rawShipping.zip ?? rawBilling.zip ?? rawBilling.postal_code ?? null,
    country: rawDelivery.country ?? rawShipping.country ?? rawBilling.country ?? null,
  };
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
            label="Celkom zaplatené"
            value={total !== null ? formatEur(total) : "—"}
          />
          <DetailCard label="Doprava" value={order.shippingMethod ?? "—"} />
          <DetailCard
            label="Cena dopravy"
            value={shippingCostEur !== null ? formatEur(shippingCostEur) : "—"}
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
            value={analysis.dimsXmm !== undefined ? `${analysis.dimsXmm} mm` : "—"}
          />
          <DetailCard
            label="Rozmer Y"
            value={analysis.dimsYmm !== undefined ? `${analysis.dimsYmm} mm` : "—"}
          />
          <DetailCard
            label="Rozmer Z"
            value={analysis.dimsZmm !== undefined ? `${analysis.dimsZmm} mm` : "—"}
          />
          <DetailCard
            label="Objem"
            value={analysis.volumeCm3 !== undefined ? `${analysis.volumeCm3} cm³` : "—"}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Cenový rozpis</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCard
            label="Základ bez DPH"
            value={
              typeof pricing.total === "number" ? formatEur(pricing.total) : "—"
            }
          />
          <DetailCard
            label="DPH 23 %"
            value={
              typeof pricing.total === "number"
                ? formatEur(vatAmount(pricing.total))
                : "—"
            }
          />
          <DetailCard
            label="Výroba s DPH"
            value={
              typeof pricing.total === "number"
                ? formatEur(addVat(pricing.total))
                : "—"
            }
          />
          <DetailCard
            label="Doprava"
            value={shippingCostEur !== null ? formatEur(shippingCostEur) : "—"}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Dodacie údaje</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCard label="Email zákazníka" value={order.customerEmail ?? sessionUser?.email ?? "—"} />
          <DetailCard label="Meno" value={addr.name ?? "—"} />
          <DetailCard label="Telefón" value={addr.phone ?? (order as any).phone ?? "—"} />
          <DetailCard label="Ulica" value={addr.street ?? "—"} />
          {addr.line2 && <DetailCard label="Doplnenie adresy" value={addr.line2} />}
          <DetailCard label="Mesto" value={addr.city ?? "—"} />
          <DetailCard label="PSČ" value={addr.zip ?? "—"} />
          <DetailCard label="Krajina" value={addr.country ?? "—"} />
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