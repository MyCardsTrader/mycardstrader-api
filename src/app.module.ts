/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { SetModule } from './set/set.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CardModule } from './card/card.module';
import { CaslModule } from './casl/casl.module';
import { FoilModule } from './foil/foil.module';
import { AppController } from './app.controller';
import { FoilService } from './foil/foil.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeModule } from './trade/trade.module';
import { SearchModule } from './search/search.module';
import { MessageModule } from './message/message.module';
import { FoilController } from './foil/foil.controller';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => ({
        uri: process.env.DATABASE_URI,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.env.NODE_ENV}.env`,
    }),
    UserModule,
    AuthModule,
    CardModule,
    CaslModule,
    TradeModule,
    MessageModule,
    SearchModule,
    SetModule,
    FoilModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
