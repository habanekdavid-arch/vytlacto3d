/**
 * Čo chýba v profile na „úplnú registráciu“. Pri rýchlej registrácii sa
 * vypĺňa len meno, e-mail, telefón a heslo — adresa a firemné údaje sa
 * doplnia neskôr v účte (alebo pri objednávke).
 */
export type ProfileFields = {
  name?: string | null;
  phone?: string | null;
  accountType?: string | null;
  companyName?: string | null;
  ico?: string | null;
  contactPerson?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingZip?: string | null;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingZip?: string | null;
};

export function missingProfileFields(user: ProfileFields): string[] {
  const missing: string[] = [];
  if (!user.name) missing.push("Meno a priezvisko");
  if (!user.phone) missing.push("Telefón");
  if (!user.shippingStreet) missing.push("Doručovacia ulica");
  if (!user.shippingCity) missing.push("Doručovacie mesto");
  if (!user.shippingZip) missing.push("PSČ");
  if (user.accountType === "COMPANY") {
    if (!user.companyName) missing.push("Názov spoločnosti");
    if (!user.ico) missing.push("IČO");
    if (!user.contactPerson) missing.push("Kontaktná osoba");
    if (!user.billingStreet) missing.push("Fakturačná ulica");
    if (!user.billingCity) missing.push("Fakturačné mesto");
    if (!user.billingZip) missing.push("Fakturačné PSČ");
  }
  return missing;
}
