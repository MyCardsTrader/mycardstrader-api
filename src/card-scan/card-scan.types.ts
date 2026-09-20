export enum CardScanStatus {
  PROCESSING = "processing",
  READY = "ready",
  NEEDS_REVIEW = "needs_review",
  FAILED = "failed",
}
export enum ScanCardStatus {
  RESOLVED = "resolved",
  AMBIGUOUS = "ambiguous",
  NOT_FOUND = "not_found",
}
export interface CardRecognitionCandidate {
  name?: string;
  set?: string;
  collectorNumber?: string;
  quantity: number;
  confidence?: number;
}
export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  set: string;
  collector_number: string;
}
export interface ValidatedPrinting {
  scryfallId: string;
  oracleId: string;
  name: string;
  set: string;
  collectorNumber: string;
}
export interface ResolvedScanCard {
  id: string;
  quantity: number;
  status: ScanCardStatus;
  detected: CardRecognitionCandidate;
  resolved?: ValidatedPrinting;
  candidates?: ValidatedPrinting[];
}
export interface VisionUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
}
export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
export interface VisionRecognitionResult {
  cards: CardRecognitionCandidate[];
  model: string;
  usage?: VisionUsage;
}
