import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession, revokedAdmins, sessionEmail, type RevokedAdmin } from "@/lib/admin-auth";
import { formatEur } from "@/lib/vat";
import { ACCOUNT_TABS as TABS, formatAccountDate as formatDate, loadAccounts, parseAccountTab, type AccountTab as Tab } from "@/lib/admin-accounts";
import DeleteAccountButton from "@/components/admin/DeleteAccountButton";
import AdminAccessButton from "@/components/admin/AdminAccessButton";
import SendCouponButton from "@/components/admin/SendCouponButton";

export const dynamic = "force-dynamic";

export default async function AdminUctyPage({
  searchParams,
}: {
  searchParams: Promise<{ zoznam?: string; q?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/");
  const { zoznam, q } = await searchParams;
  const tab: Tab = parseAccountTab(zoznam);
  const query = (q ?? "").trim();
  const [{ clients, lists, visible }, me, revoked] = await Promise.all([
    loadAccounts(tab, q),
    sessionEmail(),
    tab === "admini" ? revokedAdmins().catch((): RevokedAdmin[] => []) : Promise.resolve([] as RevokedAdmin[]),
  ]);

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
            <Link href="/admin/kupony" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              Kupóny
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

        <form action="/admin/ucty" className="mb-6 flex flex-wrap gap-2">
          <input type="hidden" name="zoznam" value={tab} />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Hľadať meno, e-mail, telefón, firmu…"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#FFAE00]"
          />
          <button className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800">Hľadať</button>
          <a
            href={`/api/admin/ucty/export?zoznam=${tab}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-extrabold text-black shadow-sm hover:opacity-90"
            title="Stiahne práve zobrazený zoznam ako tabuľku (otvorí sa v Exceli)"
          >
            Export do Excelu ({visible.length})
          </a>
        </form>

        <p className="mb-3 text-sm text-neutral-500">{TABS.find((t) => t.id === tab)?.hint} · {visible.length}</p>

        {visible.length ? (
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Klient</th>
                    <th className="px-4 py-3">Kontakt</th>
                    <th className="px-4 py-3">Typ</th>
                    <th className="px-4 py-3">Registrácia</th>
                    <th className="px-4 py-3 text-right">Objednávky</th>
                    <th className="px-4 py-3 text-right">Zaplatené</th>
                    <th className="px-4 py-3">Posledná objednávka</th>
                    <th className="px-4 py-3" />
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
                      <td className="px-4 py-3 text-right">
                        {r.isAdmin ? (
                          r.key === me ? (
                            <span className="text-xs text-neutral-400">to ste vy</span>
                          ) : (
                            <AdminAccessButton email={r.email} mode="remove" hasAccount={r.hasAccount} />
                          )
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <SendCouponButton email={r.email} name={r.name} />
                            {r.userId && <DeleteAccountButton userId={r.userId} name={r.name} email={r.email} />}
                          </div>
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

        {tab === "admini" && revoked.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-extrabold text-neutral-900">Odstránení administrátori</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Nemajú prístup do administrácie, hoci sú stále v nastaveniach Vercelu (ADMIN_EMAILS). Prístup im môžete vrátiť.
            </p>
            <ul className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              {revoked.map((a) => (
                <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-neutral-900">{a.email}</div>
                    <div className="text-xs text-neutral-500">
                      odstránený {formatDate(new Date(a.revokedAt))}
                      {a.revokedBy ? ` · ${a.revokedBy}` : ""}
                    </div>
                  </div>
                  <AdminAccessButton email={a.email} mode="restore" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${className}`}>{children}</span>;
}
