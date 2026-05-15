import { Module } from "@nestjs/common";
import { ComplianceService } from "./compliance.service";
import { ComplianceController } from "./compliance.controller";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports: [ActivityModule],
  providers: [ComplianceService],
  controllers: [ComplianceController],
})
export class ComplianceModule {}
