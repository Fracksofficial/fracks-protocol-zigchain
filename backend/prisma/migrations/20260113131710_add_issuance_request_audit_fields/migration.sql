/*
  Warnings:

  - You are about to drop the column `chainRequestId` on the `IssuanceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `chainRequestId` on the `RedemptionRequest` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenContract,requestId]` on the table `IssuanceRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenContract,requestId]` on the table `RedemptionRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `requestId` to the `IssuanceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requester` to the `IssuanceRequest` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `assetId` on the `IssuanceRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `requestId` to the `RedemptionRequest` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `assetId` on the `RedemptionRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "IssuanceRequest" DROP COLUMN "chainRequestId",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestId" INTEGER NOT NULL,
ADD COLUMN     "requester" TEXT NOT NULL,
DROP COLUMN "assetId",
ADD COLUMN     "assetId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RedemptionRequest" DROP COLUMN "chainRequestId",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestId" INTEGER NOT NULL,
DROP COLUMN "assetId",
ADD COLUMN     "assetId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "IssuanceRequest_tokenContract_idx" ON "IssuanceRequest"("tokenContract");

-- CreateIndex
CREATE INDEX "IssuanceRequest_status_idx" ON "IssuanceRequest"("status");

-- CreateIndex
CREATE INDEX "IssuanceRequest_requester_idx" ON "IssuanceRequest"("requester");

-- CreateIndex
CREATE INDEX "IssuanceRequest_recipient_idx" ON "IssuanceRequest"("recipient");

-- CreateIndex
CREATE UNIQUE INDEX "IssuanceRequest_tokenContract_requestId_key" ON "IssuanceRequest"("tokenContract", "requestId");

-- CreateIndex
CREATE INDEX "RedemptionRequest_tokenContract_idx" ON "RedemptionRequest"("tokenContract");

-- CreateIndex
CREATE INDEX "RedemptionRequest_status_idx" ON "RedemptionRequest"("status");

-- CreateIndex
CREATE INDEX "RedemptionRequest_requester_idx" ON "RedemptionRequest"("requester");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionRequest_tokenContract_requestId_key" ON "RedemptionRequest"("tokenContract", "requestId");
