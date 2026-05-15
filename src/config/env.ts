export const DEFAULT_PORT = 80;
export const DEFAULT_JWT_EXPIRE_MINUTES = 60;

export const getEnvFilePath = (nodeEnv = process.env.NODE_ENV): string => {
  return `${nodeEnv ?? 'development'}.env`;
};

export const parseInteger = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};
