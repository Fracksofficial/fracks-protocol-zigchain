import { Module } from "@nestjs/common";
import { IssuanceService } from "./issuance.service";
import { IssuanceController } from "./issuance.controller";

@Module({
  providers: [IssuanceService],
  controllers: [IssuanceController],
})
export class IssuanceModule {}
