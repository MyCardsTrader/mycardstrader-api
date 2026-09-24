import { DEFAULT_JWT_EXPIRE_MINUTES, DEFAULT_PORT, parseInteger } from "./env";
import {
  DEFAULT_SCRYFALL_SYNC_BATCH_SIZE,
  DEFAULT_SCRYFALL_SYNC_HTTP_TIMEOUT_MS,
} from "./scryfall-sync.config";

type EnvConfig = Record<string, unknown>;

const getRequiredString = (config: EnvConfig, key: string): string => {
  const value = config[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
};

export const validateEnv = (config: EnvConfig) => {
  const nodeEnv =
    typeof config.NODE_ENV === "string" && config.NODE_ENV.trim() !== ""
      ? config.NODE_ENV
      : "development";

  const validatedConfig = {
    NODE_ENV: nodeEnv,
    DATABASE_URI: getRequiredString(config, "DATABASE_URI"),
    JWT_SECRET: getRequiredString(config, "JWT_SECRET"),
    JWT_EXPIRE: parseInteger(config.JWT_EXPIRE, DEFAULT_JWT_EXPIRE_MINUTES),
    PORT: parseInteger(config.PORT, DEFAULT_PORT),
    OPENROUTER_MODEL:
      typeof config.OPENROUTER_MODEL === "string" &&
      config.OPENROUTER_MODEL.trim() !== ""
        ? config.OPENROUTER_MODEL
        : "qwen/qwen3.7-flash",
    CARD_SCAN_HTTP_TIMEOUT_MS: parseInteger(
      config.CARD_SCAN_HTTP_TIMEOUT_MS,
      15_000,
    ),
    CARD_SCAN_MAX_IMAGE_BYTES: parseInteger(
      config.CARD_SCAN_MAX_IMAGE_BYTES,
      10 * 1024 * 1024,
    ),
    SCRYFALL_SYNC_BATCH_SIZE: parseInteger(
      config.SCRYFALL_SYNC_BATCH_SIZE,
      DEFAULT_SCRYFALL_SYNC_BATCH_SIZE,
    ),
    SCRYFALL_SYNC_HTTP_TIMEOUT_MS: parseInteger(
      config.SCRYFALL_SYNC_HTTP_TIMEOUT_MS,
      DEFAULT_SCRYFALL_SYNC_HTTP_TIMEOUT_MS,
    ),
  };

  if (nodeEnv !== "test") {
    return {
      ...validatedConfig,
      RESEND_API_KEY: getRequiredString(config, "RESEND_API_KEY"),
      EMAIL_FROM: getRequiredString(config, "EMAIL_FROM"),
      FRONT_URL: getRequiredString(config, "FRONT_URL"),
      OPENROUTER_API_KEY: getRequiredString(config, "OPENROUTER_API_KEY"),
    };
  }

  return {
    ...validatedConfig,
    RESEND_API_KEY:
      typeof config.RESEND_API_KEY === "string" ? config.RESEND_API_KEY : "",
    EMAIL_FROM: typeof config.EMAIL_FROM === "string" ? config.EMAIL_FROM : "",
    FRONT_URL: typeof config.FRONT_URL === "string" ? config.FRONT_URL : "",
    OPENROUTER_API_KEY:
      typeof config.OPENROUTER_API_KEY === "string"
        ? config.OPENROUTER_API_KEY
        : "test-openrouter-key",
  };
};
