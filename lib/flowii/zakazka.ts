import { buildOrderCopyText, type OrderWithItems } from "@/lib/order-copy-text";
import { colorLabel, materialLabel, qualityLabel } from "@/lib/print-options";

/**
 * Z objednávky zostaví obsah zákazky a partnera presne tak, ako ich dnes
 * ručne vypĺňa administrácia vo FLOWii. Nič neodosiela — je to čistá funkcia,
 * aby sa dal výsledok vopred skontrolovať v administrácii.
 *
 * Po zákazke sa k nej vytvorí aj úloha pre výrobu (Dávid Habánek, Adam Bunzel).
 *
 * Číselníky (typ, stav, zodpovedný, riešitelia úlohy, typ činnosti) sú zadané
 * názvom, tak ako ich vidno vo FLOWii. ID sa k nim dohľadajú len čítaním — ak
 * sa niektorý názov nenájde jednoznačne, zákazka sa nevytvorí.
 *
 * Firmu (fakturačné údaje) ani menu API pri zákazke zadať neumožňuje — tie
 * nastaví FLOWii samo; companyName slúži len na kontrolu v náhľade.
 */

export type FlowiiSettings = {
  companyName: string;
  contractTypeName: string;
  contractStateName: string;
  responsibleName: string;
  deadlineDays: number;
  taskAssigneeNames: string[];
  // Typ činnosti pre riešiteľov úlohy. Prázdne = "Realizácia", inak prvý typ vo FLOWii.
  activityTypeName: string | null;
};

export function getFlowiiSettings(): FlowiiSettings {
  const days = Number(process.env.FLOWII_DEADLINE_DAYS ?? 1);
  return {
    companyName: process.env.FLOWII_COMPANY_NAME || "4from media, s.r.o. (vytlacto3D.sk)",
    contractTypeName: process.env.FLOWII_CONTRACT_TYPE || "vytlacto3D",
    contractStateName: process.env.FLOWII_CONTRACT_STATE || "vo vyrobe",
    responsibleName: process.env.FLOWII_RESPONSIBLE || "Machalíková Denisa",
    deadlineDays: Number.isFinite(days) && days >= 0 ? days : 1,
    taskAssigneeNames: (process.env.FLOWII_TASK_ASSIGNEES || "Dávid Habánek,Adam Bunzel")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean),
    activityTypeName: process.env.FLOWII_ACTIVITY_TYPE?.trim() || null,
  };
}

export type FlowiiAddress = {
  street: string | null;
  zip: string | null;
  city: string | null;
  countryCode: string | null;
  countryName: string | null;
};

export type FlowiiPartnerDraft = {
  kind: "PERSON" | "COMPANY";
  // Firma: "Názov". Osoba: null — meno je v firstName/lastName.
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: FlowiiAddress;
  // Vo FLOWii sa sem píše miesto doručenia (výdajné miesto Packeta / adresa kuriéra).
  note: string | null;
  ico: string | null;
  dic: string | null;
  icDph: string | null;
  responsibleName: string;
};

// Úloha, ktorá sa vytvorí hneď po zákazke a priradí sa k nej.
export type FlowiiTaskDraft = {
  title: string;
  description: string;
  assigneeNames: string[];
  dueDate: string; // YYYY-MM-DD — rovnaký ako termín dokončenia zákazky
};

export type FlowiiZakazkaDraft = {
  orderId: string;
  orderNumber: string | null;
  name: string;
  companyName: string;
  partner: FlowiiPartnerDraft;
  description: string;
  contractTypeName: string;
  responsibleNames: string[];
  receivedDate: string; // YYYY-MM-DD, Europe/Bratislava
  deadlineDate: string; // YYYY-MM-DD, Europe/Bratislava
  stateName: string;
  task: FlowiiTaskDraft;
  // Čo treba skontrolovať ručne — prázdne pole = všetko potrebné je vyplnené.
  warnings: string[];
};

type Obj = Record<string, any>;

const COUNTRY_NAMES: Record<string, string> = {
  SK: "Slovensko",
  CZ: "Česko",
  AT: "Rakúsko",
  HU: "Maďarsko",
  PL: "Poľsko",
  DE: "Nemecko",
};

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// IČO/DIČ/IČ DPH bez medzier — inak by "12 345 678" a "12345678" boli dvaja partneri.
function compact(value: unknown): string | null {
  const s = clean(value);
  return s ? s.replace(/\s+/g, "") : null;
}

function country(value: unknown): { countryCode: string | null; countryName: string | null } {
  const s = clean(value);
  if (!s) return { countryCode: null, countryName: null };
  const upper = s.toUpperCase();
  if (COUNTRY_NAMES[upper]) return { countryCode: upper, countryName: COUNTRY_NAMES[upper] };
  const code = Object.keys(COUNTRY_NAMES).find(
    (k) => COUNTRY_NAMES[k].toLowerCase() === s.toLowerCase()
  );
  return { countryCode: code ?? null, countryName: s };
}

/** "421918133605" / "0918 133 605" / "+421 918 133 605" → "+421918133605". */
export function normalizePhone(value: unknown): string | null {
  const s = clean(value);
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (s.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("421") || digits.startsWith("420")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+421${digits.slice(1)}`;
  return s;
}

/** "Dominik Fojtik" → Dominik / Fojtik. Viacslovné priezvisko necháva spolu s posledným slovom. */
export function splitName(full: string | null): { firstName: string | null; lastName: string | null } {
  const s = clean(full);
  if (!s) return { firstName: null, lastName: null };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: null, lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function dateInBratislava(d: Date): string {
  // en-CA dáva formát YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function deliveryNote(order: OrderWithItems): string | null {
  const d = (order.deliveryAddress ?? {}) as Obj;
  if (d.type === "packeta") {
    const point =
      clean(d.packetaPointName) ??
      [clean(d.city), clean(d.street)].filter(Boolean).join(", ");
    return point ? `Packeta výdajňa / Z-Box - ${point}` : "Packeta výdajňa / Z-Box";
  }
  const place = [
    clean(d.name) ?? clean(d.contact),
    [clean(d.street), clean(d.line2)].filter(Boolean).join(", ") || null,
    [clean(d.zip), clean(d.city)].filter(Boolean).join(" ") || null,
  ].filter(Boolean);
  if (place.length === 0) return clean(order.shippingMethod);
  return `Kuriér - ${place.join(", ")}`;
}

export function buildFlowiiZakazka(
  order: OrderWithItems,
  opts: { accountName?: string | null; now?: Date; settings?: FlowiiSettings } = {}
): FlowiiZakazkaDraft {
  const settings = opts.settings ?? getFlowiiSettings();
  const billing = (order.billingAddress ?? {}) as Obj;
  const delivery = (order.deliveryAddress ?? {}) as Obj;
  const shipping = (order.shippingAddress ?? {}) as Obj;
  const warnings: string[] = [];

  const isCompany = order.accountType === "COMPANY" && Boolean(clean(order.companyName));

  // Rovnaké poradie zdrojov mena ako interný e-mail o novej objednávke.
  const personName =
    clean(billing.name) ??
    clean(delivery.name) ??
    clean(delivery.contact) ??
    clean(order.contactPerson) ??
    clean(opts.accountName);

  const contactName = isCompany ? clean(order.contactPerson) ?? personName : personName;
  const { firstName, lastName } = splitName(contactName);

  const billingCountry = country(billing.country);
  const billingAddress: FlowiiAddress = {
    street: [clean(billing.street ?? billing.line1), clean(billing.line2)].filter(Boolean).join(", ") || null,
    zip: clean(billing.zip ?? billing.postal_code),
    city: clean(billing.city),
    ...billingCountry,
  };

  const email = clean(order.customerEmail);
  const phone = normalizePhone(order.phone ?? shipping.phone ?? billing.phone);

  if (!email) warnings.push("Chýba e-mail zákazníka — partnera nebude možné bezpečne dohľadať.");
  if (!contactName && !isCompany) warnings.push("Chýba meno zákazníka.");
  if (!billingAddress.street || !billingAddress.city) warnings.push("Neúplná fakturačná adresa.");
  if (order.status === "PENDING" || order.status === "AWAITING_TRANSFER") {
    warnings.push("Objednávka ešte nie je zaplatená — zákazka vznikne až po prijatí platby.");
  }
  if (order.status === "CANCELLED") warnings.push("Objednávka je zrušená — zákazka sa nevytvorí.");

  const partner: FlowiiPartnerDraft = {
    kind: isCompany ? "COMPANY" : "PERSON",
    name: isCompany ? clean(order.companyName) : null,
    firstName,
    lastName,
    email,
    phone,
    billingAddress,
    note: deliveryNote(order),
    ico: isCompany ? compact(order.ico) : null,
    dic: isCompany ? compact(order.dic) : null,
    icDph: isCompany ? compact(order.icDph)?.toUpperCase() ?? null : null,
    responsibleName: settings.responsibleName,
  };

  const fileNames = order.orderItems.length > 0
    ? order.orderItems.map((i) => i.fileName)
    : [order.fileName];
  const name =
    fileNames.length > 1
      ? `3D tlac_${fileNames[0]} (+${fileNames.length - 1} ďalšie)`
      : `3D tlac_${fileNames[0]}`;

  const receivedDate = dateInBratislava(opts.now ?? new Date());
  const deadlineDate = addDays(receivedDate, settings.deadlineDays);

  const items = order.orderItems.length > 0
    ? order.orderItems.map((i) => ({ fileName: i.fileName, config: (i.config ?? {}) as Obj }))
    : [{ fileName: order.fileName, config: (order.config ?? {}) as Obj }];
  const orderConfig = (order.config ?? {}) as Obj;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

  const task: FlowiiTaskDraft = {
    title: `Vytlačiť ${order.orderNumber ?? order.id}: ${name}`,
    description: [
      ...items.map((it, idx) => {
        const c = it.config;
        const flex = [c.materialFlexible ? "materiál nezáleží" : null, c.colorFlexible ? "farba nezáleží" : null]
          .filter(Boolean)
          .join(", ");
        return `${idx + 1}. ${it.fileName} — ${materialLabel(c.material)}, ${qualityLabel(c.quality)}, ${colorLabel(c.color)}, ${c.quantity ?? 1} ks${flex ? ` (${flex})` : ""}`;
      }),
      "",
      orderConfig.allowModelAdjustments
        ? "Zákazník SÚHLASÍ s miernou úpravou modelu pre lepšiu kvalitu tlače."
        : "Zákazník NESÚHLASIL s úpravou modelu — tlačiť bez úprav.",
      `Doprava: ${deliveryNote(order) ?? "—"}`,
      `Objednávka v administrácii: ${baseUrl}/admin/orders/${order.id}`,
    ].join("\n"),
    assigneeNames: settings.taskAssigneeNames,
    dueDate: deadlineDate,
  };

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    name,
    companyName: settings.companyName,
    partner,
    description: buildOrderCopyText(order),
    contractTypeName: settings.contractTypeName,
    responsibleNames: [settings.responsibleName],
    receivedDate,
    deadlineDate,
    stateName: settings.contractStateName,
    task,
    warnings,
  };
}
