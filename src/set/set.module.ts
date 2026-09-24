/* istanbul ignore file */

import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { Module } from "@nestjs/common";

import { SetService } from "./set.service";
import { SetSchema } from "./schema/set.schema";
import { SetController } from "./set.controller";

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Set.name, schema: SetSchema }]),
  ],
  controllers: [SetController],
  providers: [SetService],
})
export class SetModule {}
