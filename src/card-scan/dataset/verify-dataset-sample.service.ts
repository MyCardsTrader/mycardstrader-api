import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DatasetLabelStatus } from "./card-scan-sample.types";
import { ValidatedPrinting } from "../card-scan.types";
import {
  CardScanSample,
  CardScanSampleDocument,
} from "../schemas/card-scan-sample.schema";

@Injectable()
export class VerifyDatasetSampleService {
  constructor(
    @InjectModel(CardScanSample.name)
    private readonly samples: Model<CardScanSampleDocument>,
  ) {}
  async execute(
    scanId: string,
    scanCardId: string,
    userId: string,
    printing: ValidatedPrinting,
  ): Promise<void> {
    const sample = await this.samples.findOne({ scanId, scanCardId, userId });
    if (!sample) throw new NotFoundException("Card scan sample not found");
    if (
      sample.label.status === DatasetLabelStatus.USER_VERIFIED &&
      sample.label.printing?.scryfallId === printing.scryfallId
    )
      return;
    const event = {
      status: DatasetLabelStatus.USER_VERIFIED,
      printing,
      source: "user" as const,
      verifiedAt: new Date(),
      verifiedBy: userId,
    };
    sample.label = event as never;
    sample.labelHistory.push(event as never);
    await sample.save();
  }
}
