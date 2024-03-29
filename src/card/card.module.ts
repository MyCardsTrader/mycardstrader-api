/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CaslModule } from '../casl/casl.module';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CardController } from './card.controller';
import { Card, CardSchema } from './schema/card.schema';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';

@Module({
  imports: [
    AuthModule,
    CaslModule,
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema}]),
  ],
  controllers: [CardController],
  providers: [CardService, CaslAbilityFactory],
  exports: [CardService],
})
export class CardModule {
}
