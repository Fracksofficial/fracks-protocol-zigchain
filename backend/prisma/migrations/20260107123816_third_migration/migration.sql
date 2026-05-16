-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "deployedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "referenceId" TEXT;
