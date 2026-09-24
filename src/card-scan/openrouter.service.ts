import { HttpService } from "@nestjs/axios";
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import {
  CARD_VISION_RESPONSE_SCHEMA,
  CARD_VISION_SYSTEM_PROMPT,
} from "./card-vision.prompt";
import {
  CardRecognitionCandidate,
  SCRYFALL_LANGUAGES,
  ScryfallLanguage,
  VisionRecognitionResult,
} from "./card-scan.types";

interface OpenRouterResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}
@Injectable()
export class OpenRouterService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}
  async recognizeCards(
    image: Buffer,
    mimeType: string,
  ): Promise<VisionRecognitionResult> {
    const model = this.config.getOrThrow<string>("cardScan.openRouterModel");
    try {
      const response = await firstValueFrom(
        this.httpService.post<OpenRouterResponse>(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [
              { role: "system", content: CARD_VISION_SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Identify all visible Magic: The Gathering cards.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${image.toString("base64")}`,
                    },
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "mtg_card_recognition",
                strict: true,
                schema: CARD_VISION_RESPONSE_SCHEMA,
              },
            },
            temperature: 0,
          },
          {
            timeout: this.config.getOrThrow<number>(
              "cardScan.externalHttpTimeoutMs",
            ),
            headers: {
              Authorization: `Bearer ${this.config.getOrThrow<string>("cardScan.openRouterApiKey")}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );
      const cards = this.parseCandidates(
        response.data.choices?.[0]?.message?.content,
      );
      return {
        cards,
        model: response.data.model ?? model,
        usage: response.data.usage
          ? {
              inputTokens: response.data.usage.prompt_tokens,
              outputTokens: response.data.usage.completion_tokens,
              totalTokens: response.data.usage.total_tokens,
              cost: response.data.usage.cost,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof AxiosError && error.code === "ECONNABORTED")
        throw new GatewayTimeoutException("Card recognition timed out");
      throw new ServiceUnavailableException("Card recognition is unavailable");
    }
  }
  private parseCandidates(content?: string): CardRecognitionCandidate[] {
    if (!content)
      throw new BadGatewayException("Card recognition returned no result");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadGatewayException("Card recognition returned invalid JSON");
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { cards?: unknown }).cards)
    )
      throw new BadGatewayException(
        "Card recognition returned an invalid result",
      );
    return (parsed as { cards: unknown[] }).cards.map((value) =>
      this.parseCandidate(value),
    );
  }
  private parseCandidate(candidate: unknown): CardRecognitionCandidate {
    if (typeof candidate !== "object" || candidate === null)
      throw new BadGatewayException(
        "Card recognition returned a malformed card",
      );
    const value = candidate as Record<string, unknown>;
    if (
      !Number.isInteger(value.quantity) ||
      Number(value.quantity) < 1 ||
      Number(value.quantity) > 60 ||
      !this.isOptionalConfidence(value.confidence) ||
      !this.isOptionalConfidence(value.languageConfidence)
    )
      throw new BadGatewayException(
        "Card recognition returned a malformed card",
      );
    const optionalString = (key: string) => {
      const item = value[key];
      if (item == null) return undefined;
      if (typeof item !== "string" || !item.trim())
        throw new BadGatewayException(
          "Card recognition returned a malformed card",
        );
      return item.trim();
    };
    const language = optionalString("language")?.toLowerCase();
    if (language && !SCRYFALL_LANGUAGES.includes(language as ScryfallLanguage))
      throw new BadGatewayException(
        "Card recognition returned a malformed card",
      );
    return {
      printedName: optionalString("printedName"),
      canonicalName: optionalString("canonicalName"),
      language: language as ScryfallLanguage | undefined,
      set: optionalString("set")?.toLowerCase(),
      collectorNumber: optionalString("collectorNumber"),
      quantity: Number(value.quantity),
      confidence:
        typeof value.confidence === "number" ? value.confidence : undefined,
      languageConfidence:
        typeof value.languageConfidence === "number"
          ? value.languageConfidence
          : undefined,
    };
  }
  private isOptionalConfidence(value: unknown): boolean {
    return (
      value == null || (typeof value === "number" && value >= 0 && value <= 1)
    );
  }
}
