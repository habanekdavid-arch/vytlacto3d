import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { ensureCouponTable } from "@/lib/coupons";
import { formatAccountDate as formatDate } from "@/lib/admin-accounts";
import { prisma } from "@/lib/prisma";
import CouponCreateForm from "@/components/admin/CouponCreateForm";
import CouponDeleteButton from "@/components/admin/CouponDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminKuponyPage() {
  if (!(await isAdminSession())) redirect("/");
  await ensureCouponTable();

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const orderIds = [...new Set(coupons.map((c) => c.orderId).filter((id): id is string => Boolean(id)))];
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true, status: true },
      })
    : [];
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const used = coupons.filter((c) => c.usedAt).length;
  const stats = [
    { label: "Kupóny spolu", value: coupons.length },
    { label: "Nepoužité", value: coupons.length - used },
    { label: "Použité", value: used },
  ];

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Administrácia
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">Zľavové kupóny</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Jednorazové kupóny na 5, 10 alebo 20 % z ceny výroby (doprava sa nezľavuje). Zákazník ich zadá v košíku.
              Pri platbe kartou je kupón použitý až po zaplatení.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ucty" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              ← Účty
            </Link>
            <Link href="/admin/orders" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              Objednávky
            </Link>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{s.label}</div>
              <div className="mt-2 text-2xl font-extrabold text-neutral-900">{s.value}</div>
            </div>
          ))}
        </section>

        <div className="mb-6">
          <CouponCreateForm />
        </div>

        {coupons.length ? (
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Kód</th>
                    <th className="px-4 py-3">Zľava</th>
                    <th className="px-4 py-3">Pre koho</th>
                    <th className="px-4 py-3">Vytvorený</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {coupons.map((c) => {
                    const order = c.orderId ? orderById.get(c.orderId) : undefined;
                    const reserved = !c.usedAt && order?.status === "PENDING";
                    return (
                      <tr key={c.code} className="align-top">
                        <td className="px-4 py-3 font-mono font-bold tracking-wider text-neutral-900">{c.code}</td>
                        <td className="px-4 py-3 font-extrabold">−{c.percent} %</td>
                        <td className="px-4 py-3">
                          {c.email ?? <span className="text-neutral-400">—</span>}
                          {c.sentAt && <div className="text-xs text-neutral-500">poslaný e-mailom {formatDate(c.sentAt)}</div>}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {formatDate(c.createdAt)}
                          {c.createdBy && <div className="text-xs text-neutral-400">{c.createdBy}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {c.usedAt ? (
                            <span className="rounded-full border border-green-600 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
                              Použitý {formatDate(c.usedAt)}
                            </span>
                          ) : reserved ? (
                            <span className="rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                              V nedokončenej platbe
                            </span>
                          ) : (
                            <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
                              Nepoužitý
                            </span>
                          )}
                          {order && (
                            <div className="mt-1">
                              <Link href={`/admin/orders/${order.id}`} className="text-xs text-neutral-700 hover:text-[#b07a00] hover:underline">
                                #{order.orderNumber ?? order.id.slice(0, 8)}
                              </Link>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{!c.usedAt && <CouponDeleteButton code={c.code} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
            Zatiaľ žiadne kupóny.
          </div>
        )}
      </div>
    </main>
  );
}
