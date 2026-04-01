import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

export default async function AccountPage() {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">
          Profil zákazníka
        </div>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
          {user?.name ?? "Používateľ"}
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoCard label="Email" value={user?.email ?? "—"} />
          <InfoCard label="Telefón" value={user?.phone ?? "—"} />
          <InfoCard
            label="Počet objednávok"
            value={String(user?._count.orders ?? 0)}
          />
          <InfoCard label="ID účtu" value={user?.id ?? "—"} mono />
        </div>
      </section>
    </div>
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
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className={[
          "mt-2 text-base font-semibold text-neutral-900",
          mono ? "font-mono text-sm" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}