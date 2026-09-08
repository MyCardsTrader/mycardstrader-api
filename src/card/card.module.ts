/* istanbul ignore file */

import { Module } from "@nestjs/common";
import { CardService } from "./card.service";
import { CardBatchService } from "./card-batch.service";
import { CardBatchController } from "./card-batch.controller";
import { CaslModule } from "../casl/casl.module";
import { AuthModule } from "../auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { CardController } from "./card.controller";
import { Card, CardSchema } from "./schema/card.schema";
import { CaslAbilityFactory } from "../casl/casl-ability.factory";

@Module({
  imports: [
    AuthModule,
    CaslModule,
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
  ],
  controllers: [CardBatchController, CardController],
  providers: [CardService, CardBatchService, CaslAbilityFactory],
  exports: [CardService],
})
export class CardModule {}
