import {
  HttpException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CardPrintingResolver } from "./card-printing-resolver.service";
import { CardScanStatus, ScanCardStatus } from "./card-scan.types";
import { OpenRouterService } from "./openrouter.service";
import { CardScan, CardScanDocument } from "./schema/card-scan.schema";
import { CreateDatasetSamplesService } from "./create-dataset-samples.service";

export interface ProcessCardScanInput {
  scanId: string;
  userId: string;
  image: { buffer: Buffer; mimeType: string };
}
@Injectable()
export class ProcessCardScanService {
  private readonly logger = new Logger(ProcessCardScanService.name);
  constructor(
    @InjectModel(CardScan.name) private readonly scans: Model<CardScanDocument>,
    private readonly vision: OpenRouterService,
    private readonly resolver: CardPrintingResolver,
    private readonly dataset: CreateDatasetSamplesService,
  ) {}
  async execute(input: ProcessCardScanInput): Promise<CardScanDocument> {
    try {
      const result = await this.vision.recognizeCards(
        input.image.buffer,
        input.image.mimeType,
      );
      if (!result.cards.length)
        throw new UnprocessableEntityException(
          "No Magic: The Gathering cards were detected",
        );
      if (result.cards.length > 60)
        throw new UnprocessableEntityException(
          "A scan cannot contain more than 60 cards",
        );
      const cards = await this.resolver.resolveAll(result.cards);
      cards.forEach((card, index) => {
        card.id = `card-${index + 1}`;
      });
      await this.dataset.execute(
        cards.map((card, index) => ({
          scanId: input.scanId,
          scanCardId: card.id,
          userId: input.userId,
          occurrenceIndex: index,
          detected: {
            ...card.detected,
            boundingBox: card.detected.boundingBox!,
          },
          candidates: card.candidates ?? (card.resolved ? [card.resolved] : []),
          resolved: card.resolved,
          model: result.model,
          sourceImage: input.image.buffer,
        })),
      );
      const status = cards.every(
        (card) => card.status === ScanCardStatus.RESOLVED,
      )
        ? CardScanStatus.READY
        : CardScanStatus.NEEDS_REVIEW;
      return (await this.scans.findByIdAndUpdate(
        input.scanId,
        {
          $set: {
            cards,
            status,
            modelUsed: result.model,
            usage: result.usage,
            reasoning: result.reasoning,
          },
        },
        { returnDocument: "after" },
      ))!;
    } catch (error) {
      const reason =
        error instanceof HttpException ? error.message : "Card scan failed";
      await this.scans.findByIdAndUpdate(input.scanId, {
        $set: { status: CardScanStatus.FAILED, failureReason: reason },
      });
      this.logger.error(`Card scan ${input.scanId} failed: ${reason}`);
      throw error;
    }
  }
}
