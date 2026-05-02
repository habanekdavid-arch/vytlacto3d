-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "billingAddress" JSONB,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "deliveryAddress" JSONB,
ADD COLUMN     "dic" TEXT,
ADD COLUMN     "icDph" TEXT,
ADD COLUMN     "ico" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" TEXT NOT NULL DEFAULT 'PERSON',
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "billingStreet" TEXT,
ADD COLUMN     "billingZip" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "dic" TEXT,
ADD COLUMN     "icDph" TEXT,
ADD COLUMN     "ico" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingContact" TEXT,
ADD COLUMN     "shippingCountry" TEXT,
ADD COLUMN     "shippingName" TEXT,
ADD COLUMN     "shippingStreet" TEXT,
ADD COLUMN     "shippingZip" TEXT;
