import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEur, addVat, formatPaidTotal } from "@/lib/vat";
import { COMPANY_INFO } from "@/lib/company-info";
import { getSafeServerSession } from "@/lib/session";
import { formatDateSK } from "@/lib/formatDate";
import ResumeOrderButton from "@/components/ResumeOrderButton";

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
      variableSymbol: true,
      phone: true,
      orderItems: { orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, config: true, pricing: true } },
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

  const paidTotal =
    typeof order.paidTotalEur === "number" ? order.paidTotalEur : null;

  const shippingCostEur =
    typeof shippingCost.amount === "number"
      ? shippingCost.amount / 100
      : null;

  // VAT breakdown odvodený z reálne zaplatenej sumy (nie z interného pricing.total)
  const productionGross =
    paidTotal !== null
      ? paidTotal - (shippingCostEur ?? 0)
      : typeof pricing.total === "number"
      ? addVat(pricing.total)
      : null;

  const productionNet =
    productionGross !== null ? productionGross / 1.23 : null;
  const productionVat =
    productionGross !== null && productionNet !== null
      ? productionGross - productionNet
      : null;

  const total = paidTotal;

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
            <div className="mt-2">
              <StatusBadge status={order.status} />
            </div>
            {order.status === "PENDING" && (
              <ResumeOrderButton orderId={order.id} />
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <DetailCard
            label="Dátum"
            value={formatDateSK(order.createdAt)}
          />
          <DetailCard
            label="Celkom zaplatené"
            value={total !== null ? formatPaidTotal(total) : "—"}
          />
          <DetailCard label="Doprava" value={order.shippingMethod ?? "—"} />
          <DetailCard
            label="Cena dopravy"
            value={shippingCostEur !== null ? formatPaidTotal(shippingCostEur) : "—"}
          />
        </div>
      </section>

      {order.status === "AWAITING_TRANSFER" && (
        <section className="rounded-3xl border border-[#FFAE00]/40 bg-[#FFF8E7] p-6 shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-[#7a5800]">
            Platobné údaje k úhrade prevodom
          </div>
          <p className="mt-2 text-sm text-[#7a5800]">
            Uhraďte prosím sumu nižšie prevodom na náš účet. Výrobu spustíme
            hneď po prijatí platby.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DetailCard label="Príjemca" value={COMPANY_INFO.name} />
            <DetailCard label="IBAN" value={COMPANY_INFO.iban} />
            <DetailCard label="SWIFT/BIC" value={COMPANY_INFO.swift} />
            <DetailCard label="Banka" value={COMPANY_INFO.bankName} />
            <DetailCard
              label="Suma na úhradu"
              value={total !== null ? formatEur(total) : "—"}
              highlight
            />
            <DetailCard
              label="Variabilný symbol"
              value={order.variableSymbol ?? "—"}
              highlight
            />
          </div>
        </section>
      )}

      {/* Multi-model: show individual items */}
      {order.orderItems.length > 1 && (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-neutral-500">Modely v objednávke ({order.orderItems.length})</div>
          <div className="mt-4 space-y-4">
            {order.orderItems.map((item, idx) => {
              const ic = (item.config ?? {}) as Record<string, any>;
              const ip = (item.pricing ?? {}) as Record<string, any>;
              return (
                <div key={item.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFAE00] text-xs font-bold text-black">{idx + 1}</span>
                    <span className="text-sm font-semibold text-neutral-900">{item.fileName}</span>
                    {typeof ip.total === "number" && (
                      <span className="ml-auto text-sm font-extrabold text-neutral-900">{formatEur(addVat(ip.total))}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                    {ic.material && <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold">{ic.material}</span>}
                    {ic.quality && <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold">{ic.quality}</span>}
                    {ic.color && <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold">{ic.color}</span>}
                    {ic.quantity && <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold">{ic.quantity} ks</span>}
                    {ic.scalePct && <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold">{ic.scalePct}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
            value={productionNet !== null ? formatEur(productionNet) : "—"}
          />
          <DetailCard
            label="DPH 23 %"
            value={productionVat !== null ? formatEur(productionVat) : "—"}
          />
          <DetailCard
            label="Výroba s DPH"
            value={productionGross !== null ? formatEur(productionGross) : "—"}
          />
          <DetailCard
            label="Doprava s DPH"
            value={shippingCostEur !== null ? formatPaidTotal(shippingCostEur) : "—"}
          />
          <DetailCard
            label="Celkom s DPH"
            value={total !== null ? formatEur(total) : "—"}
            highlight
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING:            { label: "Čaká na platbu",  className: "bg-yellow-100 text-yellow-800" },
    AWAITING_TRANSFER:  { label: "Čaká na prevod",  className: "bg-orange-100 text-orange-800" },
    PAID:               { label: "Zaplatená",        className: "bg-green-100 text-green-800" },
    IN_PRODUCTION:      { label: "V produkcii",      className: "bg-blue-100 text-blue-800" },
    SHIPPED:            { label: "Odoslaná",         className: "bg-purple-100 text-purple-800" },
    DELIVERED:          { label: "Doručená",         className: "bg-emerald-100 text-emerald-800" },
    CANCELLED:          { label: "Zrušená",          className: "bg-red-100 text-red-800" },
  };
  const s = map[status] ?? { label: status, className: "bg-neutral-100 text-neutral-700" };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${s.className}`}>
      {s.label}
    </span>
  );
}

function DetailCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        highlight
          ? "border-[#FFAE00]/30 bg-[#FFAE00]/10"
          : "border-neutral-200 bg-neutral-50",
      ].join(" ")}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className={[
          "mt-2 break-words text-sm font-semibold",
          highlight ? "text-neutral-900 text-base font-extrabold" : "text-neutral-900",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}