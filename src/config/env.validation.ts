import { DEFAULT_JWT_EXPIRE_MINUTES, DEFAULT_PORT, parseInteger } from "./env";

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
  };

  if (nodeEnv !== "test") {
    return {
      ...validatedConfig,
      RESEND_API_KEY: getRequiredString(config, "RESEND_API_KEY"),
      EMAIL_FROM: getRequiredString(config, "EMAIL_FROM"),
      FRONT_URL: getRequiredString(config, "FRONT_URL"),
    };
  }

  return {
    ...validatedConfig,
    RESEND_API_KEY:
      typeof config.RESEND_API_KEY === "string" ? config.RESEND_API_KEY : "",
    EMAIL_FROM: typeof config.EMAIL_FROM === "string" ? config.EMAIL_FROM : "",
    FRONT_URL: typeof config.FRONT_URL === "string" ? config.FRONT_URL : "",
  };
};
