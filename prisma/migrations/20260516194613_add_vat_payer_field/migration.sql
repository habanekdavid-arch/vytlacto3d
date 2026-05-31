-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "vatPayer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vatPayer" BOOLEAN NOT NULL DEFAULT false;
