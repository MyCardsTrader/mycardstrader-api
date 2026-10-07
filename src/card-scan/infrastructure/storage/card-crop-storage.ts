export interface PutCardCrop {
  objectKey: string;
  buffer: Buffer;
  mimeType: string;
  sha256: string;
}
export interface StoredCardCrop {
  objectKey: string;
}
export interface CardCropStorage {
  put(input: PutCardCrop): Promise<StoredCardCrop>;
  delete(objectKey: string): Promise<void>;
}
export const CARD_CROP_STORAGE = Symbol("CARD_CROP_STORAGE");
