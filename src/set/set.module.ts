import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule, Module } from '@nestjs/common';

import { SetService } from './set.service';
import { SetSchema } from './schema/set.schema';
import { SetController } from './set.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Set.name, schema: SetSchema }]),
  ],
  controllers: [SetController],
  providers: [SetService]
})
export class SetModule {}
