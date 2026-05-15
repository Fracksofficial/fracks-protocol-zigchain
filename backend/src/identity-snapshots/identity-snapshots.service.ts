import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { CreateIdentitySnapshotDto } from "./dto/create-identity-snapshot.dto";

@Injectable()
export class IdentitySnapshotsService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService
  ) {}

  list(wallet?: string) {
    return this.prisma.identitySnapshot.findMany({
      where: wallet ? { wallet } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateIdentitySnapshotDto, actorUserId?: string) {
    const record = await this.prisma.identitySnapshot.create({
      data: {
        wallet: dto.wallet,
        claimTopics: dto.claimTopics,
        verified: dto.verified,
        country: dto.country || null,
      },
    });

    const actorWallet = actorUserId
      ? (await this.prisma.user.findUnique({ where: { id: actorUserId } }))
          ?.walletAddress || null
      : null;

    await this.activityService.record({
      actionType: "IDENTITY_SNAPSHOT",
      actorUserId: actorUserId || null,
      actorWallet,
      entityType: "identity_snapshot",
      entityId: record.id,
      oldValue: null,
      newValue: {
        wallet: dto.wallet,
        claimTopics: dto.claimTopics,
        verified: dto.verified,
        country: dto.country || null,
      },
      reason: dto.reason,
      txHash: dto.txHash,
    });

    return record;
  }
}
