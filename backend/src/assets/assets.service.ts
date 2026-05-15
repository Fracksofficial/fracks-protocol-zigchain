import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAssetDto } from "./dto/create-asset.dto";

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(dto: CreateAssetDto) {
    return this.prisma.asset.create({ data: dto });
  }
}
