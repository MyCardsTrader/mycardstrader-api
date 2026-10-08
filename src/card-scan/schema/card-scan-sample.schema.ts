import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { DatasetLabelStatus } from "../card-scan-sample.types";
import { SCRYFALL_LANGUAGES, ScryfallLanguage } from "../card-scan.types";

export type CardScanSampleDocument = HydratedDocument<CardScanSample>;

@Schema({ _id: false })
export class SamplePrinting {
  @Prop({ required: true }) scryfallId: string;
  @Prop({ required: true }) oracleId: string;
  @Prop({ required: true }) name: string;
  @Prop() printedName?: string;
  @Prop({ required: true, enum: SCRYFALL_LANGUAGES })
  language: ScryfallLanguage;
  @Prop({ required: true }) set: string;
  @Prop({ required: true }) collectorNumber: string;
}
const printingSchema = SchemaFactory.createForClass(SamplePrinting);

@Schema({ timestamps: true, collection: "card_scan_samples" })
export class CardScanSample {
  @Prop({ required: true, type: Types.ObjectId }) scanId: Types.ObjectId;
  @Prop({ required: true }) scanCardId: string;
  @Prop({ required: true, type: Types.ObjectId }) userId: Types.ObjectId;
  @Prop({ required: true, min: 0 }) occurrenceIndex: number;
  @Prop({ required: true, type: Object }) crop: {
    objectKey: string;
    mimeType: string;
    width: number;
    height: number;
    size: number;
    sha256: string;
  };
  @Prop({ required: true, type: Object }) boundingBox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
  @Prop({ required: true, type: Object }) detected: Record<string, unknown>;
  @Prop({ required: true, type: [printingSchema], default: [] })
  candidates: SamplePrinting[];
  @Prop({ required: true, type: Object }) label: {
    status: DatasetLabelStatus;
    printing?: SamplePrinting;
    source?: "card_scanner" | "user";
    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
  };
  @Prop({ required: true, type: [Object], default: [] }) labelHistory: Array<
    Record<string, unknown>
  >;
  @Prop({ required: true, type: Object }) recognition: {
    model: string;
    promptVersion: string;
    pipelineVersion: string;
  };
}

export const CardScanSampleSchema =
  SchemaFactory.createForClass(CardScanSample);
CardScanSampleSchema.index(
  { scanId: 1, scanCardId: 1, occurrenceIndex: 1 },
  { unique: true },
);
CardScanSampleSchema.index({ "label.status": 1 });
CardScanSampleSchema.index({ "label.printing.scryfallId": 1 });
CardScanSampleSchema.index({ "label.printing.oracleId": 1 });
CardScanSampleSchema.index({ "crop.sha256": 1 });
CardScanSampleSchema.index({ createdAt: 1 });
