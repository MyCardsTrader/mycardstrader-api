import { NotFoundException } from "@nestjs/common";
import { VerifyDatasetSampleService } from "./verify-dataset-sample.service";
import { DatasetLabelStatus } from "./card-scan-sample.types";

describe("VerifyDatasetSampleService", () => {
  const samples = { findOne: jest.fn() };
  const service = new VerifyDatasetSampleService(samples as never);
  const printing = { scryfallId: "printing" } as never;
  beforeEach(() => jest.clearAllMocks());
  it("rejects a missing or foreign sample", async () => {
    samples.findOne.mockResolvedValue(null);
    await expect(
      service.execute("scan", "card", "user", printing),
    ).rejects.toThrow(NotFoundException);
  });
  it("adds a human label and its history", async () => {
    const sample = {
      label: { status: DatasetLabelStatus.PENDING },
      labelHistory: [],
      save: jest.fn(),
    };
    samples.findOne.mockResolvedValue(sample);
    await service.execute("scan", "card", "user", printing);
    expect(sample.label).toMatchObject({
      status: DatasetLabelStatus.USER_VERIFIED,
      printing,
      verifiedBy: "user",
    });
    expect(sample.labelHistory).toHaveLength(1);
    expect(sample.save).toHaveBeenCalled();
  });
  it("is idempotent for an identical human label", async () => {
    const sample = {
      label: { status: DatasetLabelStatus.USER_VERIFIED, printing },
      labelHistory: [{}],
      save: jest.fn(),
    };
    samples.findOne.mockResolvedValue(sample);
    await service.execute("scan", "card", "user", printing);
    expect(sample.save).not.toHaveBeenCalled();
  });
  it("replaces a human label whose printing differs", async () => {
    const sample = {
      label: { status: DatasetLabelStatus.USER_VERIFIED },
      labelHistory: [],
      save: jest.fn(),
    };
    samples.findOne.mockResolvedValue(sample);
    await service.execute("scan", "card", "user", printing);
    expect(sample.save).toHaveBeenCalled();
  });
});
