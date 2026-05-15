import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SetAllowedCountriesDto } from "./dto/set-allowed-countries.dto";
import { SetTransferLimitDto } from "./dto/set-transfer-limit.dto";
import { ActivityService } from "../activity/activity.service";

@Injectable()
export class ComplianceService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService
  ) {}

  getRules() {
    return this.prisma.complianceRule.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async setAllowedCountries(dto: SetAllowedCountriesDto, actorUserId?: string) {
    const previous = await this.prisma.complianceRule.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const record = await this.prisma.complianceRule.create({
      data: {
        allowedCountries: dto.allowedCountries,
      },
    });

    const actorWallet = actorUserId
      ? (await this.prisma.user.findUnique({ where: { id: actorUserId } }))
          ?.walletAddress || null
      : null;

    await this.activityService.record({
      actionType: "SET_COUNTRY_RESTRICTION",
      actorUserId: actorUserId || null,
      actorWallet,
      entityType: "compliance_rule",
      entityId: record.id,
      oldValue: previous?.allowedCountries || null,
      newValue: dto.allowedCountries,
      reason: dto.reason,
      txHash: dto.txHash,
    });

    return record;
  }

  getTransferLimits() {
    return this.prisma.transferLimit.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  async setTransferLimit(dto: SetTransferLimitDto, actorUserId?: string) {
    const previous = await this.prisma.transferLimit.findUnique({
      where: { address: dto.address },
    });
    const record = await this.prisma.transferLimit.upsert({
      where: { address: dto.address },
      update: { limit: dto.limit },
      create: { address: dto.address, limit: dto.limit },
    });

    const actorWallet = actorUserId
      ? (await this.prisma.user.findUnique({ where: { id: actorUserId } }))
          ?.walletAddress || null
      : null;

    await this.activityService.record({
      actionType: "SET_TRANSFER_LIMIT",
      actorUserId: actorUserId || null,
      actorWallet,
      entityType: "transfer_limit",
      entityId: record.id,
      oldValue: previous?.limit || null,
      newValue: dto.limit ?? null,
      reason: dto.reason,
      txHash: dto.txHash,
    });

    return record;
  }

  async simulateTransfer(payload: {
    from: string;
    to: string;
    amount: string;
    assetId?: string;
  }) {
    const latestRule = await this.prisma.complianceRule.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const transferLimit = await this.prisma.transferLimit.findUnique({
      where: { address: payload.from },
    });
    const latestSnapshot = await this.prisma.identitySnapshot.findFirst({
      where: { wallet: payload.to },
      orderBy: { createdAt: "desc" },
    });

    const amount = BigInt(payload.amount || "0");
    if (transferLimit?.limit) {
      const limit = BigInt(transferLimit.limit);
      if (amount > limit) {
        return { allowed: false, reason: "Transfer exceeds limit" };
      }
    }

    if (!latestSnapshot?.verified) {
      return { allowed: false, reason: "Recipient missing KYC claim" };
    }

    if (
      latestRule?.allowedCountries?.length &&
      latestSnapshot.country &&
      !latestRule.allowedCountries.includes(latestSnapshot.country)
    ) {
      return { allowed: false, reason: "Recipient country not allowed" };
    }

    if (latestRule?.allowedCountries?.length && !latestSnapshot.country) {
      return { allowed: false, reason: "Recipient missing country info" };
    }

    return { allowed: true, reason: "Allowed" };
  }
}
