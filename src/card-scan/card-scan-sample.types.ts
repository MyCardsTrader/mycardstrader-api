import {
  BoundingBox,
  CardRecognitionCandidate,
  ValidatedPrinting,
} from "./card-scan.types";

export enum DatasetLabelStatus {
  PENDING = "pending",
  AUTO_VERIFIED = "auto_verified",
  USER_VERIFIED = "user_verified",
}

export interface DatasetSampleInput {
  scanId: string;
  scanCardId: string;
  userId: string;
  occurrenceIndex: number;
  detected: CardRecognitionCandidate & { boundingBox: BoundingBox };
  candidates: ValidatedPrinting[];
  resolved?: ValidatedPrinting;
  model: string;
  sourceImage: Buffer;
}
