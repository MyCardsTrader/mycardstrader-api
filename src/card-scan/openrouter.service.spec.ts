import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AxiosError } from "axios";
import { of, throwError } from "rxjs";
import { OpenRouterService } from "./openrouter.service";
describe("OpenRouterService", () => {
  const http = { post: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) =>
      key.includes("Timeout")
        ? 100
        : key.includes("ApiKey")
          ? "secret"
          : "test-model",
    ),
  };
  let service: OpenRouterService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpenRouterService(http as never, config as never);
  });
  const respond = (content: unknown, usage?: object) =>
    http.post.mockReturnValue(
      of({
        data: {
          model: "actual-model",
          choices: [{ message: { content } }],
          usage,
        },
      }),
    );
  it("returns normalized structured candidates and usage", async () => {
    respond(
      JSON.stringify({
        cards: [
          {
            printedName: " Anneau solaire ",
            canonicalName: " Sol Ring ",
            language: "FR",
            languageConfidence: 0.95,
            set: "CMM",
            collectorNumber: null,
            quantity: 2,
            confidence: 0.9,
          },
        ],
      }),
      { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.01 },
    );
    await expect(
      service.recognizeCards(Buffer.from("x"), "image/png"),
    ).resolves.toEqual({
      cards: [
        {
          printedName: "Anneau solaire",
          canonicalName: "Sol Ring",
          language: "fr",
          languageConfidence: 0.95,
          set: "cmm",
          collectorNumber: undefined,
          quantity: 2,
          confidence: 0.9,
        },
      ],
      model: "actual-model",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, cost: 0.01 },
    });
    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ response_format: expect.any(Object) }),
      expect.objectContaining({ timeout: 100 }),
    );
  });
  it("uses configured model and omits usage", async () => {
    http.post.mockReturnValue(
      of({
        data: {
          choices: [{ message: { content: JSON.stringify({ cards: [] }) } }],
        },
      }),
    );
    await expect(
      service.recognizeCards(Buffer.from("x"), "image/jpeg"),
    ).resolves.toEqual({ cards: [], model: "test-model", usage: undefined });
  });
  it.each([undefined, "not-json"])(
    "rejects absent or invalid JSON",
    async (content) => {
      respond(content);
      await expect(
        service.recognizeCards(Buffer.from("x"), "image/png"),
      ).rejects.toThrow(BadGatewayException);
    },
  );
  it.each([
    JSON.stringify([]),
    JSON.stringify({ cards: [null] }),
    JSON.stringify({ cards: [{ quantity: 0 }] }),
    JSON.stringify({ cards: [{ quantity: 1, confidence: 2 }] }),
    JSON.stringify({ cards: [{ quantity: 1, canonicalName: 4 }] }),
    JSON.stringify({ cards: [{ quantity: 1, printedName: " " }] }),
  ])("rejects malformed structured output", async (content) => {
    respond(content);
    await expect(
      service.recognizeCards(Buffer.from("x"), "image/png"),
    ).rejects.toThrow(BadGatewayException);
  });
  it("maps request timeouts", async () => {
    const error = new AxiosError("timeout");
    error.code = "ECONNABORTED";
    http.post.mockReturnValue(throwError(() => error));
    await expect(
      service.recognizeCards(Buffer.from("x"), "image/png"),
    ).rejects.toThrow(GatewayTimeoutException);
  });
  it("hides provider failures", async () => {
    http.post.mockReturnValue(
      throwError(() => new Error("secret provider error")),
    );
    await expect(
      service.recognizeCards(Buffer.from("x"), "image/png"),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

describe("OpenRouterService defensive parser branches", () => {
  const parse = (content: string) =>
    (new OpenRouterService({} as never, {} as never) as any).parseCandidates(
      content,
    );
  it.each([
    "null",
    "{}",
    JSON.stringify({ cards: [{ quantity: 61 }] }),
    JSON.stringify({ cards: [{ quantity: 1.5 }] }),
    JSON.stringify({ cards: [{ quantity: 1, confidence: "high" }] }),
    JSON.stringify({ cards: [{ quantity: 1, confidence: -1 }] }),
    JSON.stringify({ cards: [{ quantity: 1, languageConfidence: 2 }] }),
    JSON.stringify({ cards: [{ quantity: 1, language: "xx" }] }),
    JSON.stringify({ cards: [{ quantity: 1, collectorNumber: 3 }] }),
  ])("rejects every malformed boundary", (content) => {
    expect(() => parse(content)).toThrow(BadGatewayException);
  });
  it("accepts absent confidence and all absent optional strings", () => {
    expect(parse(JSON.stringify({ cards: [{ quantity: 1 }] }))).toEqual([
      {
        printedName: undefined,
        canonicalName: undefined,
        language: undefined,
        languageConfidence: undefined,
        set: undefined,
        collectorNumber: undefined,
        quantity: 1,
        confidence: undefined,
      },
    ]);
  });
});

describe("OpenRouterService missing response shapes", () => {
  it.each([{}, { choices: [] }, { choices: [{}] }])(
    "rejects a response without message content",
    async (data) => {
      const http = { post: jest.fn().mockReturnValue(of({ data })) };
      const config = {
        getOrThrow: (key: string) => (key.includes("Timeout") ? 100 : "value"),
      };
      const service = new OpenRouterService(http as never, config as never);
      await expect(
        service.recognizeCards(Buffer.from("x"), "image/png"),
      ).rejects.toThrow(BadGatewayException);
    },
  );
});
