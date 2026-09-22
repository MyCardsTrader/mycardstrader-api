/** Ignore OCR padding only for purely numeric collector numbers. */
export function normalizeCollectorNumber(value: string): string {
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, "") : value;
}
