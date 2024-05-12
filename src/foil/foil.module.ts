/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FoilService } from './foil.service';
import { FoilController } from './foil.controller';
import { Foil, FoilSchema } from './schema/foil.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Foil.name, schema: FoilSchema }]),
  ],
  controllers: [FoilController],
  providers: [FoilService]
})
export class FoilModule {}
