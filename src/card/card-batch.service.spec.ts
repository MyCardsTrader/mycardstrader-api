import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Model } from "mongoose";
import { CardBatchService } from "./card-batch.service";
import { CardDocument } from "./schema/card.schema";
import { CardLang } from "./interfaces/lang.enum";
import { Grading } from "./interfaces/grading.enum";

describe("CardBatchService transactions", () => {
  const id = "507f191e810c19729de860ea";
  const session = { id: "transaction" };
  const card = {
    _id: id,
    user: "owner",
    availability: "available",
    lang: CardLang.FR,
    grading: Grading.M,
    foil_treatment: "foil",
  };
  let model: any;
  let service: CardBatchService;
  const update = { items: [{ cardId: id, changes: { lang: CardLang.FR } }] };
  const query = (value: unknown) => ({
    session: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
  });

  beforeEach(() => {
    model = {
      db: { transaction: jest.fn((work) => work(session)) },
      find: jest.fn(() => query([card])),
      bulkWrite: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    service = new CardBatchService(model as Model<CardDocument>);
  });

  it("updates and reads back using one transaction with owner-scoped writes", async () => {
    expect(await service.update(update, "owner")).toEqual({
      updatedCount: 1,
      cards: [
        {
          _id: id,
          lang: CardLang.FR,
          grading: Grading.M,
          foil_treatment: "foil",
        },
      ],
    });
    expect(model.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { _id: id, user: "owner", availability: "available" },
            update: { $set: { lang: "fr" } },
          },
        },
      ],
      { session, ordered: true },
    );
    expect(model.find).toHaveBeenCalledTimes(2);
    expect(
      model.find.mock.results.every(
        (result) => result.value.session.mock.calls[0][0] === session,
      ),
    ).toBe(true);
    expect(model.db.transaction).toHaveBeenCalledWith(expect.any(Function), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
  });

  it("deletes using the same transaction and ownership predicate", async () => {
    expect(await service.delete({ cardIds: [id] }, "owner")).toEqual({
      deletedCount: 1,
      deletedIds: [id],
    });
    expect(model.deleteMany).toHaveBeenCalledWith(
      { _id: { $in: [id] }, user: "owner", availability: "available" },
      { session },
    );
  });

  it("rejects absent/foreign cards before writes", async () => {
    model.find.mockReturnValue(query([]));
    await expect(service.update(update, "owner")).rejects.toMatchObject({
      response: { code: "CARD_BATCH_NOT_FOUND", cardIds: [id] },
    });
    await expect(
      service.delete({ cardIds: [id] }, "owner"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(model.bulkWrite).not.toHaveBeenCalled();
    expect(model.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects cards already traded", async () => {
    model.find.mockReturnValue(query([{ ...card, availability: "traded" }]));
    await expect(service.update(update, "owner")).rejects.toMatchObject({
      response: { code: "CARD_BATCH_CONFLICT", cardIds: [id] },
    });
  });

  it("aborts when update or delete counts differ from the checked selection", async () => {
    model.bulkWrite.mockResolvedValue({ matchedCount: 0 });
    await expect(service.update(update, "owner")).rejects.toBeInstanceOf(
      ConflictException,
    );
    model.deleteMany.mockResolvedValue({ deletedCount: 0 });
    await expect(
      service.delete({ cardIds: [id] }, "owner"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("sanitizes transaction/commit failures", async () => {
    model.db.transaction.mockRejectedValue(
      new Error("secret database address"),
    );
    await expect(service.update(update, "owner")).rejects.toMatchObject({
      response: {
        code: "CARD_BATCH_FAILED",
        message: expect.not.stringContaining("secret"),
      },
    });
    await expect(
      service.delete({ cardIds: [id] }, "owner"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
