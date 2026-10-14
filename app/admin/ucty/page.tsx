import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { formatEur } from "@/lib/vat";

export const dynamic = "force-dynamic";

/**
 * Prehľad účtov: administrátori (ADMIN_EMAILS), registrovaní klienti a
 * klienti bez účtu (len e-mail z objednávky). Objednávka sa ku klientovi
 * priradí cez userId alebo cez rovnaký e-mail.
 */

// Objednávka, ktorú zákazník naozaj odoslal (nie len otvorená a nezaplatená platba kartou).
const PLACED = new Set(["AWAITING_TRANSFER", "PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);
const PAID = new Set(["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);

type Tab = "vsetci" | "admini" | "s-uctom" | "bez-uctu" | "s-objednavkou" | "bez-objednavky";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "vsetci", label: "Všetci klienti", hint: "S účtom aj bez účtu" },
  { id: "s-uctom", label: "S účtom", hint: "Registrovaní klienti" },
  { id: "bez-uctu", label: "Bez účtu", hint: "Objednali bez registrácie" },
  { id: "s-objednavkou", label: "S objednávkou", hint: "Aspoň 1 odoslaná objednávka" },
  { id: "bez-objednavky", label: "Účet bez objednávky", hint: "Registrovaní, zatiaľ nič neobjednali" },
  { id: "admini", label: "Administrátori", hint: "Prístup do administrácie" },
];

type Row = {
  key: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  hasAccount: boolean;
  isAdmin: boolean;
  registeredAt: Date | null;
  placedCount: number;
  unfinishedCount: number;
  spentEur: number;
  lastOrder: { id: string; label: string; at: Date } | null;
};

function nameFromJson(value: unknown): string | null {
  if (value && typeof value === "object" && "name" in value) {
    const n = (value as { name?: unknown }).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return null;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Bratislava" }).format(d);
}

export default async function AdminUctyPage({
  searchParams,
}: {
  searchParams: Promise<{ zoznam?: string; q?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/");
  const { zoznam, q } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === zoznam) ? (zoznam as Tab) : "vsetci";
  const query = (q ?? "").trim().toLowerCase();

  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );

  const [users, orders] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, accountType: true, companyName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      select: {
        id: true, orderNumber: true, status: true, createdAt: true, customerEmail: true, userId: true,
        paidTotalEur: true, phone: true, companyName: true, contactPerson: true,
        shippingAddress: true, billingAddress: true, deliveryAddress: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows = new Map<string, Row>();
  const userIdToKey = new Map<string, string>();

  for (const u of users) {
    const email = u.email.toLowerCase();
    rows.set(email, {
      key: email,
      name: u.name,
      email: u.email,
      phone: u.phone,
      company: u.accountType === "COMPANY" ? u.companyName : null,
      hasAccount: true,
      isAdmin: adminEmails.has(email),
      registeredAt: u.createdAt,
      placedCount: 0,
      unfinishedCount: 0,
      spentEur: 0,
      lastOrder: null,
    });
    userIdToKey.set(u.id, email);
  }

  // Administrátor, ktorý sa ešte nikdy nezaregistroval, je tiež v zozname.
  for (const email of adminEmails) {
    if (!rows.has(email)) {
      rows.set(email, {
        key: email, name: "—", email, phone: null, company: null, hasAccount: false, isAdmin: true,
        registeredAt: null, placedCount: 0, unfinishedCount: 0, spentEur: 0, lastOrder: null,
      });
    }
  }

  for (const o of orders) {
    const email = o.customerEmail?.trim().toLowerCase() ?? "";
    const key = (o.userId && userIdToKey.get(o.userId)) || email;
    if (!key) continue;

    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        name:
          o.contactPerson ||
          nameFromJson(o.billingAddress) ||
          nameFromJson(o.shippingAddress) ||
          nameFromJson(o.deliveryAddress) ||
          "—",
        email: o.customerEmail ?? key,
        phone: o.phone,
        company: o.companyName,
        hasAccount: false,
        isAdmin: adminEmails.has(key),
        registeredAt: null,
        placedCount: 0,
        unfinishedCount: 0,
        spentEur: 0,
        lastOrder: null,
      };
      rows.set(key, row);
    }

    if (PLACED.has(o.status)) {
      row.placedCount += 1;
      if (PAID.has(o.status)) row.spentEur += o.paidTotalEur ?? 0;
      // Objednávky idú od najnovšej, takže prvá odoslaná je posledná.
      if (!row.lastOrder) {
        row.lastOrder = { id: o.id, label: o.orderNumber ?? o.id.slice(0, 8), at: o.createdAt };
      }
      if (!row.phone && o.phone) row.phone = o.phone;
    } else if (o.status === "PENDING") {
      row.unfinishedCount += 1;
    }
  }

  const all = [...rows.values()];
  const clients = all.filter((r) => !r.isAdmin);
  const lists: Record<Tab, Row[]> = {
    vsetci: clients,
    admini: all.filter((r) => r.isAdmin),
    "s-uctom": clients.filter((r) => r.hasAccount),
    "bez-uctu": clients.filter((r) => !r.hasAccount),
    "s-objednavkou": clients.filter((r) => r.placedCount > 0),
    "bez-objednavky": clients.filter((r) => r.hasAccount && r.placedCount === 0),
  };

  const sortTime = (r: Row) => Math.max(r.lastOrder?.at.getTime() ?? 0, r.registeredAt?.getTime() ?? 0);
  const visible = lists[tab]
    .filter((r) =>
      !query ||
      [r.name, r.email, r.phone ?? "", r.company ?? ""].some((v) => v.toLowerCase().includes(query))
    )
    .sort((a, b) => sortTime(b) - sortTime(a));

  const totalSpent = clients.reduce((s, r) => s + r.spentEur, 0);
  const withOrder = lists["s-objednavkou"].length;
  const stats = [
    { label: "Klienti spolu", value: String(clients.length) },
    { label: "S účtom", value: String(lists["s-uctom"].length) },
    { label: "Objednali aspoň raz", value: String(withOrder) },
    { label: "Zaplatené spolu", value: formatEur(totalSpent) },
  ];

  const tabHref = (id: Tab) => `/admin/ucty?zoznam=${id}${query ? `&q=${encodeURIComponent(q ?? "")}` : ""}`;

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Administrácia
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">Účty a klienti</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Registrovaní klienti aj tí, čo objednali bez účtu. Za objednávku sa počíta odoslaná objednávka
              (zaplatená alebo čakajúca na prevod); nedokončené platby kartou sú zvlášť.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/orders" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              ← Objednávky
            </Link>
            <Link href="/admin/cms" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              CMS
            </Link>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{s.label}</div>
              <div className="mt-2 text-2xl font-extrabold text-neutral-900">{s.value}</div>
            </div>
          ))}
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={tabHref(t.id)}
              title={t.hint}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                t.id === tab ? "border-[#FFAE00] bg-[#FFAE00] text-black" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#FFAE00]",
              ].join(" ")}
            >
              {t.label} <span className="opacity-60">{lists[t.id].length}</span>
            </Link>
          ))}
        </div>

        <form action="/admin/ucty" className="mb-6 flex gap-2">
          <input type="hidden" name="zoznam" value={tab} />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Hľadať meno, e-mail, telefón, firmu…"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#FFAE00]"
          />
          <button className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800">Hľadať</button>
        </form>

        <p className="mb-3 text-sm text-neutral-500">{TABS.find((t) => t.id === tab)?.hint} · {visible.length}</p>

        {visible.length ? (
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Klient</th>
                    <th className="px-4 py-3">Kontakt</th>
                    <th className="px-4 py-3">Typ</th>
                    <th className="px-4 py-3">Registrácia</th>
                    <th className="px-4 py-3 text-right">Objednávky</th>
                    <th className="px-4 py-3 text-right">Zaplatené</th>
                    <th className="px-4 py-3">Posledná objednávka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visible.map((r) => (
                    <tr key={r.key} className="align-top hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900">{r.name}</div>
                        {r.company && <div className="text-xs text-neutral-500">{r.company}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${r.email}`} className="text-neutral-800 hover:text-[#b07a00] hover:underline">{r.email}</a>
                        {r.phone && <div className="text-xs text-neutral-500">{r.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.isAdmin && <Badge className="border-neutral-900 bg-neutral-900 text-white">Admin</Badge>}
                          {r.hasAccount ? (
                            <Badge className="border-green-600 bg-green-50 text-green-700">Účet</Badge>
                          ) : (
                            <Badge className="border-neutral-300 bg-neutral-100 text-neutral-600">Bez účtu</Badge>
                          )}
                          {r.company && <Badge className="border-blue-300 bg-blue-50 text-blue-700">Firma</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{r.registeredAt ? formatDate(r.registeredAt) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-neutral-900">{r.placedCount}</span>
                        {r.unfinishedCount > 0 && (
                          <div className="text-xs text-neutral-400" title="Otvorená platba kartou, ktorú nedokončil">
                            + {r.unfinishedCount} nedokončená
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-900">{r.spentEur > 0 ? formatEur(r.spentEur) : "—"}</td>
                      <td className="px-4 py-3">
                        {r.lastOrder ? (
                          <Link href={`/admin/orders/${r.lastOrder.id}`} className="text-neutral-800 hover:text-[#b07a00] hover:underline">
                            #{r.lastOrder.label}
                            <span className="ml-1 text-xs text-neutral-500">{formatDate(r.lastOrder.at)}</span>
                          </Link>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
            V tomto zozname nikto nie je.
          </div>
        )}
      </div>
    </main>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${className}`}>{children}</span>;
}
