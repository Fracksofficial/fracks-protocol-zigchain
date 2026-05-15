import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types/role.enum";
import { UpdateRolesDto } from "./dto/update-roles.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(":id/roles")
  @Roles(Role.ADMIN)
  updateRoles(@Param("id") id: string, @Body() dto: UpdateRolesDto) {
    return this.usersService.updateRoles(id, dto.roles, dto.roleStatus);
  }
}
