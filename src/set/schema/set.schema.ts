import { Document, Schema as SchemaNative } from 'mongoose';
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';

export type SetDocument = Set & Document;

@Schema()
export class Set {

  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: true,
  })
  code: string;

  @Prop({
    required: true,
  })
  icon_svg_uri: string;
}

export const SetSchema = SchemaFactory.createForClass(Set);
