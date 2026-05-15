import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { KycApplicationService } from "./services/kyc-application.service";
import { KycApplicationController } from "./controllers/kyc-application.controller";

@Module({
  imports: [PrismaModule],
  controllers: [KycApplicationController],
  providers: [KycApplicationService],
  exports: [KycApplicationService],
})
export class KycModule {}
