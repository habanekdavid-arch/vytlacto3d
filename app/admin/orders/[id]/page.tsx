import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

function formatPrice(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")} €`;
}

function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  }).format(date);
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

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "—";
  }
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) notFound();

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/orders"
              className="text-sm font-semibold text-neutral-600 underline underline-offset-4"
            >
              ← Späť na objednávky
            </Link>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
              Detail objednávky
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Detailná správa jednej objednávky vrátane STL modelu, konfigurácie,
              platby a dopravy.
            </p>
          </div>

          <span
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getStatusClasses(
              order.status
            )}`}
          >
            {order.status}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Základné údaje</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Info label="ID objednávky" value={order.id} mono />
                <Info label="Model" value={order.fileName} />
                <Info label="Dátum vytvorenia" value={formatDate(order.createdAt)} />
                <Info label="Zaplatené" value={formatPrice(order.paidTotalEur)} />
                <Info label="Email zákazníka" value={order.customerEmail || "—"} />
                <Info label="Doprava" value={order.shippingMethod || "—"} />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">STL model</h2>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-neutral-50"
                >
                  Otvoriť STL
                </a>

                <a
                  href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
                  download
                  className="rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-bold text-black hover:opacity-90"
                >
                  Stiahnuť STL model
                </a>
              </div>

              <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600 break-all">
                <span className="font-semibold text-neutral-900">fileKey:</span> {order.fileKey}
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Konfigurácia</h2>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-700">
                {prettyJson(order.config)}
              </pre>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Analýza modelu</h2>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-700">
                {prettyJson(order.analysis)}
              </pre>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Cenový rozpis</h2>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-700">
                {prettyJson(order.pricing)}
              </pre>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Stav objednávky</h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {order.status === "PENDING" && (
                  <>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="PAID" />
                      <button className="rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-bold text-black hover:opacity-90">
                        Označiť ako PAID
                      </button>
                    </form>

                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="CANCELED" />
                      <button className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100">
                        Zrušiť objednávku
                      </button>
                    </form>
                  </>
                )}

                {order.status === "PAID" && (
                  <>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="PRINTING" />
                      <button className="rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-bold text-black hover:opacity-90">
                        Spustiť tlač
                      </button>
                    </form>

                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="CANCELED" />
                      <button className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100">
                        Zrušiť objednávku
                      </button>
                    </form>
                  </>
                )}

                {order.status === "PRINTING" && (
                  <>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="DONE" />
                      <button className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90">
                        Označiť ako DONE
                      </button>
                    </form>

                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="CANCELED" />
                      <button className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100">
                        Zrušiť objednávku
                      </button>
                    </form>
                  </>
                )}

                {order.status === "DONE" && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                    Táto objednávka je hotová.
                  </div>
                )}

                {order.status === "CANCELED" && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    Táto objednávka bola zrušená.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Platba a doprava</h2>

              <div className="mt-5 space-y-4">
                <Info label="Stripe Session ID" value={order.stripeSessionId || "—"} mono />
                <Info label="Payment Intent ID" value={order.stripePaymentIntentId || "—"} mono />
                <Info label="Zaplatená suma" value={formatPrice(order.paidTotalEur)} />
                <Info label="Spôsob dopravy" value={order.shippingMethod || "—"} />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Adresa a shipping data</h2>

              <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-700">
                {prettyJson(order.shippingAddress)}
              </pre>

              <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-700">
                {prettyJson(order.shippingCost)}
              </pre>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className={`mt-2 break-all text-sm text-neutral-900 ${
          mono ? "font-mono" : "font-semibold"
        }`}
      >
        {value}
      </div>
    </div>
  );
}