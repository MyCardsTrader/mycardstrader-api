import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
  CardScanStatus,
  SCRYFALL_LANGUAGES,
  ScanCardStatus,
  ScryfallLanguage,
} from "../card-scan.types";
export type CardScanDocument = HydratedDocument<CardScan>;
@Schema({ _id: false })
export class DetectedCard {
  @Prop() printedName?: string;
  @Prop() canonicalName?: string;
  @Prop({ enum: SCRYFALL_LANGUAGES }) language?: ScryfallLanguage;
  @Prop() set?: string;
  @Prop() collectorNumber?: string;
  @Prop({ min: 0, max: 1 }) confidence?: number;
  @Prop({ min: 0, max: 1 }) languageConfidence?: number;
}
@Schema({ _id: false })
export class ValidatedCardPrinting {
  @Prop({ required: true }) scryfallId: string;
  @Prop({ required: true }) oracleId: string;
  @Prop({ required: true }) name: string;
  @Prop() printedName?: string;
  @Prop({ required: true, enum: SCRYFALL_LANGUAGES })
  language: ScryfallLanguage;
  @Prop({ required: true }) set: string;
  @Prop({ required: true }) collectorNumber: string;
}
const printingSchema = SchemaFactory.createForClass(ValidatedCardPrinting);
@Schema({ _id: false })
export class ScanCard {
  @Prop({ required: true }) id: string;
  @Prop({ required: true, min: 1 }) quantity: number;
  @Prop({ required: true, enum: ScanCardStatus }) status: ScanCardStatus;
  @Prop({ required: true, type: SchemaFactory.createForClass(DetectedCard) })
  detected: DetectedCard;
  @Prop({ type: printingSchema }) resolved?: ValidatedCardPrinting;
  @Prop({ type: [printingSchema], default: undefined })
  candidates?: ValidatedCardPrinting[];
}
@Schema({ _id: false })
export class CardScanUsage {
  @Prop() inputTokens?: number;
  @Prop() outputTokens?: number;
  @Prop() totalTokens?: number;
  @Prop() cost?: number;
}
@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class CardScan {
  @Prop({ required: true, index: true }) userId: string;
  @Prop() binderId?: string;
  @Prop({ required: true, enum: CardScanStatus, index: true })
  status: CardScanStatus;
  @Prop({ required: true, type: [SchemaFactory.createForClass(ScanCard)] })
  cards: ScanCard[];
  @Prop({ required: true }) modelUsed: string;
  @Prop({ type: SchemaFactory.createForClass(CardScanUsage) })
  usage?: CardScanUsage;
  @Prop() failureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export const CardScanSchema = SchemaFactory.createForClass(CardScan);
CardScanSchema.index({ userId: 1, status: 1, createdAt: -1 });
