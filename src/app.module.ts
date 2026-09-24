/* istanbul ignore file */

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { SetModule } from "./set/set.module";
import { MailModule } from "./mail";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { CardModule } from "./card/card.module";
import { CaslModule } from "./casl/casl.module";
import { FoilModule } from "./foil/foil.module";
import { TradeModule } from "./trade/trade.module";
import { SearchModule } from "./search/search.module";
import { MessageModule } from "./message/message.module";
import { PromocodeModule } from "./promocode/promocode.module";
import {
  appConfig,
  authConfig,
  cardScanConfig,
  databaseConfig,
  getEnvFilePath,
  mailConfig,
  scryfallSyncConfig,
  validateEnv,
} from "./config";

import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { CardScanModule } from "./card-scan/card-scan.module";
import { ScryfallCardSyncModule } from "./scryfall-card-sync/scryfall-card-sync.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        mailConfig,
        cardScanConfig,
        scryfallSyncConfig,
      ],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("database.uri"),
      }),
    }),
    MailModule,
    UserModule,
    AuthModule,
    CardModule,
    CaslModule,
    TradeModule,
    MessageModule,
    SearchModule,
    SetModule,
    FoilModule,
    PromocodeModule,
    CardScanModule,
    ScryfallCardSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
