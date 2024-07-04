/* istanbul ignore file */

import { Document, Schema as SchemaNative } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type PromocodeDocument = Promocode & Document;

@Schema()
export class Promocode {

  @Prop({
    required: true,
    type: String,
    description: 'Promocode',
    exemple: 'PROMO',
    unique: true,
  })
  code: string;

  @Prop({
    required: true,
    type: Number,
    description: 'Promocode value',
    exemple: 10,
  })
  value: number;
}

export const PromocodeSchema = SchemaFactory.createForClass(Promocode);
