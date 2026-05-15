import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  list(limit = 50, offset = 0) {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async record(entry: {
    actionType: string;
    actorUserId?: string | null;
    actorWallet?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    assetId?: string | null;
    oldValue?: unknown | null;
    newValue?: unknown | null;
    reason?: string | null;
    txHash?: string | null;
  }) {
    const data = {
      actionType: entry.actionType,
      actorUserId: entry.actorUserId || null,
      actorWallet: entry.actorWallet || null,
      entityType: entry.entityType || null,
      entityId: entry.entityId || null,
      assetId: entry.assetId || null,
      reason: entry.reason || null,
      txHash: entry.txHash || null,
    } as const;

    const payload: Record<string, unknown> = { ...data };
    if (entry.oldValue !== undefined) {
      payload.oldValue = entry.oldValue;
    }
    if (entry.newValue !== undefined) {
      payload.newValue = entry.newValue;
    }

    return this.prisma.activityLog.create({
      data: payload as any,
    });
  }
}
