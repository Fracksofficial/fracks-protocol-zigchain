import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IdentitySnapshotsService } from "./identity-snapshots.service";
import { CreateIdentitySnapshotDto } from "./dto/create-identity-snapshot.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types/role.enum";

@Controller("identity-snapshots")
@UseGuards(JwtAuthGuard, RolesGuard)
export class IdentitySnapshotsController {
  constructor(private identitySnapshotsService: IdentitySnapshotsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PLATFORM_OWNER)
  list(@Query("wallet") wallet?: string) {
    return this.identitySnapshotsService.list(wallet);
  }

  @Post()
  @Roles(Role.KYC_PROVIDER, Role.ADMIN)
  create(@Body() dto: CreateIdentitySnapshotDto, @Req() req: any) {
    return this.identitySnapshotsService.create(dto, req.user?.userId);
  }
}
