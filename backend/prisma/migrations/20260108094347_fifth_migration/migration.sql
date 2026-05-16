-- CreateTable
CREATE TABLE "TrackedWallet" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedWallet_walletAddress_key" ON "TrackedWallet"("walletAddress");
