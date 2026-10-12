import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { LABEL_FORMATS, PacketaError, packetLabelPdf, type LabelFormat } from "@/lib/packeta/client";
import { getPacketaShipment } from "@/lib/packeta/shipment";

export const runtime = "nodejs";

/** PDF štítku pre už vytvorenú zásielku (?format=A6 on A4 …). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const shipment = await getPacketaShipment(id);
  if (!shipment) return NextResponse.json({ error: "K objednávke ešte nie je vytvorená zásielka." }, { status: 404 });

  const requested = new URL(request.url).searchParams.get("format");
  const format: LabelFormat = LABEL_FORMATS.includes(requested as LabelFormat) ? (requested as LabelFormat) : "A6 on A4";

  try {
    const pdf = await packetLabelPdf(shipment.packetId, format);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="packeta-${shipment.barcode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof PacketaError ? `Packeta: ${e.message}` : "Štítok sa nepodarilo stiahnuť.";
    if (!(e instanceof PacketaError)) console.error("Packeta label failed:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
