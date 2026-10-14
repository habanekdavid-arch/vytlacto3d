import { NextRequest, NextResponse } from "next/server";
import { activeAdminEmails, isAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { deleteUserAccount } from "@/lib/admin-accounts";

/**
 * Odstráni účet klienta. Objednávky a faktúry zostanú (účtovníctvo) — len sa
 * odpoja od účtu a ostanú pod e-mailom zákazníka. Príspevky, komentáre a
 * reakcie v komunite sa zmažú spolu s účtom. Administrátora treba odstrániť
 * cez /api/admin/ucty/admin (najprv sa mu odoberie prístup).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) {
    return NextResponse.json({ error: "Účet neexistuje." }, { status: 404 });
  }

  const adminEmails = await activeAdminEmails();
  if (adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Toto je administrátor — použite „Odstrániť administrátora“." }, { status: 400 });
  }

  await deleteUserAccount(user.id, user.email);

  return NextResponse.json({ ok: true });
}
