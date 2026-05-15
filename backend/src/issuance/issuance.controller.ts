import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IssuanceService } from "./issuance.service";
import { CreateIssuanceDto } from "./dto/create-issuance.dto";
import { UpdateIssuanceStatusDto } from "./dto/update-issuance-status.dto";
import { MarkIssuanceMintedDto } from "./dto/mark-issuance-minted.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types/role.enum";

@Controller("issuance-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuanceController {
  constructor(private issuanceService: IssuanceService) {}

  @Get()
  findAll(
    @Query("tokenContract") tokenContract?: string,
    @Query("status") status?: string
  ) {
    return this.issuanceService.findAll({ tokenContract, status });
  }

  @Post()
  @Roles(Role.TOKEN_ISSUER, Role.ADMIN)
  create(@Body() dto: CreateIssuanceDto) {
    return this.issuanceService.create(dto);
  }

  @Patch(":id/status")
  @Roles(Role.TOKEN_CONTROLLER, Role.ADMIN)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateIssuanceStatusDto) {
    return this.issuanceService.updateStatus(id, dto);
  }

  @Patch(":id/mint")
  @Roles(Role.TOKEN_ISSUER, Role.ADMIN)
  markMinted(@Param("id") id: string, @Body() dto: MarkIssuanceMintedDto) {
    return this.issuanceService.markMinted(id, dto.txHash);
  }
}
