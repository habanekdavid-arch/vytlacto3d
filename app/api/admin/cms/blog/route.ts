import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

async function isAdmin(): Promise<boolean> {
  const session = await getSafeServerSession();
  const email = String((session?.user as { email?: string | null })?.email ?? "").toLowerCase();
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && admins.includes(email);
}

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const post = await prisma.blogPost.create({ data: body });
  return NextResponse.json(post, { status: 201 });
}
