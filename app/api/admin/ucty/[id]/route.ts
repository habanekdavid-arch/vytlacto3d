import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Odstráni účet klienta. Objednávky a faktúry zostanú (účtovníctvo) — len sa
 * odpoja od účtu a ostanú pod e-mailom zákazníka. Príspevky, komentáre a
 * reakcie v komunite sa zmažú spolu s účtom. Účet administrátora sa tu
 * odstrániť nedá.
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

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Účet administrátora sa nedá odstrániť." }, { status: 400 });
  }

  await prisma.$transaction([
    // Objednávka bez e-mailu by po odpojení z prehľadu zmizla.
    prisma.order.updateMany({ where: { userId: id, customerEmail: null }, data: { customerEmail: user.email } }),
    prisma.order.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
