import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import AccountEditForm from "@/components/AccountEditForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      accountType: true,
      vatPayer: true,
      companyName: true,
      ico: true,
      dic: true,
      icDph: true,
      contactPerson: true,
      billingStreet: true,
      billingCity: true,
      billingZip: true,
      billingCountry: true,
      shippingName: true,
      shippingContact: true,
      shippingStreet: true,
      shippingCity: true,
      shippingZip: true,
      shippingCountry: true,
      _count: { select: { orders: true } },
    },
  });

  if (!user) return null;

  const isCompany = user.accountType === "COMPANY";

  return (
    <div className="space-y-5">
      {/* Osobné údaje */}
      <Section title="Osobné údaje">
        <Grid>
          <InfoCard label="Meno a priezvisko" value={user.name} />
          <InfoCard label="E-mail" value={user.email} />
          <InfoCard label="Telefón" value={user.phone} />
          <InfoCard
            label="Typ účtu"
            value={isCompany ? "Firma" : "Súkromná osoba"}
            badge={isCompany ? "company" : "person"}
          />
          <InfoCard
            label="Počet objednávok"
            value={String(user._count.orders)}
          />
          {isCompany && (
            <InfoCard
              label="Platca DPH"
              value={user.vatPayer ? "Áno" : "Nie"}
            />
          )}
        </Grid>
      </Section>

      {/* Firemné údaje */}
      {isCompany && (
        <Section title="Firemné údaje">
          <Grid>
            <InfoCard label="Názov spoločnosti" value={user.companyName} />
            <InfoCard label="Kontaktná osoba" value={user.contactPerson} />
            <InfoCard label="IČO" value={user.ico} />
            <InfoCard label="DIČ" value={user.dic} />
            {user.vatPayer && <InfoCard label="IČ DPH" value={user.icDph} />}
          </Grid>
        </Section>
      )}

      {/* Fakturačná adresa — len pre firmy */}
      {isCompany && (
        <Section title="Fakturačná adresa">
          <AddressBlock
            street={user.billingStreet}
            city={user.billingCity}
            zip={user.billingZip}
            country={user.billingCountry}
          />
        </Section>
      )}

      {/* Doručovacia / dodacia adresa */}
      <Section title={isCompany ? "Dodacia adresa" : "Doručovacia adresa"}>
        {isCompany && (user.shippingName || user.shippingContact) && (
          <Grid>
            <InfoCard label="Názov / firma" value={user.shippingName} />
            <InfoCard label="Kontaktná osoba" value={user.shippingContact} />
          </Grid>
        )}
        <AddressBlock
          street={user.shippingStreet}
          city={user.shippingCity}
          zip={user.shippingZip}
          country={user.shippingCountry}
          className={isCompany && (user.shippingName || user.shippingContact) ? "mt-3" : ""}
        />
      </Section>

      {/* Editácia údajov */}
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
          Upraviť moje údaje
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Fakturačná a dodacia adresa sa predvyplní pri ďalšej objednávke.
        </p>
        <AccountEditForm
          user={{
            name: user.name ?? null,
            phone: user.phone ?? null,
            accountType: user.accountType ?? "PERSON",
            companyName: user.companyName ?? null,
            ico: user.ico ?? null,
            dic: user.dic ?? null,
            icDph: user.icDph ?? null,
            contactPerson: user.contactPerson ?? null,
            billingStreet: user.billingStreet ?? null,
            billingCity: user.billingCity ?? null,
            billingZip: user.billingZip ?? null,
            billingCountry: user.billingCountry ?? null,
            shippingName: user.shippingName ?? null,
            shippingContact: user.shippingContact ?? null,
            shippingStreet: user.shippingStreet ?? null,
            shippingCity: user.shippingCity ?? null,
            shippingZip: user.shippingZip ?? null,
            shippingCountry: user.shippingCountry ?? null,
          }}
        />
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{children}</div>;
}

function AddressBlock({
  street, city, zip, country, className = "",
}: {
  street?: string | null; city?: string | null; zip?: string | null; country?: string | null; className?: string;
}) {
  const empty = !street && !city && !zip && !country;
  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-400">
        Adresa nie je vyplnená
      </div>
    );
  }
  return (
    <div className={`grid gap-3 sm:grid-cols-2 md:grid-cols-4 ${className}`}>
      <InfoCard label="Ulica a číslo" value={street} />
      <InfoCard label="Mesto" value={city} />
      <InfoCard label="PSČ" value={zip} />
      <InfoCard label="Krajina" value={country} />
    </div>
  );
}

function InfoCard({
  label, value, badge,
}: {
  label: string; value?: string | null; badge?: "company" | "person";
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#FFAE00]/40 hover:shadow-md hover:shadow-[#FFAE00]/10">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-2">
        {badge ? (
          <span className={[
            "inline-block rounded-full px-3 py-1 text-xs font-bold",
            badge === "company" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700",
          ].join(" ")}>
            {value || "—"}
          </span>
        ) : (
          <span className="text-sm font-semibold text-neutral-900">
            {value || "—"}
          </span>
        )}
      </div>
    </div>
  );
}
