import { registerAs } from "@nestjs/config";
import { parseInteger } from "./env";

export const DEFAULT_SCRYFALL_SYNC_BATCH_SIZE = 500;
export const DEFAULT_SCRYFALL_SYNC_HTTP_TIMEOUT_MS = 10 * 60 * 1000;

export default registerAs("scryfallSync", () => ({
  batchSize: parseInteger(
    process.env.SCRYFALL_SYNC_BATCH_SIZE,
    DEFAULT_SCRYFALL_SYNC_BATCH_SIZE,
  ),
  httpTimeoutMs: parseInteger(
    process.env.SCRYFALL_SYNC_HTTP_TIMEOUT_MS,
    DEFAULT_SCRYFALL_SYNC_HTTP_TIMEOUT_MS,
  ),
}));
