/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CardController } from './card.controller';
import { Card, CardSchema } from './schema/card.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema}]),
  ],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {
}
