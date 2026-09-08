import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model } from "mongoose";
import { Card, CardDocument } from "./schema/card.schema";
import {
  BatchDeleteCardsDto,
  BatchDeleteResponseDto,
  BatchUpdateCardsDto,
  BatchUpdateResponseDto,
} from "./dto";

@Injectable()
export class CardBatchService {
  constructor(
    @InjectModel(Card.name) private readonly cards: Model<CardDocument>,
  ) {}

  async update(
    dto: BatchUpdateCardsDto,
    userId: string,
  ): Promise<BatchUpdateResponseDto> {
    const ids = dto.items.map((item) => item.cardId);
    return this.transaction(async (session) => {
      await this.checkCards(ids, userId, session);
      const result = await this.cards.bulkWrite(
        dto.items.map((item) => ({
          updateOne: {
            filter: {
              _id: item.cardId,
              user: userId,
              availability: "available",
            },
            update: { $set: item.changes },
          },
        })),
        { session, ordered: true },
      );
      if (result.matchedCount !== ids.length) this.conflict(ids);
      const updated = await this.cards
        .find({ _id: { $in: ids }, user: userId })
        .session(session)
        .exec();
      return {
        updatedCount: updated.length,
        cards: updated.map((card) => ({
          _id: card._id.toString(),
          lang: card.lang,
          grading: card.grading,
          foil_treatment: card.foil_treatment,
        })),
      };
    });
  }

  async delete(
    dto: BatchDeleteCardsDto,
    userId: string,
  ): Promise<BatchDeleteResponseDto> {
    return this.transaction(async (session) => {
      await this.checkCards(dto.cardIds, userId, session);
      const result = await this.cards.deleteMany(
        { _id: { $in: dto.cardIds }, user: userId, availability: "available" },
        { session },
      );
      if (result.deletedCount !== dto.cardIds.length)
        this.conflict(dto.cardIds);
      return { deletedCount: result.deletedCount, deletedIds: dto.cardIds };
    });
  }

  private async checkCards(
    ids: string[],
    userId: string,
    session: ClientSession,
  ): Promise<void> {
    const cards = await this.cards
      .find({ _id: { $in: ids }, user: userId })
      .session(session)
      .exec();
    const found = new Set(cards.map((card) => card._id.toString()));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length)
      throw new NotFoundException({
        code: "CARD_BATCH_NOT_FOUND",
        message:
          "Some selected cards no longer exist or are not in your binder. No changes were applied.",
        cardIds: missing,
      });
    const unavailable = cards
      .filter((card) => card.availability !== "available")
      .map((card) => card._id.toString());
    if (unavailable.length) this.conflict(unavailable);
  }

  private conflict(cardIds: string[]): never {
    throw new ConflictException({
      code: "CARD_BATCH_CONFLICT",
      message:
        "Some selected cards are no longer available. Refresh your binder and retry. No changes were applied.",
      cardIds,
    });
  }

  private async transaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.cards.db.transaction(work, {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: "CARD_BATCH_FAILED",
        message:
          "The batch could not be confirmed. Refresh your binder before retrying.",
      });
    }
  }
}
