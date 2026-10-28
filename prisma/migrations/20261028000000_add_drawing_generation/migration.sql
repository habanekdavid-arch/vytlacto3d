-- CreateTable
CREATE TABLE IF NOT EXISTS "DrawingGeneration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,

    CONSTRAINT "DrawingGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DrawingGeneration_ipHash_createdAt_idx" ON "DrawingGeneration"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DrawingGeneration_createdAt_idx" ON "DrawingGeneration"("createdAt");
