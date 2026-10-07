import { getSafeServerSession } from "@/lib/session";

/** Je prihlásený používateľ admin (e-mail v ADMIN_EMAILS)? */
export async function isAdminSession(): Promise<boolean> {
  const session = await getSafeServerSession();
  const email = String((session?.user as { email?: string | null } | undefined)?.email ?? "").toLowerCase();
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && admins.includes(email);
}
