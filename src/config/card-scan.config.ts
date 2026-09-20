import { registerAs } from "@nestjs/config";
import { parseInteger } from "./env";
export const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3.7-flash";
export const DEFAULT_EXTERNAL_HTTP_TIMEOUT_MS = 15_000;
export const DEFAULT_CARD_SCAN_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export default registerAs("cardScan", () => ({
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
  externalHttpTimeoutMs: parseInteger(
    process.env.CARD_SCAN_HTTP_TIMEOUT_MS,
    DEFAULT_EXTERNAL_HTTP_TIMEOUT_MS,
  ),
  maxImageBytes: parseInteger(
    process.env.CARD_SCAN_MAX_IMAGE_BYTES,
    DEFAULT_CARD_SCAN_MAX_IMAGE_BYTES,
  ),
}));
