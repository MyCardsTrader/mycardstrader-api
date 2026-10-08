import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
export interface PutCardCrop {
  objectKey: string;
  buffer: Buffer;
  mimeType: string;
  sha256: string;
}

@Injectable()
export class CardCropStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>("cardScan.storage.bucket");
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>("cardScan.storage.endpoint"),
      region: config.getOrThrow<string>("cardScan.storage.region"),
      forcePathStyle: config.getOrThrow<boolean>(
        "cardScan.storage.forcePathStyle",
      ),
      credentials: {
        accessKeyId: config.getOrThrow<string>("cardScan.storage.accessKeyId"),
        secretAccessKey: config.getOrThrow<string>(
          "cardScan.storage.secretAccessKey",
        ),
      },
    });
  }
  async put(input: PutCardCrop): Promise<{ objectKey: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.buffer,
        ContentType: input.mimeType,
        Metadata: { sha256: input.sha256 },
      }),
    );
    return { objectKey: input.objectKey };
  }
  async delete(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }
}
