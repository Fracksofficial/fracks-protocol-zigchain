import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../common/types/role.enum";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async register(
    email: string,
    password: string,
    walletAddress?: string,
    requestedRole?: string
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        walletAddress,
        roles: [Role.INVESTOR],
        requestedRole,
        roleStatus: "PENDING",
      },
    });

    return this.issueTokens(user.id, user.email, user.roles);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user.id, user.email, user.roles);
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      throw new UnauthorizedException("Session expired");
    }

    const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid user");
    }

    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokens(user.id, user.email, user.roles);
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
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

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const accessSecret = this.configService.getOrThrow<string>("jwt.accessSecret");
    const refreshSecret = this.configService.getOrThrow<string>("jwt.refreshSecret");
    const accessExpiresIn = (this.configService.get<string>("jwt.accessExpiresIn") ||
      "15m") as JwtSignOptions["expiresIn"];
    const refreshExpiresIn = (this.configService.get<string>("jwt.refreshExpiresIn") ||
      "7d") as JwtSignOptions["expiresIn"];

    const accessToken = this.jwtService.sign(
      { sub: userId, email, roles },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, roles },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = this.parseExpiry(
      typeof refreshExpiresIn === "string" ? refreshExpiresIn : "7d"
    );

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>("jwt.refreshSecret"),
      }) as { sub: string };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private parseExpiry(expiresIn: string) {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() + value * multipliers[unit]);
  }
}
