/* istanbul ignore file */

import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  ScryfallCard,
  ScryfallCardSchema,
} from "./schema/scryfall-card.schema";
import { ScryfallCardSyncService } from "./scryfall-card-sync.service";

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: ScryfallCard.name, schema: ScryfallCardSchema },
    ]),
  ],
  providers: [ScryfallCardSyncService],
  exports: [ScryfallCardSyncService],
})
export class ScryfallCardSyncModule {}
