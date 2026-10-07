import sharp from "sharp";
import { CardCropService } from "./card-crop.service";

describe("CardCropService", () => {
  const config = {
    getOrThrow: (key: string) => (key.endsWith("Ratio") ? 0.1 : 90),
  };
  const service = new CardCropService(config as never);
  it("orients, pads, bounds and hashes a stable WebP crop", async () => {
    const source = await sharp({
      create: { width: 100, height: 200, channels: 3, background: "red" },
    })
      .jpeg()
      .toBuffer();
    const result = await service.generate(source, {
      xMin: 0,
      yMin: 0.2,
      xMax: 0.5,
      yMax: 1,
    });
    expect(result).toMatchObject({
      mimeType: "image/webp",
      width: 60,
      height: 180,
      size: result.buffer.length,
    });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("rejects invalid images", async () => {
    await expect(
      service.generate(Buffer.from("bad"), {
        xMin: 0,
        yMin: 0,
        xMax: 1,
        yMax: 1,
      }),
    ).rejects.toThrow();
  });
});
