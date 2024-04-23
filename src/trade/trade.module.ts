/* istanbul ignore file */
import { Module } from '@nestjs/common';
import { TradeService } from './trade.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CaslModule } from '../casl/casl.module';
import { TradeController } from './trade.controller';
import { Trade, TradeSchema } from './schema/trade.schema';
import { Card, CardSchema } from 'src/card/schema/card.schema';

@Module({
  imports: [
    AuthModule,
    CaslModule,
    MongooseModule.forFeature([{
      name: Trade.name, schema: TradeSchema,
    }]),
    MongooseModule.forFeature([{
      name: Card.name, schema: CardSchema,
    }]),
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradeModule {}
