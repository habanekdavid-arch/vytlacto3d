-- CreateTable
CREATE TABLE IF NOT EXISTS "Coupon" (
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "orderId" TEXT,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Coupon_email_idx" ON "Coupon"("email");
