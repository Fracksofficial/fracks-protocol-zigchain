import { Module } from "@nestjs/common";
import { RedemptionService } from "./redemption.service";
import { RedemptionController } from "./redemption.controller";

@Module({
  providers: [RedemptionService],
  controllers: [RedemptionController],
})
export class RedemptionModule {}
