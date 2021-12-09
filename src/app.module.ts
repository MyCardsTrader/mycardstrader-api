/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CardModule } from './card/card.module';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
