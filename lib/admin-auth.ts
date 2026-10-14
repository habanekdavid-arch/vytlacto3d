import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

/**
 * Administrátori = e-maily v ADMIN_EMAILS (Vercel) mínus tie, ktorým bol
 * prístup odobratý v administrácii (/admin/ucty). Odobratie platí hneď, bez
 * úpravy premenných vo Verceli, a dá sa vrátiť. Tabuľka je v migrácii
 * 20261014000000_add_admin_revoked; aplikácia si ju vie založiť aj sama
 * (rovnako ako InstagramToken / komunita), kým migrácia nebeží.
 */

export function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

let tableReady: Promise<void> | null = null;

function ensureRevokedTable() {
  tableReady ??= prisma
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "AdminRevoked" (
        "email" TEXT NOT NULL,
        "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "revokedBy" TEXT,
        CONSTRAINT "AdminRevoked_pkey" PRIMARY KEY ("email")
      )`
    )
    .then(() => undefined)
    .catch((e) => {
      tableReady = null;
      throw e;
    });
  return tableReady;
}

export type RevokedAdmin = { email: string; revokedAt: Date; revokedBy: string | null };

export async function revokedAdmins(): Promise<RevokedAdmin[]> {
  await ensureRevokedTable();
  return prisma.adminRevoked.findMany({ orderBy: { revokedAt: "desc" } });
}

/** Aktuálni administrátori (malými písmenami). */
export async function activeAdminEmails(): Promise<string[]> {
  const env = envAdminEmails();
  let revoked: Set<string>;
  try {
    revoked = new Set((await revokedAdmins()).map((r) => r.email.toLowerCase()));
  } catch (e) {
    // Bez databázy aj tak administrácia nefunguje; nezamknime kvôli výpadku všetkých adminov.
    console.error("AdminRevoked lookup failed:", e);
    return env;
  }
  return env.filter((e) => !revoked.has(e));
}

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  const e = String(email ?? "").trim().toLowerCase();
  return Boolean(e) && (await activeAdminEmails()).includes(e);
}

export async function sessionEmail(): Promise<string> {
  const session = await getSafeServerSession();
  return String((session?.user as { email?: string | null } | undefined)?.email ?? "").toLowerCase();
}

/** Je prihlásený používateľ admin? */
export async function isAdminSession(): Promise<boolean> {
  return isAdminEmail(await sessionEmail());
}

export async function revokeAdmin(email: string, by: string) {
  await ensureRevokedTable();
  const e = email.trim().toLowerCase();
  await prisma.adminRevoked.upsert({ where: { email: e }, create: { email: e, revokedBy: by }, update: {} });
}

export async function restoreAdmin(email: string) {
  await ensureRevokedTable();
  await prisma.adminRevoked.deleteMany({ where: { email: email.trim().toLowerCase() } });
}
