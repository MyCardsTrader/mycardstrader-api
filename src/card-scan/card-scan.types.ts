export enum CardScanStatus {
  PROCESSING = "processing",
  READY = "ready",
  NEEDS_REVIEW = "needs_review",
  FAILED = "failed",
  IMPORTED = "imported",
}
export enum ScanCardStatus {
  RESOLVED = "resolved",
  AMBIGUOUS = "ambiguous",
  NOT_FOUND = "not_found",
}
export const SCRYFALL_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ja",
  "ko",
  "ru",
  "zhs",
  "zht",
  "he",
  "la",
  "grc",
  "ar",
  "sa",
  "ph",
] as const;
export type ScryfallLanguage = (typeof SCRYFALL_LANGUAGES)[number];
export interface CardRecognitionCandidate {
  printedName?: string;
  canonicalName?: string;
  language?: ScryfallLanguage;
  set?: string;
  collectorNumber?: string;
  quantity: number;
  confidence?: number;
  languageConfidence?: number;
}
export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  printed_name?: string;
  lang: ScryfallLanguage;
  set: string;
  collector_number: string;
}
export interface ValidatedPrinting {
  scryfallId: string;
  oracleId: string;
  name: string;
  printedName?: string;
  language: ScryfallLanguage;
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
  reasoning?: string;
  model: string;
  usage?: VisionUsage;
}
