/*
  Warnings:

  - You are about to drop the column `stripePaymentStatus` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stripePaymentStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';
