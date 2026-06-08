import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEur, addVat, vatAmount } from "@/lib/vat";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  }).format(value);
}

function getValue(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatJson(value: any) {
  if (!value) return "—";
  return JSON.stringify(value, null, 2);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { email?: string | null } | undefined;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = String(sessionUser?.email ?? "").toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    redirect("/");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  const analysis = (order.analysis ?? {}) as Record<string, any>;
  const config = (order.config ?? {}) as Record<string, any>;
  const pricing = (order.pricing ?? {}) as Record<string, any>;

  const shippingAddress = (order.shippingAddress ?? {}) as Record<string, any>;
  const shippingCost = (order.shippingCost ?? {}) as Record<string, any>;
  const billingAddress = (order.billingAddress ?? {}) as Record<string, any>;
  const deliveryAddress = (order.deliveryAddress ?? {}) as Record<string, any>;

  const total =
    typeof order.paidTotalEur === "number"
      ? order.paidTotalEur
      : typeof pricing.total === "number"
      ? pricing.total
      : null;

  const shippingCostEur =
    typeof shippingCost.amount === "number" ? shippingCost.amount / 100 : null;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin/orders"
          className="mb-6 inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
        >
          ← Späť na objednávky
        </a>

        <section className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-500">
                Detail objednávky
              </div>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
                {order.orderNumber ?? order.fileName}
              </h1>

              {order.orderNumber && (
                <div className="mt-1 text-base font-semibold text-neutral-600">
                  {order.fileName}
                </div>
              )}

              <div className="mt-2 break-all font-mono text-xs text-neutral-400">
                {order.id}
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFAE00]/15 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                Stav
              </div>
              <div className="mt-1 text-xl font-extrabold text-neutral-900">
                {order.status}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <InfoCard label="Vytvorené" value={formatDate(order.createdAt)} />
            <InfoCard
              label="Celkom zaplatené"
              value={total !== null ? formatEur(total) : "—"}
            />
            <InfoCard label="Doprava" value={order.shippingMethod ?? "—"} />
            <InfoCard
              label="Cena dopravy"
              value={shippingCostEur !== null ? formatEur(shippingCostEur) : "—"}
            />
          </div>

          {typeof pricing.total === "number" && (
            <div className="mt-4 rounded-2xl bg-neutral-50 px-5 py-4 text-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-3">
                Rozpis DPH (výroba)
              </div>
              <div className="grid grid-cols-3 gap-2 text-neutral-700">
                <span>Základ bez DPH</span>
                <span className="col-span-2 font-semibold">{formatEur(pricing.total)}</span>
                <span>DPH 23 %</span>
                <span className="col-span-2 font-semibold">{formatEur(vatAmount(pricing.total))}</span>
                <span className="font-bold text-neutral-900">Výroba s DPH</span>
                <span className="col-span-2 font-bold text-neutral-900">{formatEur(addVat(pricing.total))}</span>
                {shippingCostEur !== null && (
                  <>
                    <span>Doprava</span>
                    <span className="col-span-2 font-semibold">{formatEur(shippingCostEur)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
            >
              Otvoriť model
            </a>

            <a
              href={`/api/file?key=${encodeURIComponent(order.fileKey)}`}
              download
              className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:opacity-90"
            >
              Stiahnuť model
            </a>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Zákazník">
            <InfoCard
              label="Meno"
              value={getValue(
                billingAddress.name ??
                shippingAddress.name ??
                deliveryAddress.name
              )}
            />
            <InfoCard label="Email" value={order.customerEmail ?? "—"} />
            <InfoCard label="Telefón" value={order.phone ?? "—"} />
            <InfoCard
              label="Typ účtu"
              value={
                order.accountType === "COMPANY"
                  ? "Firma"
                  : order.accountType === "PERSON"
                  ? "Súkromná osoba"
                  : "—"
              }
            />
            <InfoCard
              label="Kontaktná osoba"
              value={order.contactPerson ?? "—"}
            />
          </Panel>

          <Panel title="Firemné údaje">
            <InfoCard label="Názov spoločnosti" value={order.companyName ?? "—"} />
            <InfoCard label="IČO" value={order.ico ?? "—"} />
            <InfoCard label="DIČ" value={order.dic ?? "—"} />
            <InfoCard label="IČ DPH" value={order.icDph ?? "—"} />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Adresa doručenia">
            <InfoCard
              label="Meno"
              value={getValue(deliveryAddress.name ?? shippingAddress.name)}
            />
            <InfoCard
              label="Telefón"
              value={getValue(deliveryAddress.phone ?? shippingAddress.phone)}
            />
            <InfoCard
              label="Ulica"
              value={getValue(
                deliveryAddress.street ??
                shippingAddress.street ??
                shippingAddress.line1 ??
                (shippingAddress as any).address
              )}
            />
            <InfoCard
              label="Doplnenie adresy"
              value={getValue(deliveryAddress.line2 ?? shippingAddress.line2)}
            />
            <InfoCard
              label="Mesto"
              value={getValue(deliveryAddress.city ?? shippingAddress.city)}
            />
            <InfoCard
              label="PSČ"
              value={getValue(
                deliveryAddress.zip ??
                shippingAddress.zip ??
                (shippingAddress as any).postal_code
              )}
            />
            <InfoCard
              label="Krajina"
              value={getValue(deliveryAddress.country ?? shippingAddress.country)}
            />
          </Panel>

          <Panel title="Fakturačná adresa">
            <InfoCard label="Meno" value={getValue(billingAddress.name)} />
            <InfoCard label="Email" value={getValue(billingAddress.email)} />
            <InfoCard label="Telefón" value={getValue(billingAddress.phone)} />
            <InfoCard label="Ulica" value={getValue(billingAddress.street)} />
            <InfoCard label="Mesto" value={getValue(billingAddress.city)} />
            <InfoCard label="PSČ" value={getValue(billingAddress.zip)} />
            <InfoCard label="Krajina" value={getValue(billingAddress.country)} />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Stripe údaje">
            <InfoCard
              label="Stripe session"
              value={order.stripeSessionId ?? "—"}
              mono
            />
            <InfoCard
              label="Payment intent"
              value={order.stripePaymentIntentId ?? "—"}
              mono
            />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Konfigurácia tlače">
            <InfoCard label="Materiál" value={getValue(config.material)} />
            <InfoCard label="Kvalita" value={getValue(config.quality)} />
            <InfoCard label="Farba" value={getValue(config.color)} />
            <InfoCard label="Počet kusov" value={getValue(config.quantity)} />
            <InfoCard
              label="Infill"
              value={
                config.infillPct !== undefined ? `${config.infillPct}%` : "—"
              }
            />
            <InfoCard
              label="Mierka"
              value={
                config.scalePct !== undefined ? `${config.scalePct}%` : "—"
              }
            />
          </Panel>

          <Panel title="Analýza modelu">
            <InfoCard
              label="Rozmer X"
              value={
                analysis.dimsXmm !== undefined ? `${analysis.dimsXmm} mm` : "—"
              }
            />
            <InfoCard
              label="Rozmer Y"
              value={
                analysis.dimsYmm !== undefined ? `${analysis.dimsYmm} mm` : "—"
              }
            />
            <InfoCard
              label="Rozmer Z"
              value={
                analysis.dimsZmm !== undefined ? `${analysis.dimsZmm} mm` : "—"
              }
            />
            <InfoCard
              label="Objem"
              value={
                analysis.volumeCm3 !== undefined
                  ? `${analysis.volumeCm3} cm³`
                  : "—"
              }
            />
          </Panel>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <div className="text-lg font-extrabold text-neutral-900">
            Technické dáta objednávky
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <JsonBox title="Pricing JSON" value={formatJson(pricing)} />
            <JsonBox title="Config JSON" value={formatJson(config)} />
            <JsonBox title="Shipping JSON" value={formatJson(shippingAddress)} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <h2 className="text-lg font-extrabold text-neutral-900">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoCard({
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
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className={[
          "mt-2 break-words text-sm font-semibold text-neutral-900",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function JsonBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-950 p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
        {title}
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-neutral-100">
        {value}
      </pre>
    </div>
  );
}