import { HttpService } from "@nestjs/axios";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { CardRecognitionCandidate, ScryfallCard } from "./card-scan.types";
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
          { timeout: this.timeout },
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
  async findPrintings(name: string, set: string): Promise<ScryfallCard[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<SearchResponse>(
          "https://api.scryfall.com/cards/search",
          {
            timeout: this.timeout,
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
  private get timeout(): number {
    return this.config.getOrThrow<number>("cardScan.externalHttpTimeoutMs");
  }
  private isCard(value: unknown): value is ScryfallCard {
    if (typeof value !== "object" || value === null) return false;
    const card = value as Record<string, unknown>;
    return ["id", "oracle_id", "name", "set", "collector_number"].every(
      (field) => typeof card[field] === "string" && card[field] !== "",
    );
  }
}
