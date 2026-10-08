import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ProcessCardScanService } from "./process-card-scan.service";
import { VerifyDatasetSampleService } from "../dataset/verify-dataset-sample.service";
import {
  CardScanStatus,
  ResolvedScanCard,
  UploadedImage,
  ScanCardStatus,
} from "../card-scan.types";
import { CardScan, CardScanDocument } from "../schemas/card-scan.schema";
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
@Injectable()
export class CardScanService {
  private readonly logger = new Logger(CardScanService.name);
  constructor(
    @InjectModel(CardScan.name) private readonly model: Model<CardScanDocument>,
    private readonly config: ConfigService,
    private readonly processor: ProcessCardScanService,
    private readonly datasetVerifier: VerifyDatasetSampleService,
  ) {}
  async createScan(
    userId: string,
    file?: UploadedImage,
  ): Promise<CardScanDocument> {
    this.validateFile(file);
    const configuredModel = this.config.getOrThrow<string>(
      "cardScan.openRouterModel",
    );
    const scan = (await this.model.create({
      userId,
      status: CardScanStatus.PROCESSING,
      cards: [],
      modelUsed: configuredModel,
    })) as CardScanDocument;
    this.logger.log(
      `Card scan ${scan.id} started with model ${configuredModel}`,
    );
    return this.processor.execute({
      scanId: scan.id,
      userId,
      image: { buffer: file.buffer, mimeType: file.mimetype },
    });
  }
  async listScans(
    userId: string,
    status?: CardScanStatus,
  ): Promise<CardScanDocument[]> {
    const filter: { userId: string; status?: CardScanStatus } = { userId };
    if (status) filter.status = status;
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }
  async getScan(userId: string, scanId: string): Promise<CardScanDocument> {
    const scan = await this.model.findOne({ _id: scanId, userId });
    if (!scan) throw new NotFoundException("Card scan not found");
    return scan;
  }
  async qualifyCard(
    userId: string,
    scanId: string,
    cardId: string,
    scryfallId: string,
  ): Promise<CardScanDocument> {
    const scan = await this.getScan(userId, scanId);
    const card = scan.cards.find((entry) => entry.id === cardId);
    if (!card) throw new NotFoundException("Scanned card not found");
    const selected = card.candidates?.find(
      (candidate) => candidate.scryfallId === scryfallId,
    );
    if (!selected)
      throw new BadRequestException(
        "The selected Scryfall printing is not a validated candidate",
      );
    card.resolved = selected;
    card.status = ScanCardStatus.RESOLVED;
    scan.status = this.computeStatus(scan.cards as ResolvedScanCard[]);
    await scan.save();
    await this.datasetVerifier.execute(scanId, cardId, userId, selected);
    return scan;
  }
  async markImported(
    userId: string,
    scanId: string,
  ): Promise<CardScanDocument> {
    const scan = await this.getScan(userId, scanId);
    if (scan.cards.some((card) => card.status === ScanCardStatus.AMBIGUOUS))
      throw new BadRequestException(
        "Ambiguous cards must be qualified before completing the scan",
      );
    scan.status = CardScanStatus.IMPORTED;
    await scan.save();
    return scan;
  }

  private validateFile(file?: UploadedImage): void {
    if (!file || !file.size)
      throw new BadRequestException("One image is required");
    if (!SUPPORTED_IMAGE_TYPES.has(file.mimetype))
      throw new BadRequestException("Unsupported image type");
    if (file.size > this.config.getOrThrow<number>("cardScan.maxImageBytes"))
      throw new BadRequestException("Image exceeds the configured size limit");
  }
  private computeStatus(cards: ResolvedScanCard[]): CardScanStatus {
    return cards.every((card) => card.status === ScanCardStatus.RESOLVED)
      ? CardScanStatus.READY
      : CardScanStatus.NEEDS_REVIEW;
  }
}
