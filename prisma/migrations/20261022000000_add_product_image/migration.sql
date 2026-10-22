-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductImage" (
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("slug")
);
