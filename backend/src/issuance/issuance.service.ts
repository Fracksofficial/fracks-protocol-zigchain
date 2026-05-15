import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateIssuanceDto } from "./dto/create-issuance.dto";
import { UpdateIssuanceStatusDto } from "./dto/update-issuance-status.dto";

@Injectable()
export class IssuanceService {
  constructor(private prisma: PrismaService) {}

  findAll(filters?: { tokenContract?: string; status?: string }) {
    const { tokenContract, status } = filters || {};

    return this.prisma.issuanceRequest.findMany({
      where: {
        ...(tokenContract ? { tokenContract } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: CreateIssuanceDto) {
    return this.prisma.issuanceRequest.create({ data: dto });
  }

  async updateStatus(id: string, dto: UpdateIssuanceStatusDto) {
    const existing = await this.prisma.issuanceRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Issuance request not found");
    }

    return this.prisma.issuanceRequest.update({
      where: { id },
      data: { status: dto.status, txHash: dto.txHash },
    });
  }

  async markMinted(id: string, txHash: string) {
    const existing = await this.prisma.issuanceRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Issuance request not found");
    }

    return this.prisma.issuanceRequest.update({
      where: { id },
      data: { status: "MINTED", txHash },
    });
  }
}
