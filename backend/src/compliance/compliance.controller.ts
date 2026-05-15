import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ComplianceService } from "./compliance.service";
import { SetAllowedCountriesDto } from "./dto/set-allowed-countries.dto";
import { SetTransferLimitDto } from "./dto/set-transfer-limit.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types/role.enum";

@Controller("compliance-rules")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(private complianceService: ComplianceService) {}

  @Get()
  getRules() {
    return this.complianceService.getRules();
  }

  @Post("countries")
  @Roles(Role.COMPLIANCE_OWNER, Role.ADMIN)
  setAllowedCountries(@Body() dto: SetAllowedCountriesDto, @Req() req: any) {
    return this.complianceService.setAllowedCountries(dto, req.user?.userId);
  }

  @Get("transfer-limits")
  getTransferLimits() {
    return this.complianceService.getTransferLimits();
  }

  @Post("transfer-limits")
  @Roles(Role.COMPLIANCE_OWNER, Role.ADMIN)
  setTransferLimit(@Body() dto: SetTransferLimitDto, @Req() req: any) {
    return this.complianceService.setTransferLimit(dto, req.user?.userId);
  }

  @Post("simulate")
  simulate(@Body() payload: { from: string; to: string; amount: string; assetId?: string }) {
    return this.complianceService.simulateTransfer(payload);
  }
}
