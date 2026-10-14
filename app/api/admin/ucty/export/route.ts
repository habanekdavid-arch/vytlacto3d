import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { ACCOUNT_TABS, formatAccountDate, loadAccounts, parseAccountTab, type AccountRow } from "@/lib/admin-accounts";

export const dynamic = "force-dynamic";

const COLUMNS: [string, (r: AccountRow) => string | number | null][] = [
  ["Meno", (r) => (r.name === "—" ? "" : r.name)],
  ["E-mail", (r) => r.email],
  ["Telefón", (r) => r.phone],
  ["Firma", (r) => r.company],
  ["Typ zákazníka", (r) => (r.isCompany ? "Firma" : "Osoba")],
  ["Účet", (r) => (r.hasAccount ? "Áno" : "Nie")],
  ["Administrátor", (r) => (r.isAdmin ? "Áno" : "Nie")],
  ["IČO", (r) => r.ico],
  ["DIČ", (r) => r.dic],
  ["IČ DPH", (r) => r.icDph],
  ["Fakturačná ulica", (r) => r.billing?.street ?? null],
  ["Fakturačné mesto", (r) => r.billing?.city ?? null],
  ["Fakturačné PSČ", (r) => r.billing?.zip ?? null],
  ["Fakturačná krajina", (r) => r.billing?.country ?? null],
  ["Doručovacia ulica", (r) => r.shipping?.street ?? null],
  ["Doručovacie mesto", (r) => r.shipping?.city ?? null],
  ["Doručovacie PSČ", (r) => r.shipping?.zip ?? null],
  ["Doručovacia krajina", (r) => r.shipping?.country ?? null],
  ["Registrácia", (r) => (r.registeredAt ? formatAccountDate(r.registeredAt) : null)],
  ["Počet objednávok", (r) => r.placedCount],
  ["Nedokončené platby", (r) => r.unfinishedCount],
  ["Zaplatené spolu (€)", (r) => r.spentEur.toFixed(2).replace(".", ",")],
  ["Posledná objednávka", (r) => r.lastOrder?.label ?? null],
  ["Dátum poslednej objednávky", (r) => (r.lastOrder ? formatAccountDate(r.lastOrder.at) : null)],
];

// Bodkočiarka + BOM: slovenský Excel súbor otvorí rovno so stĺpcami a diakritikou.
function cell(value: string | number | null): string {
  let s = value == null ? "" : String(value);
  // Ochrana pred vzorcami v Exceli (=, +, -, @ na začiatku bunky).
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const tab = parseAccountTab(params.get("zoznam") ?? undefined);
  const { visible } = await loadAccounts(tab, params.get("q") ?? undefined);

  const lines = [
    COLUMNS.map(([title]) => cell(title)).join(";"),
    ...visible.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(";")),
  ];
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const label = ACCOUNT_TABS.find((t) => t.id === tab)?.id ?? "vsetci";
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vytlacto3d-ucty-${label}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
