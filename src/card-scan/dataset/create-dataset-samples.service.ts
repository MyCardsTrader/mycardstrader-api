import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DatasetLabelStatus,
  DatasetSampleInput,
} from "./card-scan-sample.types";
import { CardCropStorageService } from "./card-crop-storage.service";
import { CardCropService } from "./card-crop.service";
import {
  CardScanSample,
  CardScanSampleDocument,
} from "../schemas/card-scan-sample.schema";

@Injectable()
export class CreateDatasetSamplesService {
  private readonly logger = new Logger(CreateDatasetSamplesService.name);
  constructor(
    @InjectModel(CardScanSample.name)
    private readonly samples: Model<CardScanSampleDocument>,
    private readonly crops: CardCropService,
    private readonly storage: CardCropStorageService,
    private readonly config: ConfigService,
  ) {}

  async execute(inputs: DatasetSampleInput[]): Promise<void> {
    const uploaded: string[] = [];
    try {
      for (const input of inputs) {
        const identity = {
          scanId: input.scanId,
          scanCardId: input.scanCardId,
          occurrenceIndex: input.occurrenceIndex,
        };
        if (await this.samples.exists(identity)) continue;
        const crop = await this.crops.generate(
          input.sourceImage,
          input.detected.boundingBox,
        );
        const objectKey = `card-scans/dataset/${input.scanId}/${input.scanCardId}/${input.occurrenceIndex}.webp`;
        await this.storage.put({
          objectKey,
          buffer: crop.buffer,
          mimeType: crop.mimeType,
          sha256: crop.sha256,
        });
        uploaded.push(objectKey);
        const now = new Date();
        const automatic = input.resolved
          ? {
              status: DatasetLabelStatus.AUTO_VERIFIED,
              printing: input.resolved,
              source: "card_scanner" as const,
              verifiedAt: now,
            }
          : { status: DatasetLabelStatus.PENDING };
        await this.samples.updateOne(
          identity,
          {
            $setOnInsert: {
              ...identity,
              userId: input.userId,
              crop: {
                objectKey,
                mimeType: crop.mimeType,
                width: crop.width,
                height: crop.height,
                size: crop.size,
                sha256: crop.sha256,
              },
              boundingBox: input.detected.boundingBox,
              detected: input.detected,
              candidates: input.candidates,
              label: automatic,
              labelHistory: input.resolved ? [{ ...automatic }] : [],
              recognition: {
                model: input.model,
                promptVersion: this.config.getOrThrow<string>(
                  "cardScan.promptVersion",
                ),
                pipelineVersion: this.config.getOrThrow<string>(
                  "cardScan.pipelineVersion",
                ),
              },
            },
          },
          { upsert: true },
        );
        uploaded.pop();
      }
    } catch (error) {
      await Promise.allSettled(
        uploaded.map(async (key) => {
          await this.storage.delete(key);
          this.logger.warn(`Removed unpersisted card crop ${key}`);
        }),
      );
      throw error;
    }
  }
}
