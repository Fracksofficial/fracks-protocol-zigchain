-- CreateTable
CREATE TABLE "KycApplication" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "nationality" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "idDocumentUrl" TEXT,
    "proofOfAddressUrl" TEXT,
    "selfieUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "onchainIdAddress" TEXT,
    "onchainIdCreated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "riskScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycApplication_walletAddress_key" ON "KycApplication"("walletAddress");

-- CreateIndex
CREATE INDEX "KycApplication_walletAddress_idx" ON "KycApplication"("walletAddress");

-- CreateIndex
CREATE INDEX "KycApplication_status_idx" ON "KycApplication"("status");

-- CreateIndex
CREATE INDEX "KycApplication_submittedAt_idx" ON "KycApplication"("submittedAt");

-- CreateIndex
CREATE INDEX "KycDocument_applicationId_idx" ON "KycDocument"("applicationId");
