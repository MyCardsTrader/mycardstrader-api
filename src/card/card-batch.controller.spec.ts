import { ArgumentsHost, BadRequestException } from "@nestjs/common";
import {
  BatchValidationFilter,
  batchValidationPipe,
  CardBatchController,
} from "./card-batch.controller";
import { CardBatchService } from "./card-batch.service";
import { BatchDeleteCardsDto, BatchUpdateCardsDto } from "./dto";

describe("CardBatchController", () => {
  it("passes only JWT ownership to the batch service", async () => {
    const service = {
      update: jest.fn().mockResolvedValue({ cards: [], updatedCount: 0 }),
      delete: jest.fn().mockResolvedValue({ deletedIds: [], deletedCount: 0 }),
    };
    const controller = new CardBatchController(
      service as unknown as CardBatchService,
    );
    const req = { user: { userId: "owner" } };
    const update = { items: [] };
    const deletion = { cardIds: [] };
    expect(await controller.update(update, req)).toEqual({
      cards: [],
      updatedCount: 0,
    });
    expect(await controller.delete(deletion, req)).toEqual({
      deletedIds: [],
      deletedCount: 0,
    });
    expect(service.update).toHaveBeenCalledWith(update, "owner");
    expect(service.delete).toHaveBeenCalledWith(deletion, "owner");
  });

  it("normalizes validation errors from both global and route validation pipes", () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as ArgumentsHost;
    new BatchValidationFilter().catch(new BadRequestException(), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      code: "CARD_BATCH_INVALID",
      message: expect.any(String),
    });
  });

  it("validates nested changes and rejects owner injection and duplicate IDs", async () => {
    const id = "507f191e810c19729de860ea";
    const metadata = { type: "body" as const, metatype: BatchUpdateCardsDto };
    const payload = {
      items: [
        {
          cardId: id,
          changes: { lang: "fr", grading: "mint", foil_treatment: "foil" },
        },
      ],
    };
    await expect(
      batchValidationPipe.transform(payload, metadata),
    ).resolves.toEqual(payload);
    for (const changes of [
      {},
      { user: "other" },
      { lang: null },
      { grading: "broken" },
      { foil_treatment: "" },
    ]) {
      await expect(
        batchValidationPipe.transform(
          { items: [{ cardId: id, changes }] },
          metadata,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      batchValidationPipe.transform(
        { cardIds: [id, id] },
        { type: "body", metatype: BatchDeleteCardsDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
