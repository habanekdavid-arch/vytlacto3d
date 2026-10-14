-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminRevoked" (
    "email" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedBy" TEXT,

    CONSTRAINT "AdminRevoked_pkey" PRIMARY KEY ("email")
);
