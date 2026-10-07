const send = jest.fn();
const client = jest.fn(() => ({ send }));
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: client,
  PutObjectCommand: jest.fn((input) => ({ kind: "put", input })),
  DeleteObjectCommand: jest.fn((input) => ({ kind: "delete", input })),
}));
import { S3CardCropStorage } from "./s3-card-crop.storage";

describe("S3CardCropStorage", () => {
  const values: Record<string, unknown> = {
    "cardScan.storage.bucket": "bucket",
    "cardScan.storage.endpoint": "http://minio:9000",
    "cardScan.storage.region": "us-east-1",
    "cardScan.storage.forcePathStyle": true,
    "cardScan.storage.accessKeyId": "access",
    "cardScan.storage.secretAccessKey": "secret",
  };
  const storage = new S3CardCropStorage({
    getOrThrow: (key: string) => values[key],
  } as never);
  beforeEach(() => send.mockReset());
  it("uploads a private crop with its digest", async () => {
    await expect(
      storage.put({
        objectKey: "key",
        buffer: Buffer.from("x"),
        mimeType: "image/webp",
        sha256: "hash",
      }),
    ).resolves.toEqual({ objectKey: "key" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ kind: "put" }));
  });
  it("deletes an object", async () => {
    await storage.delete("key");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "delete" }),
    );
  });
});
