import { CardLang } from "../interfaces/lang.enum";
import { Document, Schema as SchemaNative } from 'mongoose';
import { ImageUris } from "../interfaces/image-uris.interface";
import { Schema, SchemaFactory, Prop } from "@nestjs/mongoose";

export type CardDocument = Card & Document;

@Schema({
  timestamps: true,
})
export class Card {
  @Prop({
    required: true,
  })
  oracle_id: string;
  
  @Prop({
    required: true,
  })
  cardmarket_id: number;
  
  @Prop({
    required: true,
  })
  name: string;
  
  @Prop({
    required: true,
  })
  lang: CardLang;
  
  @Prop({
    required: true,
    type: SchemaNative.Types.Mixed,
  })
  image_uri: ImageUris;

  @Prop({
    required: true,
  })
  user: string;
}

export const CardSchema = SchemaFactory.createForClass(Card);