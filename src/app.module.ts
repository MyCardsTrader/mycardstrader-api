/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import { AppService } from './app.service';
import { SetModule } from './set/set.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CardModule } from './card/card.module';
import { CaslModule } from './casl/casl.module';
import { FoilModule } from './foil/foil.module';
import { AppController } from './app.controller';
import { TradeModule } from './trade/trade.module';
import { SearchModule } from './search/search.module';
import { MessageModule } from './message/message.module';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => ({
        uri: process.env.DATABASE_URI,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: process.env.SMTP_URI,
        defaults: {
          from: '"nest-modules" <modules@nestjs.com>',
        },
        template: {
          dir: __dirname + '/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: false,
          },
        },
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
