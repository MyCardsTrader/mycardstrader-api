import { CreateDatasetSamplesService } from "./create-dataset-samples.service";
import { DatasetLabelStatus } from "./card-scan-sample.types";

describe("CreateDatasetSamplesService", () => {
  const samples = { exists: jest.fn(), updateOne: jest.fn() };
  const crops = { generate: jest.fn() };
  const storage = { put: jest.fn(), delete: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) =>
      key.endsWith("Version") ? "v1" : undefined,
    ),
  };
  const service = new CreateDatasetSamplesService(
    samples as never,
    crops as never,
    storage as never,
    config as never,
  );
  const base = {
    scanId: "scan",
    scanCardId: "card-1",
    userId: "user",
    occurrenceIndex: 0,
    detected: {
      quantity: 1,
      boundingBox: { xMin: 0, yMin: 0, xMax: 1, yMax: 1 },
    },
    candidates: [],
    model: "model",
    sourceImage: Buffer.from("x"),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    samples.exists.mockResolvedValue(false);
    crops.generate.mockResolvedValue({
      buffer: Buffer.from("crop"),
      mimeType: "image/webp",
      width: 10,
      height: 20,
      size: 4,
      sha256: "hash",
    });
  });
  it.each([
    [undefined, DatasetLabelStatus.PENDING],
    [{ scryfallId: "id" }, DatasetLabelStatus.AUTO_VERIFIED],
  ])("upserts pending and automatic labels", async (resolved, status) => {
    await service.execute([{ ...base, resolved } as never]);
    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: "card-scans/dataset/scan/card-1/0.webp",
      }),
    );
    expect(samples.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      {
        $setOnInsert: expect.objectContaining({
          label: expect.objectContaining({ status }),
        }),
      },
      { upsert: true },
    );
  });
  it("skips an existing sample on retry", async () => {
    samples.exists.mockResolvedValue(true);
    await service.execute([base as never]);
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("deletes an uploaded object when Mongo persistence fails", async () => {
    samples.updateOne.mockRejectedValue(new Error("mongo"));
    await expect(service.execute([base as never])).rejects.toThrow("mongo");
    expect(storage.delete).toHaveBeenCalledWith(
      "card-scans/dataset/scan/card-1/0.webp",
    );
  });
});
