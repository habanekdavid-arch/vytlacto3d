import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { PacketaError, createPacket, isPacketaConfigured } from "@/lib/packeta/client";
import {
  PACKETA_READY_STATUSES,
  buildPacketDraft,
  ensurePacketaTable,
  getPacketaShipment,
  packetAttributesFromDraft,
} from "@/lib/packeta/shipment";

export const runtime = "nodejs";

function bounded(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Zaregistruje zásielku v Packete. Ak už k objednávke existuje, vráti ju. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPacketaConfigured()) {
    return NextResponse.json({ error: "Packeta nie je nastavená — chýba PACKETA_API_PASSWORD vo Verceli." }, { status: 400 });
  }

  const { id } = await params;
  const existing = await getPacketaShipment(id);
  if (existing) return NextResponse.json({ shipment: existing, created: false });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const weightKg = bounded(body?.weightKg, 0.01, 30);
  const lengthCm = bounded(body?.lengthCm, 1, 200);
  const widthCm = bounded(body?.widthCm, 1, 200);
  const heightCm = bounded(body?.heightCm, 1, 200);
  if (weightKg === null || lengthCm === null || widthCm === null || heightCm === null) {
    return NextResponse.json({ error: "Zadajte hmotnosť (kg) a rozmery balíka (cm)." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: { select: { name: true } }, orderItems: { select: { pricing: true, config: true } } },
  });
  if (!order) return NextResponse.json({ error: "Objednávka neexistuje." }, { status: 404 });
  if (!PACKETA_READY_STATUSES.includes(order.status)) {
    return NextResponse.json({ error: "Zásielku možno vytvoriť až pre zaplatenú objednávku." }, { status: 400 });
  }

  const draft = buildPacketDraft(order);
  if (!draft.isPacketa) {
    return NextResponse.json(
      { error: "Objednávka ide kuriérom (DPD) — zásielka v Packete sa nevytvára." },
      { status: 400 }
    );
  }
  if (!draft.ready) return NextResponse.json({ error: draft.warnings.join(" ") }, { status: 400 });

  try {
    const packet = await createPacket(packetAttributesFromDraft(draft, { weightKg, lengthCm, widthCm, heightCm }));
    await ensurePacketaTable();
    const shipment = await prisma.packetaShipment.create({
      data: {
        orderId: order.id,
        packetId: packet.id,
        barcode: packet.barcode,
        barcodeText: packet.barcodeText,
        pointId: draft.pointId!,
        weightKg,
      },
    });
    return NextResponse.json({ shipment, created: true });
  } catch (e) {
    if (e instanceof PacketaError) {
      return NextResponse.json({ error: `Packeta: ${e.message}` }, { status: 502 });
    }
    console.error("Packeta createPacket failed:", e);
    return NextResponse.json({ error: "Zásielku sa nepodarilo vytvoriť." }, { status: 500 });
  }
}
