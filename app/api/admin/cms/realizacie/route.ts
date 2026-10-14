import { NextResponse } from "next/server";
import { activeAdminEmails } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

async function isAdmin(): Promise<boolean> {
  const session = await getSafeServerSession();
  const email = String((session?.user as { email?: string | null })?.email ?? "").toLowerCase();
  const admins = await activeAdminEmails();
  return Boolean(email) && admins.includes(email);
}

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.realizacia.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const item = await prisma.realizacia.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
