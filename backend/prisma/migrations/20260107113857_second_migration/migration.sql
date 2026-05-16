/*
  Warnings:

  - A unique constraint covering the columns `[tokenContract]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IssuanceRequest" ADD COLUMN     "chainRequestId" INTEGER;

-- AlterTable
ALTER TABLE "RedemptionRequest" ADD COLUMN     "chainRequestId" INTEGER;

-- CreateTable
CREATE TABLE "TokenState" (
    "id" TEXT NOT NULL,
    "tokenContract" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "totalSupply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAsset" (
    "id" TEXT NOT NULL,
    "tokenContract" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "legalOwner" TEXT NOT NULL,
    "metadata" JSONB,
    "totalTokenized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBalance" (
    "id" TEXT NOT NULL,
    "tokenContract" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerState" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenState_tokenContract_key" ON "TokenState"("tokenContract");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAsset_tokenContract_assetId_key" ON "TokenAsset"("tokenContract", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBalance_tokenContract_walletAddress_key" ON "TokenBalance"("tokenContract", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tokenContract_key" ON "Asset"("tokenContract");
