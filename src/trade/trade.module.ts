/* istanbul ignore file */
import { Module } from '@nestjs/common';
import { TradeService } from './trade.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { CaslModule } from 'src/casl/casl.module';
import { TradeController } from './trade.controller';
import { Trade, TradeSchema } from './schema/trade.schema';

@Module({
  imports: [
    AuthModule,
    CaslModule,
    MongooseModule.forFeature([{
      name: Trade.name, schema: TradeSchema,
    }]),
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradeModule {}
