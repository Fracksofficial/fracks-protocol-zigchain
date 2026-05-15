import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IndexedService {
  constructor(private prisma: PrismaService) {}

  getIndexerState() {
    return this.prisma.indexerState.findFirst({
      orderBy: { updatedAt: "desc" },
    });
  }

  listAssets() {
    return this.prisma.asset.findMany({ orderBy: { updatedAt: "desc" } });
  }

  listTokens() {
    return this.prisma.tokenState.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  getToken(contract: string) {
    return this.prisma.tokenState.findUnique({
      where: { tokenContract: contract },
    });
  }

  listTokenAssets(contract: string) {
    return this.prisma.tokenAsset.findMany({
      where: { tokenContract: contract },
      orderBy: { assetId: "asc" },
    });
  }

  listTokenBalances(contract: string, wallet?: string) {
    return this.prisma.tokenBalance.findMany({
      where: {
        tokenContract: contract,
        ...(wallet ? { walletAddress: wallet } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  listTrackedWallets() {
    return this.prisma.trackedWallet.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  addTrackedWallet(walletAddress: string, label?: string) {
    return this.prisma.trackedWallet.upsert({
      where: { walletAddress },
      update: { label: label ?? undefined },
      create: { walletAddress, label },
    });
  }

  listIssuanceRequests(contract: string) {
    return this.prisma.issuanceRequest.findMany({
      where: { tokenContract: contract },
      orderBy: { createdAt: "desc" },
    });
  }

  listRedemptionRequests(contract: string) {
    return this.prisma.redemptionRequest.findMany({
      where: { tokenContract: contract },
      orderBy: { createdAt: "desc" },
    });
  }
}
