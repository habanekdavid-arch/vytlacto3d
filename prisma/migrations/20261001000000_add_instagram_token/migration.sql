-- CreateTable
-- IF NOT EXISTS: tabuľku vie založiť aj samotná aplikácia (lib/instagram.ts),
-- aby obnovovanie tokenu fungovalo aj pred ručným spustením migrácie.
CREATE TABLE IF NOT EXISTS "InstagramToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramToken_pkey" PRIMARY KEY ("id")
);
