import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types/role.enum";

@Controller("activity-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  @Roles(Role.PLATFORM_OWNER, Role.ADMIN)
  list(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    const take = Math.min(parseInt(limit || "50", 10), 200);
    const skip = Math.max(parseInt(offset || "0", 10), 0);
    return this.activityService.list(take, skip);
  }
}
