import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        walletAddress: true,
        roles: true,
        requestedRole: true,
        roleStatus: true,
        createdAt: true,
      },
    });
  }

  async updateRoles(userId: string, roles: string[], roleStatus?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roles, roleStatus: roleStatus ?? user.roleStatus },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        roles: true,
        requestedRole: true,
        roleStatus: true,
        updatedAt: true,
      },
    });
  }
}
