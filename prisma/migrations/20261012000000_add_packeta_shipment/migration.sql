-- CreateTable
-- IF NOT EXISTS: tabuľku vie založiť aj samotná aplikácia (lib/packeta/shipment.ts).
CREATE TABLE IF NOT EXISTS "PacketaShipment" (
    "orderId" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcodeText" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacketaShipment_pkey" PRIMARY KEY ("orderId")
);
