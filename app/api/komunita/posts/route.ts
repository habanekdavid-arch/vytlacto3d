import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer } from "@/lib/komunita-db";
import {
  COMMUNITY_MAX_IMAGES,
  COMMUNITY_STORY_MAX,
  COMMUNITY_STORY_MIN,
  COMMUNITY_TITLE_MAX,
  isCommunityCategory,
  isCommunityImageUrl,
  publicName,
} from "@/lib/komunita";
import { MATERIAL_LABELS } from "@/lib/print-options";
import { ADMIN_INBOX, FROM, hasMailCredentials, sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

// Objednávky, ku ktorým sa dá príspevok priradiť ako „Overený zákazník“.
const VERIFIED_STATUSES = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];
// Ochrana pred zahltením moderácie.
const MAX_PENDING_PER_USER = 3;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const viewer = await getCommunityViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Na pridanie príspevku sa prihlás." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(body?.title ?? "").trim();
  const story = String(body?.story ?? "").trim();
  const category = body?.category;
  const materialRaw = String(body?.material ?? "").trim();
  const material = materialRaw && materialRaw in MATERIAL_LABELS ? materialRaw : null;
  const images = Array.isArray(body?.images) ? body.images : [];
  const orderIdRaw = String(body?.orderId ?? "").trim();

  if (!title || title.length > COMMUNITY_TITLE_MAX) {
    return NextResponse.json({ error: `Názov musí mať 1 až ${COMMUNITY_TITLE_MAX} znakov.` }, { status: 400 });
  }
  if (story.length < COMMUNITY_STORY_MIN || story.length > COMMUNITY_STORY_MAX) {
    return NextResponse.json(
      { error: `Príbeh musí mať ${COMMUNITY_STORY_MIN} až ${COMMUNITY_STORY_MAX} znakov.` },
      { status: 400 }
    );
  }
  if (!isCommunityCategory(category)) {
    return NextResponse.json({ error: "Vyber kategóriu." }, { status: 400 });
  }
  if (!images.length || images.length > COMMUNITY_MAX_IMAGES || !images.every(isCommunityImageUrl)) {
    return NextResponse.json({ error: `Pridaj 1 až ${COMMUNITY_MAX_IMAGES} fotiek.` }, { status: 400 });
  }

  await ensureCommunityTables();

  let orderId: string | null = null;
  let orderNumber: string | null = null;
  if (orderIdRaw) {
    const order = await prisma.order.findFirst({
      where: { id: orderIdRaw, userId: viewer.id, status: { in: VERIFIED_STATUSES } },
      select: { id: true, orderNumber: true },
    });
    if (!order) return NextResponse.json({ error: "Túto objednávku nevieme priradiť." }, { status: 400 });
    orderId = order.id;
    orderNumber = order.orderNumber;
  }

  const pending = await prisma.communityPost.count({ where: { userId: viewer.id, status: "PENDING" } });
  if (pending >= MAX_PENDING_PER_USER && !viewer.isAdmin) {
    return NextResponse.json(
      { error: "Máš už niekoľko príspevkov na schválenie. Počkaj, kým ich skontrolujeme." },
      { status: 429 }
    );
  }

  const post = await prisma.communityPost.create({
    data: {
      title,
      story,
      category,
      material,
      images: images as string[],
      orderId,
      userId: viewer.id,
      // Príspevok admina netreba schvaľovať.
      status: viewer.isAdmin ? "PUBLISHED" : "PENDING",
    },
    select: { id: true, status: true },
  });

  if (post.status === "PENDING" && hasMailCredentials()) {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";
    after(async () => {
      try {
        await sendMail({
          from: FROM,
          to: ADMIN_INBOX,
          subject: `Komunita: nový príspevok na schválenie – ${title}`,
          html: `<p><strong>${escapeHtml(publicName(viewer.name))}</strong> pridal(a) príspevok do komunity.</p>
<p><strong>${escapeHtml(title)}</strong> (${escapeHtml(category)})${orderNumber ? ` · objednávka ${escapeHtml(orderNumber)}` : ""}</p>
<p style="white-space:pre-wrap">${escapeHtml(story)}</p>
<p><a href="${base}/admin/komunita">Schváliť v administrácii</a></p>`,
        });
      } catch (e) {
        console.error("Community post notification failed:", e);
      }
    });
  }

  return NextResponse.json({ id: post.id, status: post.status });
}
