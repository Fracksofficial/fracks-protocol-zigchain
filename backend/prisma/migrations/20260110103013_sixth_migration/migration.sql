-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "lifecycleState" TEXT NOT NULL DEFAULT 'ISSUED';

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorWallet" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "assetId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentitySnapshot" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "claimTopics" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentitySnapshot_pkey" PRIMARY KEY ("id")
);
