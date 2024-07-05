/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PromocodeService } from 'src/promocode/promocode.service';
import { Promocode, PromocodeSchema } from 'src/promocode/schema/promocode.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Promocode.name, schema: PromocodeSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    PromocodeService,
  ],
  exports: [UserService],
})
export class UserModule { }
