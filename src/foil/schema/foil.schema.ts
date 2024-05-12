/* istanbul ignore file */

import { Document, Schema as SchemaNative } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type FoilDocument = Foil & Document;

@Schema()
export class Foil {

  @Prop({
    required: true,
    type: [String],
  })
  treatments: string[];
}

export const FoilSchema = SchemaFactory.createForClass(Foil);
