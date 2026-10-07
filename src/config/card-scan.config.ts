import { registerAs } from "@nestjs/config";
import { parseInteger } from "./env";
export const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3.7-flash";
export const DEFAULT_EXTERNAL_HTTP_TIMEOUT_MS = 15_000;
export const DEFAULT_CARD_SCAN_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const parseBoolean = (value: string | undefined, fallback: boolean) =>
  value == null ? fallback : value === "true";
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
  cropPaddingRatio: Number(process.env.CARD_SCAN_CROP_PADDING_RATIO ?? 0.02),
  cropFormat: process.env.CARD_SCAN_CROP_FORMAT ?? "webp",
  cropQuality: parseInteger(process.env.CARD_SCAN_CROP_QUALITY, 90),
  promptVersion: process.env.CARD_SCAN_PROMPT_VERSION ?? "v1",
  pipelineVersion: process.env.CARD_SCAN_PIPELINE_VERSION ?? "v1",
  storage: {
    endpoint: process.env.CARD_SCAN_STORAGE_ENDPOINT ?? "http://localhost:9000",
    region: process.env.CARD_SCAN_STORAGE_REGION ?? "us-east-1",
    bucket: process.env.CARD_SCAN_STORAGE_BUCKET ?? "card-scan-dataset",
    accessKeyId: process.env.CARD_SCAN_STORAGE_ACCESS_KEY_ID ?? "mycardstrader",
    secretAccessKey:
      process.env.CARD_SCAN_STORAGE_SECRET_ACCESS_KEY ??
      "mycardstrader-local-secret",
    forcePathStyle: parseBoolean(
      process.env.CARD_SCAN_STORAGE_FORCE_PATH_STYLE,
      true,
    ),
  },
}));
