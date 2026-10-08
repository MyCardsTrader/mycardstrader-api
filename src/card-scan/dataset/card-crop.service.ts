import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { BoundingBox } from "../card-scan.types";

export interface GeneratedCrop {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  sha256: string;
}

@Injectable()
export class CardCropService {
  constructor(private readonly config: ConfigService) {}
  async generate(image: Buffer, box: BoundingBox): Promise<GeneratedCrop> {
    const oriented = sharp(image).rotate();
    const metadata = await oriented.metadata();
    const imageWidth = metadata.width!;
    const imageHeight = metadata.height!;
    const padding = this.config.getOrThrow<number>("cardScan.cropPaddingRatio");
    const left = Math.max(0, Math.floor((box.xMin - padding) * imageWidth));
    const top = Math.max(0, Math.floor((box.yMin - padding) * imageHeight));
    const right = Math.min(
      imageWidth,
      Math.ceil((box.xMax + padding) * imageWidth),
    );
    const bottom = Math.min(
      imageHeight,
      Math.ceil((box.yMax + padding) * imageHeight),
    );
    const buffer = await oriented
      .extract({ left, top, width: right - left, height: bottom - top })
      .webp({ quality: this.config.getOrThrow<number>("cardScan.cropQuality") })
      .toBuffer();
    return {
      buffer,
      mimeType: "image/webp",
      width: right - left,
      height: bottom - top,
      size: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    };
  }
}
