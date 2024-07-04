/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Promocode, PromocodeSchema } from './schema/promocode.schema';

import { PromocodeService } from './promocode.service';
import { PromocodeController } from './promocode.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Promocode.name, schema: PromocodeSchema }]),
    ],
    controllers: [PromocodeController],
    providers: [PromocodeService],
})
export class PromocodeModule {}
