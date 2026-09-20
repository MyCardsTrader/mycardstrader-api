import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CardPrintingResolver } from "./card-printing-resolver.service";
import {
  CardScanStatus,
  ResolvedScanCard,
  UploadedImage,
  ScanCardStatus,
} from "./card-scan.types";
import { OpenRouterService } from "./openrouter.service";
import { CardScan, CardScanDocument } from "./schema/card-scan.schema";
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_CARDS_PER_SCAN = 60;
@Injectable()
export class CardScanService {
  private readonly logger = new Logger(CardScanService.name);
  constructor(
    @InjectModel(CardScan.name) private readonly model: Model<CardScanDocument>,
    private readonly vision: OpenRouterService,
    private readonly resolver: CardPrintingResolver,
    private readonly config: ConfigService,
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
    try {
      const result = await this.vision.recognizeCards(
        file.buffer,
        file.mimetype,
      );
      if (!result.cards.length)
        throw new UnprocessableEntityException(
          "No Magic: The Gathering cards were detected",
        );
      const quantity = result.cards.reduce(
        (total, card) => total + card.quantity,
        0,
      );
      if (quantity > MAX_CARDS_PER_SCAN)
        throw new UnprocessableEntityException(
          `A scan cannot contain more than ${MAX_CARDS_PER_SCAN} cards`,
        );
      const cards = await this.resolver.resolveAll(result.cards);
      const status = this.computeStatus(cards);
      const completedScan = await this.model.findByIdAndUpdate(
        scan.id,
        {
          $set: { cards, status, modelUsed: result.model, usage: result.usage },
        },
        { new: true },
      );
      const resolved = cards.filter(
        (card) => card.status === ScanCardStatus.RESOLVED,
      ).length;
      const ambiguous = cards.filter(
        (card) => card.status === ScanCardStatus.AMBIGUOUS,
      ).length;
      const notFound = cards.filter(
        (card) => card.status === ScanCardStatus.NOT_FOUND,
      ).length;
      this.logger.log(
        `Card scan ${completedScan!.id} detected ${quantity} cards: ${resolved} resolved, ${ambiguous} ambiguous, ${notFound} not found`,
      );
      return completedScan!;
    } catch (error) {
      const reason = this.publicFailureReason(error);
      await this.model.findByIdAndUpdate(scan.id, {
        $set: { status: CardScanStatus.FAILED, failureReason: reason },
      });
      this.logger.error(`Card scan ${scan.id} failed: ${reason}`);
      throw error;
    }
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
    card.candidates = undefined;
    scan.status = this.computeStatus(scan.cards as ResolvedScanCard[]);
    await scan.save();
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
  private publicFailureReason(error: unknown): string {
    return error instanceof HttpException ? error.message : "Card scan failed";
  }

  private computeStatus(cards: ResolvedScanCard[]): CardScanStatus {
    return cards.every((card) => card.status === ScanCardStatus.RESOLVED)
      ? CardScanStatus.READY
      : CardScanStatus.NEEDS_REVIEW;
  }
}
