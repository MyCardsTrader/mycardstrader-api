import {
  appConfig,
  authConfig,
  databaseConfig,
  DEFAULT_JWT_EXPIRE_MINUTES,
  DEFAULT_PORT,
  getEnvFilePath,
  mailConfig,
  parseInteger,
  validateEnv,
} from "./index";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("env helpers", () => {
    it("returns the env file path for the current env", () => {
      expect(getEnvFilePath("test")).toBe("test.env");
    });

    it("falls back to development env file", () => {
      delete process.env.NODE_ENV;
      expect(getEnvFilePath(undefined)).toBe("development.env");
    });

    it("parses integers", () => {
      expect(parseInteger("42", 10)).toBe(42);
    });

    it("falls back when integer parsing fails", () => {
      expect(parseInteger("invalid", 10)).toBe(10);
    });
  });

  describe("appConfig", () => {
    it("uses the configured port and env", () => {
      process.env.PORT = "3001";
      process.env.NODE_ENV = "test";

      expect(appConfig()).toEqual({
        port: 3001,
        nodeEnv: "test",
      });
    });

    it("falls back to defaults", () => {
      delete process.env.PORT;
      delete process.env.NODE_ENV;

      expect(appConfig()).toEqual({
        port: DEFAULT_PORT,
        nodeEnv: "development",
      });
    });
  });

  describe("authConfig", () => {
    it("maps auth environment variables", () => {
      process.env.JWT_SECRET = "secret";
      process.env.JWT_EXPIRE = "15";

      expect(authConfig()).toEqual({
        jwtSecret: "secret",
        jwtExpireMinutes: 15,
        jwtExpiresInSeconds: 900,
      });
    });

    it("falls back to defaults for auth", () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRE;

      expect(authConfig()).toEqual({
        jwtSecret: "change-me",
        jwtExpireMinutes: DEFAULT_JWT_EXPIRE_MINUTES,
        jwtExpiresInSeconds: DEFAULT_JWT_EXPIRE_MINUTES * 60,
      });
    });
  });

  describe("databaseConfig", () => {
    it("maps the database uri", () => {
      process.env.DATABASE_URI = "mongodb://localhost/test";

      expect(databaseConfig()).toEqual({
        uri: "mongodb://localhost/test",
      });
    });

    it("falls back to an empty database uri", () => {
      delete process.env.DATABASE_URI;

      expect(databaseConfig()).toEqual({
        uri: "",
      });
    });
  });

  describe("mailConfig", () => {
    it("maps the Resend environment variables", () => {
      process.env.RESEND_API_KEY = "re_test";
      process.env.EMAIL_FROM = "test@example.com";
      process.env.FRONT_URL = "http://localhost:4200";

      expect(mailConfig()).toEqual({
        resendApiKey: "re_test",
        emailFrom: "test@example.com",
        frontUrl: "http://localhost:4200",
      });
    });

    it("falls back to empty mail settings", () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;
      delete process.env.FRONT_URL;

      expect(mailConfig()).toEqual({
        resendApiKey: "",
        emailFrom: "",
        frontUrl: "",
      });
    });
  });

  describe("validateEnv", () => {
    it("validates non-test envs with mail settings", () => {
      expect(
        validateEnv({
          NODE_ENV: "development",
          DATABASE_URI: "mongodb://localhost/dev",
          JWT_SECRET: "secret",
          JWT_EXPIRE: "30",
          PORT: "3000",
          RESEND_API_KEY: "re_test",
          EMAIL_FROM: "test@example.com",
          FRONT_URL: "http://localhost:4200",
        }),
      ).toEqual({
        NODE_ENV: "development",
        DATABASE_URI: "mongodb://localhost/dev",
        JWT_SECRET: "secret",
        JWT_EXPIRE: 30,
        PORT: 3000,
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "test@example.com",
        FRONT_URL: "http://localhost:4200",
      });
    });

    it("allows test env without mail settings", () => {
      expect(
        validateEnv({
          NODE_ENV: "test",
          DATABASE_URI: "mongodb://localhost/test",
          JWT_SECRET: "secret",
          JWT_EXPIRE: "60",
          PORT: "3003",
        }),
      ).toEqual({
        NODE_ENV: "test",
        DATABASE_URI: "mongodb://localhost/test",
        JWT_SECRET: "secret",
        JWT_EXPIRE: 60,
        PORT: 3003,
        RESEND_API_KEY: "",
        EMAIL_FROM: "",
        FRONT_URL: "",
      });
    });

    it("keeps optional mail settings when provided in test env", () => {
      expect(
        validateEnv({
          NODE_ENV: "test",
          DATABASE_URI: "mongodb://localhost/test",
          JWT_SECRET: "secret",
          JWT_EXPIRE: "60",
          PORT: "3003",
          RESEND_API_KEY: "re_test",
          EMAIL_FROM: "test@example.com",
          FRONT_URL: "http://localhost:4200",
        }),
      ).toEqual({
        NODE_ENV: "test",
        DATABASE_URI: "mongodb://localhost/test",
        JWT_SECRET: "secret",
        JWT_EXPIRE: 60,
        PORT: 3003,
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "test@example.com",
        FRONT_URL: "http://localhost:4200",
      });
    });

    it("falls back to default env values when numeric envs are invalid", () => {
      expect(
        validateEnv({
          DATABASE_URI: "mongodb://localhost/test",
          JWT_SECRET: "secret",
          JWT_EXPIRE: "invalid",
          PORT: "invalid",
          RESEND_API_KEY: "re_test",
          EMAIL_FROM: "test@example.com",
          FRONT_URL: "http://localhost:4200",
        }),
      ).toEqual({
        NODE_ENV: "development",
        DATABASE_URI: "mongodb://localhost/test",
        JWT_SECRET: "secret",
        JWT_EXPIRE: DEFAULT_JWT_EXPIRE_MINUTES,
        PORT: DEFAULT_PORT,
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "test@example.com",
        FRONT_URL: "http://localhost:4200",
      });
    });

    it("throws when a required env is missing", () => {
      expect(() =>
        validateEnv({
          NODE_ENV: "development",
          JWT_SECRET: "secret",
          JWT_EXPIRE: "60",
          PORT: "3000",
          RESEND_API_KEY: "re_test",
          EMAIL_FROM: "test@example.com",
          FRONT_URL: "http://localhost:4200",
        }),
      ).toThrow("Environment variable DATABASE_URI is required");
    });

    it("throws when a non-test env is missing RESEND_API_KEY", () => {
      expect(() =>
        validateEnv({
          NODE_ENV: "development",
          DATABASE_URI: "mongodb://localhost/dev",
          JWT_SECRET: "secret",
          JWT_EXPIRE: "60",
          PORT: "3000",
          EMAIL_FROM: "test@example.com",
          FRONT_URL: "http://localhost:4200",
        }),
      ).toThrow("Environment variable RESEND_API_KEY is required");
    });
  });
});
