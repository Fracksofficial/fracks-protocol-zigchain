import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RedemptionService } from "./redemption.service";
import { CreateRedemptionDto } from "./dto/create-redemption.dto";
import { UpdateRedemptionStatusDto } from "./dto/update-redemption-status.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types/role.enum";

@Controller("redemption-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RedemptionController {
  constructor(private redemptionService: RedemptionService) {}

  @Get()
  findAll() {
    return this.redemptionService.findAll();
  }

  @Post()
  @Roles(Role.INVESTOR, Role.ADMIN)
  create(@Body() dto: CreateRedemptionDto) {
    return this.redemptionService.create(dto);
  }

  @Patch(":id/status")
  @Roles(Role.TOKEN_CONTROLLER, Role.ADMIN)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateRedemptionStatusDto) {
    return this.redemptionService.updateStatus(id, dto);
  }
}