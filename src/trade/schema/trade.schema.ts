import { Document, ObjectId, Schema as SchemaNative } from 'mongoose';
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
    type: [{ type: SchemaNative.Types.ObjectId, ref: 'Card' }],
    default: [],
  })
  userCards: ObjectId[];

  @Prop({
    type: [{ type: SchemaNative.Types.ObjectId, ref: 'Card' }],
    default: [],
  })
  traderCards: ObjectId[];

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
