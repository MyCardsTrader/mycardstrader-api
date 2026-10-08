import { UnprocessableEntityException } from "@nestjs/common";
import { ProcessCardScanService } from "./process-card-scan.service";
import { CardScanStatus, ScanCardStatus } from "../card-scan.types";

describe("ProcessCardScanService", () => {
  const scans = { findByIdAndUpdate: jest.fn() };
  const vision = { recognizeCards: jest.fn() };
  const resolver = { resolveAll: jest.fn() };
  const dataset = { execute: jest.fn() };
  const service = new ProcessCardScanService(
    scans as never,
    vision as never,
    resolver as never,
    dataset as never,
  );
  const box = { xMin: 0, yMin: 0, xMax: 1, yMax: 1 };
  const input = {
    scanId: "scan",
    userId: "user",
    image: { buffer: Buffer.from("x"), mimeType: "image/png" },
  };
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [ScanCardStatus.RESOLVED, CardScanStatus.READY],
    [ScanCardStatus.AMBIGUOUS, CardScanStatus.NEEDS_REVIEW],
    [ScanCardStatus.NOT_FOUND, CardScanStatus.NEEDS_REVIEW],
  ])("processes %s cards", async (cardStatus, scanStatus) => {
    vision.recognizeCards.mockResolvedValue({
      cards: [{ quantity: 1, boundingBox: box }],
      model: "model",
    });
    resolver.resolveAll.mockResolvedValue([
      {
        id: "random",
        quantity: 1,
        detected: { quantity: 1, boundingBox: box },
        status: cardStatus,
        ...(cardStatus === ScanCardStatus.RESOLVED
          ? { resolved: { scryfallId: "id" } }
          : cardStatus === ScanCardStatus.AMBIGUOUS
            ? { candidates: [] }
            : {}),
      },
    ]);
    scans.findByIdAndUpdate.mockResolvedValue({ status: scanStatus });
    await expect(service.execute(input)).resolves.toEqual({
      status: scanStatus,
    });
    expect(dataset.execute).toHaveBeenCalledWith([
      expect.objectContaining({ scanCardId: "card-1", occurrenceIndex: 0 }),
    ]);
  });

  it.each([
    [[], "No Magic"],
    [
      Array.from({ length: 61 }, () => ({ quantity: 1, boundingBox: box })),
      "more than 60",
    ],
  ])("rejects unusable detections", async (cards, message) => {
    vision.recognizeCards.mockResolvedValue({ cards, model: "model" });
    scans.findByIdAndUpdate.mockResolvedValue({});
    await expect(service.execute(input)).rejects.toThrow(message as string);
    expect(scans.findByIdAndUpdate).toHaveBeenLastCalledWith("scan", {
      $set: expect.objectContaining({ status: CardScanStatus.FAILED }),
    });
  });

  it("hides unexpected failure details in persistence", async () => {
    vision.recognizeCards.mockRejectedValue(new Error("secret"));
    await expect(service.execute(input)).rejects.toThrow("secret");
    expect(scans.findByIdAndUpdate).toHaveBeenCalledWith("scan", {
      $set: {
        status: CardScanStatus.FAILED,
        failureReason: "Card scan failed",
      },
    });
  });
});
