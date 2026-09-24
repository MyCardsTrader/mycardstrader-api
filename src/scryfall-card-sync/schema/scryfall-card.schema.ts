import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type ScryfallCardDocument = HydratedDocument<ScryfallCard>;

@Schema({
  collection: "scryfall-cards",
  strict: false,
  minimize: false,
  versionKey: false,
})
export class ScryfallCard {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ index: true })
  oracle_id?: string;

  @Prop({ index: true })
  name?: string;

  @Prop({ index: true })
  set?: string;

  @Prop()
  collector_number?: string;

  @Prop({
    type: [
      {
        capturedAt: { type: Date, required: true },
        prices: { type: MongooseSchema.Types.Mixed },
      },
    ],
  })
  priceHistory: Array<{ capturedAt: Date; prices: unknown }>;

  @Prop({ required: true })
  syncedAt: Date;
}

export const ScryfallCardSchema = SchemaFactory.createForClass(ScryfallCard);
