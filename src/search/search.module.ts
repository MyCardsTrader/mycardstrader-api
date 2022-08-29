/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { User, UserSchema } from '../user/schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [SearchController],
  providers: [SearchService]
})
export class SearchModule {}
