import { HttpService } from "@nestjs/axios";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import {
  CardRecognitionCandidate,
  SCRYFALL_LANGUAGES,
  ScryfallCard,
  ScryfallLanguage,
} from "./card-scan.types";
interface CollectionResponse {
  data?: ScryfallCard[];
}
interface SearchResponse {
  data?: ScryfallCard[];
}
@Injectable()
export class ScryfallService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}
  async getPrintingDetails(
    candidates: CardRecognitionCandidate[],
  ): Promise<ScryfallCard[]> {
    const identifiers = candidates
      .filter((card) => card.set && card.collectorNumber)
      .map((card) => ({
        set: card.set,
        collector_number: card.collectorNumber,
      }));
    if (!identifiers.length) return [];
    try {
      const response = await firstValueFrom(
        this.httpService.post<CollectionResponse>(
          "https://api.scryfall.com/cards/collection",
          { identifiers },
          this.requestConfig,
        ),
      );
      return Array.isArray(response.data.data)
        ? response.data.data.filter((card) => this.isCard(card))
        : [];
    } catch {
      throw new ServiceUnavailableException(
        "Scryfall validation is unavailable",
      );
    }
  }
  async getLocalizedPrinting(
    set: string,
    collectorNumber: string,
    language: ScryfallLanguage,
  ): Promise<ScryfallCard | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ScryfallCard>(
          `https://api.scryfall.com/cards/${encodeURIComponent(set)}/${encodeURIComponent(collectorNumber)}/${encodeURIComponent(language)}`,
          this.requestConfig,
        ),
      );
      return this.isCard(response.data) ? response.data : null;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404)
        return null;
      throw new ServiceUnavailableException(
        "Scryfall validation is unavailable",
      );
    }
  }
  async findPrintings(name: string, set: string): Promise<ScryfallCard[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<SearchResponse>(
          "https://api.scryfall.com/cards/search",
          {
            ...this.requestConfig,
            params: { q: `!\"${name}\" set:${set}`, unique: "prints" },
          },
        ),
      );
      return Array.isArray(response.data.data)
        ? response.data.data.filter((card) => this.isCard(card))
        : [];
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404)
        return [];
      throw new ServiceUnavailableException(
        "Scryfall validation is unavailable",
      );
    }
  }
  private get requestConfig() {
    return {
      timeout: this.config.getOrThrow<number>("cardScan.externalHttpTimeoutMs"),
      headers: {
        Accept: "application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "NearbyCardTrader/1.0 card-scanner",
      },
    };
  }
  private isCard(value: unknown): value is ScryfallCard {
    if (typeof value !== "object" || value === null) return false;
    const card = value as Record<string, unknown>;
    return (
      ["id", "oracle_id", "name", "lang", "set", "collector_number"].every(
        (field) => typeof card[field] === "string" && card[field] !== "",
      ) &&
      SCRYFALL_LANGUAGES.includes(card.lang as ScryfallLanguage) &&
      (card.printed_name === undefined || typeof card.printed_name === "string")
    );
  }
}
