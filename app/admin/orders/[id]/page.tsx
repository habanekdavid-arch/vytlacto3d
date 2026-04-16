import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">Detail objednávky</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{order.fileName}</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-neutral-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">ID</div>
            <div className="mt-2 break-all text-sm font-semibold text-neutral-900">{order.id}</div>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Stav</div>
            <div className="mt-2 text-sm font-semibold text-neutral-900">{order.status}</div>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Email</div>
            <div className="mt-2 text-sm font-semibold text-neutral-900">{order.customerEmail ?? "—"}</div>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Doprava</div>
            <div className="mt-2 text-sm font-semibold text-neutral-900">{order.shippingMethod ?? "—"}</div>
          </div>
        </div>
      </div>
    </main>
  );
}