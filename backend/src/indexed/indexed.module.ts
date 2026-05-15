import { Module } from "@nestjs/common";
import { IndexedService } from "./indexed.service";
import { IndexedController } from "./indexed.controller";

@Module({
  providers: [IndexedService],
  controllers: [IndexedController],
})
export class IndexedModule {}
