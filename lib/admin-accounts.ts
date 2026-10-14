import { prisma } from "@/lib/prisma";

/**
 * Prehľad účtov pre administráciu: administrátori (ADMIN_EMAILS), registrovaní
 * klienti a klienti bez účtu (len e-mail z objednávky). Objednávka sa ku
 * klientovi priradí cez userId alebo cez rovnaký e-mail.
 */

// Objednávka, ktorú zákazník naozaj odoslal (nie len otvorená a nezaplatená platba kartou).
const PLACED = new Set(["AWAITING_TRANSFER", "PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);
const PAID = new Set(["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);

export type AccountTab = "vsetci" | "admini" | "s-uctom" | "bez-uctu" | "s-objednavkou" | "bez-objednavky";

export const ACCOUNT_TABS: { id: AccountTab; label: string; hint: string }[] = [
  { id: "vsetci", label: "Všetci klienti", hint: "S účtom aj bez účtu" },
  { id: "s-uctom", label: "S účtom", hint: "Registrovaní klienti" },
  { id: "bez-uctu", label: "Bez účtu", hint: "Objednali bez registrácie" },
  { id: "s-objednavkou", label: "S objednávkou", hint: "Aspoň 1 odoslaná objednávka" },
  { id: "bez-objednavky", label: "Účet bez objednávky", hint: "Registrovaní, zatiaľ nič neobjednali" },
  { id: "admini", label: "Administrátori", hint: "Prístup do administrácie" },
];

export function parseAccountTab(value: string | undefined): AccountTab {
  return ACCOUNT_TABS.some((t) => t.id === value) ? (value as AccountTab) : "vsetci";
}

export type Address = { street: string | null; city: string | null; zip: string | null; country: string | null };

export type AccountRow = {
  key: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  isCompany: boolean;
  ico: string | null;
  dic: string | null;
  icDph: string | null;
  billing: Address | null;
  shipping: Address | null;
  hasAccount: boolean;
  isAdmin: boolean;
  registeredAt: Date | null;
  placedCount: number;
  unfinishedCount: number;
  spentEur: number;
  lastOrder: { id: string; label: string; at: Date } | null;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nameFromJson(value: unknown): string | null {
  return value && typeof value === "object" ? str((value as { name?: unknown }).name) : null;
}

function addressFromJson(value: unknown): Address | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const a = { street: str(v.street), city: str(v.city), zip: str(v.zip), country: str(v.country) };
  return a.street || a.city || a.zip ? a : null;
}

function address(street: string | null, city: string | null, zip: string | null, country: string | null): Address | null {
  return street || city || zip ? { street, city, zip, country } : null;
}

export async function loadAccounts(tab: AccountTab, rawQuery: string | undefined) {
  const query = (rawQuery ?? "").trim().toLowerCase();
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );

  const [users, orders] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, phone: true, accountType: true, createdAt: true,
        companyName: true, ico: true, dic: true, icDph: true,
        billingStreet: true, billingCity: true, billingZip: true, billingCountry: true,
        shippingStreet: true, shippingCity: true, shippingZip: true, shippingCountry: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      select: {
        id: true, orderNumber: true, status: true, createdAt: true, customerEmail: true, userId: true,
        paidTotalEur: true, phone: true, accountType: true, companyName: true, contactPerson: true,
        ico: true, dic: true, icDph: true, shippingAddress: true, billingAddress: true, deliveryAddress: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows = new Map<string, AccountRow>();
  const userIdToKey = new Map<string, string>();
  const empty = { placedCount: 0, unfinishedCount: 0, spentEur: 0, lastOrder: null };

  for (const u of users) {
    const email = u.email.toLowerCase();
    const isCompany = u.accountType === "COMPANY";
    rows.set(email, {
      key: email,
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      company: isCompany ? u.companyName : null,
      isCompany,
      ico: u.ico, dic: u.dic, icDph: u.icDph,
      billing: address(u.billingStreet, u.billingCity, u.billingZip, u.billingCountry),
      shipping: address(u.shippingStreet, u.shippingCity, u.shippingZip, u.shippingCountry),
      hasAccount: true,
      isAdmin: adminEmails.has(email),
      registeredAt: u.createdAt,
      ...empty,
    });
    userIdToKey.set(u.id, email);
  }

  // Administrátor, ktorý sa ešte nikdy nezaregistroval, je tiež v zozname.
  for (const email of adminEmails) {
    if (!rows.has(email)) {
      rows.set(email, {
        key: email, userId: null, name: "—", email, phone: null, company: null, isCompany: false,
        ico: null, dic: null, icDph: null, billing: null, shipping: null,
        hasAccount: false, isAdmin: true, registeredAt: null, ...empty,
      });
    }
  }

  // Objednávky idú od najnovšej, takže údaje hosťa sú z jeho poslednej objednávky.
  for (const o of orders) {
    const email = o.customerEmail?.trim().toLowerCase() ?? "";
    const key = (o.userId && userIdToKey.get(o.userId)) || email;
    if (!key) continue;

    let row = rows.get(key);
    if (!row) {
      const isCompany = o.accountType === "COMPANY" || Boolean(o.companyName);
      row = {
        key,
        userId: null,
        name:
          str(o.contactPerson) ||
          nameFromJson(o.billingAddress) ||
          nameFromJson(o.shippingAddress) ||
          nameFromJson(o.deliveryAddress) ||
          "—",
        email: o.customerEmail ?? key,
        phone: o.phone,
        company: o.companyName,
        isCompany,
        ico: o.ico, dic: o.dic, icDph: o.icDph,
        billing: addressFromJson(o.billingAddress),
        // deliveryAddress môže byť výdajné miesto Packety, preto radšej adresa zo Stripe.
        shipping: addressFromJson(o.shippingAddress),
        hasAccount: false,
        isAdmin: adminEmails.has(key),
        registeredAt: null,
        ...empty,
      };
      rows.set(key, row);
    }

    if (PLACED.has(o.status)) {
      row.placedCount += 1;
      if (PAID.has(o.status)) row.spentEur += o.paidTotalEur ?? 0;
      if (!row.lastOrder) row.lastOrder = { id: o.id, label: o.orderNumber ?? o.id.slice(0, 8), at: o.createdAt };
      if (!row.phone && o.phone) row.phone = o.phone;
    } else if (o.status === "PENDING") {
      row.unfinishedCount += 1;
    }
  }

  const all = [...rows.values()];
  const clients = all.filter((r) => !r.isAdmin);
  const lists: Record<AccountTab, AccountRow[]> = {
    vsetci: clients,
    admini: all.filter((r) => r.isAdmin),
    "s-uctom": clients.filter((r) => r.hasAccount),
    "bez-uctu": clients.filter((r) => !r.hasAccount),
    "s-objednavkou": clients.filter((r) => r.placedCount > 0),
    "bez-objednavky": clients.filter((r) => r.hasAccount && r.placedCount === 0),
  };

  const sortTime = (r: AccountRow) => Math.max(r.lastOrder?.at.getTime() ?? 0, r.registeredAt?.getTime() ?? 0);
  const visible = lists[tab]
    .filter((r) => !query || [r.name, r.email, r.phone ?? "", r.company ?? ""].some((v) => v.toLowerCase().includes(query)))
    .sort((a, b) => sortTime(b) - sortTime(a));

  return { clients, lists, visible };
}

export function formatAccountDate(d: Date) {
  return new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Bratislava" }).format(d);
}
