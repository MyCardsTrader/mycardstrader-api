import { Document, Schema as SchemaNative } from 'mongoose';
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type TradeDocument = Trade & Document;

@Schema({
  timestamps: true,
})
export class Trade {
  @Prop({
    required: true,
  })
  user: string;

  @Prop({
    required: true,
  })
  trader: string;

  @Prop({
    type: [String],
    default: [],
  })
  userCards: string[];

  @Prop({
    type: [String],
    default: [],
  })
  traderCards: string[];

  @Prop({
    default: false,
  })
  userAccept: boolean;

  @Prop({
    default: false,
  })
  traderAccept: boolean;

  @Prop({
    default: 'pending',
  })
  tradeStatus: 'pending' | 'success' | 'rejected';
}

export const TradeSchema = SchemaFactory.createForClass(Trade);
