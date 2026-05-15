import { Module } from "@nestjs/common";
import { IdentitySnapshotsService } from "./identity-snapshots.service";
import { IdentitySnapshotsController } from "./identity-snapshots.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports: [PrismaModule, ActivityModule],
  providers: [IdentitySnapshotsService],
  controllers: [IdentitySnapshotsController],
})
export class IdentitySnapshotsModule {}
