import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRedemptionDto } from "./dto/create-redemption.dto";
import { UpdateRedemptionStatusDto } from "./dto/update-redemption-status.dto";

@Injectable()
export class RedemptionService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.redemptionRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: CreateRedemptionDto) {
    return this.prisma.redemptionRequest.create({ data: dto });
  }

  async updateStatus(id: string, dto: UpdateRedemptionStatusDto) {
    const existing = await this.prisma.redemptionRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Redemption request not found");
    }

    return this.prisma.redemptionRequest.update({
      where: { id },
      data: { status: dto.status, txHash: dto.txHash },
    });
  }
}
