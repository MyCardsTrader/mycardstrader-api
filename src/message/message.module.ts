/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { CaslModule } from 'src/casl/casl.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageService } from './message.service';
import { TradeModule } from 'src/trade/trade.module';
import { MessageController } from './message.controller';
import { Message, MessageSchema } from './schema/message.schema';
import { CaslAbilityFactory } from 'src/casl/casl-ability.factory';

@Module({
  imports: [
    AuthModule,
    CaslModule,
    TradeModule,
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  providers: [MessageService, CaslAbilityFactory],
  controllers: [MessageController]
})
export class MessageModule {}
