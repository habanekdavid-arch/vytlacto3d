import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.uploaded?.fileKey || !body?.uploaded?.fileName) {
      return NextResponse.json(
        { error: "Missing uploaded file data" },
        { status: 400 }
      );
    }

    if (!body?.uploaded?.analysis?.volumeCm3) {
      return NextResponse.json(
        { error: "Missing analysis.volumeCm3" },
        { status: 400 }
      );
    }

    if (!body?.config?.material || !body?.config?.quality) {
      return NextResponse.json(
        { error: "Missing config material/quality" },
        { status: 400 }
      );
    }

    const volumeCm3 = Number(body.uploaded.analysis.volumeCm3);
    const quantity = Number(body.config.quantity ?? 1);

    if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
      return NextResponse.json(
        { error: "Invalid volumeCm3" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const infillPct = Number(
      body.config.infillPct ??
      body.config.strength ??
      20
    );

    if (!Number.isFinite(infillPct) || infillPct < 0 || infillPct > 100) {
      return NextResponse.json(
        { error: "Invalid infillPct" },
        { status: 400 }
      );
    }

    const pricing = quote({
      volumeCm3,
      material: body.config.material,
      quality: body.config.quality,
      infillPct,
      quantity,
    });

    const order = await prisma.order.create({
      data: {
        status: "PENDING",
        fileKey: body.uploaded.fileKey,
        fileName: body.uploaded.fileName,
        analysis: body.uploaded.analysis,
        config: {
          ...body.config,
          infillPct,
        },
        pricing: pricing as any,
      },
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      pricing,
    });
  } catch (e: any) {
    console.error("POST /api/order failed:", e);
    return NextResponse.json(
      { error: e?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}