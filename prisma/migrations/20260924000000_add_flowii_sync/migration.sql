-- CreateTable
-- IF NOT EXISTS: tabuľku vie založiť aj samotná aplikácia (lib/flowii/sync.ts),
-- aby integrácia fungovala aj pred ručným spustením migrácie.
CREATE TABLE IF NOT EXISTS "FlowiiSync" (
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "flowiiPartnerId" TEXT,
    "flowiiOrderId" TEXT,
    "flowiiTaskId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowiiSync_pkey" PRIMARY KEY ("orderId")
);
