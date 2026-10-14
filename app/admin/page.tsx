import { redirect } from "next/navigation";
import { activeAdminEmails } from "@/lib/admin-auth";
import { getSafeServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { email?: string | null } | undefined;

  const adminEmails = await activeAdminEmails();

  const userEmail = String(sessionUser?.email ?? "").toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    redirect("/");
  }

  redirect("/admin/orders");
}