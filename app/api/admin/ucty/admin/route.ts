import { NextRequest, NextResponse } from "next/server";
import { activeAdminEmails, envAdminEmails, isAdminSession, restoreAdmin, revokeAdmin, sessionEmail } from "@/lib/admin-auth";
import { deleteUserAccount } from "@/lib/admin-accounts";
import { prisma } from "@/lib/prisma";

/**
 * Odstránenie administrátora: odoberie mu prístup do administrácie (platí
 * hneď) a zmaže jeho účet, ak nejaký má. „restore“ prístup vráti.
 * Seba ani posledného administrátora odstrániť nejde.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const action = body?.action === "restore" ? "restore" : "remove";
  if (!email) return NextResponse.json({ error: "Chýba e-mail." }, { status: 400 });

  if (!envAdminEmails().includes(email)) {
    return NextResponse.json({ error: "Tento e-mail nie je administrátor." }, { status: 400 });
  }

  if (action === "restore") {
    await restoreAdmin(email);
    return NextResponse.json({ ok: true });
  }

  const me = await sessionEmail();
  if (email === me) {
    return NextResponse.json({ error: "Seba odstrániť nemôžete." }, { status: 400 });
  }
  const active = await activeAdminEmails();
  if (active.includes(email) && active.length <= 1) {
    return NextResponse.json({ error: "Musí zostať aspoň jeden administrátor." }, { status: 400 });
  }

  await revokeAdmin(email, me);

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, email: true } });
  if (user) {
    try {
      await deleteUserAccount(user.id, user.email);
    } catch (e) {
      console.error("Admin account delete failed:", e);
      return NextResponse.json(
        { error: "Prístup do administrácie bol odobratý, ale účet sa nepodarilo zmazať. Skúste to znova." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, accountDeleted: Boolean(user) });
}
