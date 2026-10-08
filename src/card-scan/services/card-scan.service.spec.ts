import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CardScanService } from "./card-scan.service";
import { CardScanStatus, ScanCardStatus } from "../card-scan.types";
const printing = {
  scryfallId: "11111111-1111-4111-8111-111111111111",
  oracleId: "22222222-2222-4222-8222-222222222222",
  name: "Sol Ring",
  set: "cmm",
  collectorNumber: "395",
};
describe("CardScanService qualification and ownership", () => {
  const model = { findOne: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  const verifier = { execute: jest.fn() };
  let service: CardScanService;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new CardScanService(
      model as never,
      config as never,
      {} as never,
      verifier as never,
    );
  });
  it("accepts a stored validated candidate and marks the scan ready", async () => {
    const scan = {
      cards: [
        {
          id: "card-1",
          quantity: 1,
          status: ScanCardStatus.AMBIGUOUS,
          detected: { name: "Sol Ring", quantity: 1 },
          candidates: [printing],
        },
      ],
      status: CardScanStatus.NEEDS_REVIEW,
      save: jest.fn().mockResolvedValue(undefined),
    };
    model.findOne.mockResolvedValue(scan);
    const result = await service.qualifyCard(
      "user-1",
      "scan-1",
      "card-1",
      printing.scryfallId,
    );
    expect(result.status).toBe(CardScanStatus.READY);
    expect(result.cards[0]).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: printing,
    });
    expect(scan.save).toHaveBeenCalled();
    expect(verifier.execute).toHaveBeenCalledWith(
      "scan-1",
      "card-1",
      "user-1",
      printing,
    );
  });
  it("keeps review status when another card remains unresolved", async () => {
    const scan = {
      cards: [
        {
          id: "card-1",
          status: ScanCardStatus.AMBIGUOUS,
          candidates: [printing],
        },
        { id: "card-2", status: ScanCardStatus.NOT_FOUND },
      ],
      status: CardScanStatus.NEEDS_REVIEW,
      save: jest.fn(),
    };
    model.findOne.mockResolvedValue(scan);
    await service.qualifyCard(
      "user-1",
      "scan-1",
      "card-1",
      printing.scryfallId,
    );
    expect(scan.status).toBe(CardScanStatus.NEEDS_REVIEW);
  });
  it("marks a scan imported when only not-found cards remain", async () => {
    const scan = {
      cards: [{ id: "missing", status: ScanCardStatus.NOT_FOUND }],
      status: CardScanStatus.NEEDS_REVIEW,
      save: jest.fn().mockResolvedValue(undefined),
    };
    model.findOne.mockResolvedValue(scan);
    await expect(service.markImported("user-1", "scan-1")).resolves.toBe(scan);
    expect(scan.status).toBe(CardScanStatus.IMPORTED);
    expect(scan.save).toHaveBeenCalled();
  });
  it("rejects completion while an ambiguous card remains", async () => {
    model.findOne.mockResolvedValue({
      cards: [{ id: "ambiguous", status: ScanCardStatus.AMBIGUOUS }],
    });
    await expect(service.markImported("user-1", "scan-1")).rejects.toThrow(
      BadRequestException,
    );
  });
  it("rejects a Scryfall id outside the stored candidates", async () => {
    model.findOne.mockResolvedValue({
      cards: [{ id: "card-1", candidates: [printing] }],
    });
    await expect(
      service.qualifyCard(
        "user-1",
        "scan-1",
        "card-1",
        "33333333-3333-4333-8333-333333333333",
      ),
    ).rejects.toThrow(BadRequestException);
  });
  it("rejects qualification when no candidates were stored", async () => {
    model.findOne.mockResolvedValue({ cards: [{ id: "card-1" }] });
    await expect(
      service.qualifyCard("user-1", "scan-1", "card-1", printing.scryfallId),
    ).rejects.toThrow(BadRequestException);
  });
  it("returns not found instead of exposing another user's scan", async () => {
    model.findOne.mockResolvedValue(null);
    await expect(service.getScan("user-1", "foreign-scan")).rejects.toThrow(
      NotFoundException,
    );
    expect(model.findOne).toHaveBeenCalledWith({
      _id: "foreign-scan",
      userId: "user-1",
    });
  });
  it("returns not found for a missing card within an owned scan", async () => {
    model.findOne.mockResolvedValue({ cards: [] });
    await expect(
      service.qualifyCard("user-1", "scan-1", "missing", printing.scryfallId),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("CardScanService processing", () => {
  const model = {
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
  };
  const processor = { execute: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) =>
      key.endsWith("maxImageBytes") ? 10 : "vision-model",
    ),
  };
  const file = { buffer: Buffer.from("image"), mimetype: "image/png", size: 5 };
  let service: CardScanService;
  beforeEach(() => {
    jest.clearAllMocks();
    config.getOrThrow.mockImplementation((key: string) =>
      key.endsWith("maxImageBytes") ? 10 : "vision-model",
    );
    service = new CardScanService(
      model as never,
      config as never,
      processor as never,
      {} as never,
    );
    model.create.mockResolvedValue({ id: "scan-1" });
  });
  it("processes and stores a ready scan", async () => {
    processor.execute.mockResolvedValue({
      id: "scan-1",
      status: CardScanStatus.READY,
    });
    await expect(service.createScan("user-1", file)).resolves.toMatchObject({
      status: CardScanStatus.READY,
    });
    expect(processor.execute).toHaveBeenCalledWith({
      scanId: "scan-1",
      userId: "user-1",
      image: { buffer: file.buffer, mimeType: file.mimetype },
    });
  });
  it("marks a scan needs_review when one result is unresolved", async () => {
    processor.execute.mockResolvedValue({
      id: "scan-1",
      status: CardScanStatus.NEEDS_REVIEW,
    });
    await expect(service.createScan("user-1", file)).resolves.toMatchObject({
      status: CardScanStatus.NEEDS_REVIEW,
    });
  });
  it.each([
    [undefined, "One image"],
    [{ ...file, size: 0 }, "One image"],
    [{ ...file, mimetype: "image/gif" }, "Unsupported"],
    [{ ...file, size: 11 }, "size limit"],
  ])("rejects invalid uploads", async (upload, message) => {
    await expect(service.createScan("user-1", upload as never)).rejects.toThrow(
      message as string,
    );
    expect(model.create).not.toHaveBeenCalled();
  });
  it.each([undefined, CardScanStatus.NEEDS_REVIEW])(
    "lists only owned scans with an optional status",
    async (status) => {
      const exec = jest.fn().mockResolvedValue([]);
      const sort = jest.fn(() => ({ exec }));
      model.find.mockReturnValue({ sort });
      await expect(service.listScans("user-1", status)).resolves.toEqual([]);
      expect(model.find).toHaveBeenCalledWith(
        status ? { userId: "user-1", status } : { userId: "user-1" },
      );
    },
  );
});
