import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatPricePair, formatEur, addVat } from "@/lib/vat";

async function updateOrderStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");

  if (!id || !status) return;

  await prisma.order.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

function formatDateBratislava(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  }).format(d);
}

function getConfigLabel(config: any) {
  if (!config || typeof config !== "object") return "—";

  const material = config.material ?? "—";

  const quality =
    config.quality === "DRAFT"
      ? "Rýchla"
      : config.quality === "STANDARD"
      ? "Štandard"
      : config.quality === "FINE"
      ? "Detailná"
      : "—";

  const infill =
    typeof config.infillPct === "number" ? `${config.infillPct}% infill` : "—";

  const quantity =
    typeof config.quantity === "number" ? `${config.quantity} ks` : "—";

  const color = config.color ?? "—";

  return `${material} • ${quality} • ${infill} • ${color} • ${quantity}`;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "PENDING":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "PAID":
      return "border-[#FFAE00]/40 bg-[#FFAE00]/15 text-neutral-900";
    case "PRINTING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "DONE":
      return "border-green-200 bg-green-50 text-green-700";
    case "CANCELED":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const ordersRaw = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const orders = ordersRaw.map((order) => ({
    id: order.id,
    fileName: order.fileName,
    fileKey: order.fileKey,
    status: order.status,
    customerEmail: order.customerEmail ?? "—",
    shippingMethod: order.shippingMethod ?? "—",
    stripeSessionId: order.stripeSessionId ?? null,
    paidTotal: formatPricePair(order.paidTotalEur ?? null),
    createdAtText: formatDateBratislava(order.createdAt),
    configLabel: getConfigLabel(order.config),
  }));

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const paidOrders = orders.filter((o) => o.status === "PAID").length;
  const printingOrders = orders.filter((o) => o.status === "PRINTING").length;
  const doneOrders = orders.filter((o) => o.status === "DONE").length;

  const revenueWithoutVat = ordersRaw.reduce((sum, order) => {
    return sum + (typeof order.paidTotalEur === "number" ? order.paidTotalEur : 0);
  }, 0);

  const revenueWithVat = addVat(revenueWithoutVat);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Klientský admin
            </div>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
              Správa objednávok 3D tlače
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Tu klient alebo administrátor vidí všetky objednávky, ich stav,
              cenu, konfiguráciu aj STL model od zákazníka.
            </p>
          </div>

          <a
            href="/"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-50"
          >
            Späť na web
          </a>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Objednávky" value={String(totalOrders)} hint="Všetky objednávky" />
          <StatCard title="Čakajúce" value={String(pendingOrders)} hint="Status PENDING" />
          <StatCard title="Zaplatené" value={String(paidOrders)} hint="Status PAID" highlight />
          <StatCard title="Tlačia sa" value={String(printingOrders)} hint="Status PRINTING" />
          <StatCard title="Hotové" value={String(doneOrders)} hint="Status DONE" />
          <StatCard
            title="Tržby"
            value={formatEur(revenueWithoutVat)}
            hint={`${formatEur(revenueWithVat)} s DPH`}
          />
        </section>

        <section className="mt-8 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="text-lg font-semibold text-neutral-800">
                Zatiaľ tu nie sú žiadne objednávky
              </div>
              <p className="mt-2 text-sm text-neutral-500">
                Keď zákazník odošle objednávku cez konfigurátor, zobrazí sa tu.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr_auto]">
                  <div>
                    <div className="font-mono text-xs text-neutral-500">{order.id}</div>

                    <div className="mt-2 text-lg font-bold text-neutral-900">
                      {order.fileName}
                    </div>

                    <div className="mt-2 break-all text-xs text-neutral-500">
                      {order.fileKey}
                    </div>

                    <div className="mt-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-semibold text-neutral-900 underline underline-offset-4"
                      >
                        Otvoriť detail objednávky
                      </Link>
                    </div>

                    {order.stripeSessionId ? (
                      <div className="mt-2 text-xs text-neutral-500">
                        Stripe session:{" "}
                        <span className="font-mono">
                          {order.stripeSessionId.slice(0, 18)}...
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Konfigurácia
                    </div>
                    <div className="mt-2 text-sm text-neutral-700">
                      {order.configLabel}
                    </div>

                    <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Kontakt
                    </div>
                    <div className="mt-2 text-sm text-neutral-700">
                      {order.customerEmail}
                    </div>

                    {order.shippingMethod !== "—" ? (
                      <div className="mt-2 text-xs text-neutral-500">
                        Doprava: {order.shippingMethod}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Cena
                    </div>
                    <div className="mt-2 text-lg font-bold text-neutral-900">
                      {order.paidTotal.withoutVat}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {order.paidTotal.withVat} s DPH
                    </div>

                    <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Dátum
                    </div>
                    <div className="mt-2 text-sm text-neutral-600">
                      {order.createdAtText}
                    </div>

                    <div className="mt-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 xl:min-w-[180px]">
                    <a
                      href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-center text-xs font-bold text-neutral-900 hover:bg-neutral-50"
                    >
                      Otvoriť STL
                    </a>

                    <a
                      href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
                      download
                      className="rounded-xl bg-[#FFAE00] px-3 py-2 text-center text-xs font-bold text-black hover:opacity-90"
                    >
                      Stiahnuť STL
                    </a>

                    {order.status === "PENDING" && (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="PAID" />
                        <button className="w-full rounded-xl bg-[#FFAE00] px-3 py-2 text-xs font-bold text-black hover:opacity-90">
                          Označiť PAID
                        </button>
                      </form>
                    )}

                    {order.status === "PAID" && (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="PRINTING" />
                        <button className="w-full rounded-xl bg-[#FFAE00] px-3 py-2 text-xs font-bold text-black hover:opacity-90">
                          Spustiť tlač
                        </button>
                      </form>
                    )}

                    {order.status === "PRINTING" && (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="DONE" />
                        <button className="w-full rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white hover:opacity-90">
                          Označiť DONE
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  hint,
  highlight = false,
}: {
  title: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border bg-white p-5 shadow-sm",
        highlight ? "border-[#FFAE00]/50 bg-[#FFAE00]/10" : "border-neutral-200",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-neutral-500">{title}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900">
        {value}
      </div>
      <div className="mt-2 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}