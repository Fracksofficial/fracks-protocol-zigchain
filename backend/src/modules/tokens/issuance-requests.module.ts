import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { IssuanceRequestsService } from "./services/issuance-requests.service";
import {
  IssuanceRequestsController,
  UserIssuanceRequestsController,
} from "./controllers/issuance-requests.controller";

@Module({
  imports: [PrismaModule],
  controllers: [IssuanceRequestsController, UserIssuanceRequestsController],
  providers: [IssuanceRequestsService],
  exports: [IssuanceRequestsService],
})
export class IssuanceRequestsModule {}
