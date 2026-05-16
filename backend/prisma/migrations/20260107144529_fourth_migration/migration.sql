-- AlterTable
ALTER TABLE "User" ADD COLUMN     "requestedRole" TEXT,
ADD COLUMN     "roleStatus" TEXT NOT NULL DEFAULT 'PENDING';
