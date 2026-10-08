import { HttpService } from "@nestjs/axios";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError, AxiosResponse } from "axios";
import { firstValueFrom, Observable } from "rxjs";
import { normalizeCollectorNumber } from "../utils/collector-number";
import {
  CardRecognitionCandidate,
  SCRYFALL_LANGUAGES,
  ScryfallCard,
  ScryfallLanguage,
} from "../card-scan.types";
interface CollectionResponse {
  data?: ScryfallCard[];
}
interface SearchResponse {
  data?: ScryfallCard[];
}
const SCRYFALL_REQUEST_INTERVAL_MS = 600;
@Injectable()
export class ScryfallService {
  private readonly logger = new Logger(ScryfallService.name);
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestStartedAt = 0;
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
        collector_number: normalizeCollectorNumber(card.collectorNumber!),
      }));
    if (!identifiers.length) return [];
    try {
      const response = await this.request(() =>
        this.httpService.post<CollectionResponse>(
          "https://api.scryfall.com/cards/collection",
          { identifiers },
          this.requestConfig,
        ),
      );
      return Array.isArray(response.data.data)
        ? response.data.data.filter((card) => this.isCard(card))
        : [];
    } catch (error) {
      this.throwUnavailable("collection lookup", error);
    }
  }
  async findLocalizedPrintings(
    name: string,
    language: ScryfallLanguage,
  ): Promise<ScryfallCard[]> {
    try {
      const namedResponse = await this.request(() =>
        this.httpService.get<ScryfallCard>(
          "https://api.scryfall.com/cards/named",
          {
            ...this.requestConfig,
            params: { fuzzy: name },
          },
        ),
      );
      if (!this.isCard(namedResponse.data)) return [];
      const response = await this.request(() =>
        this.httpService.get<SearchResponse>(
          "https://api.scryfall.com/cards/search",
          {
            ...this.requestConfig,
            params: {
              q: `oracleid:${namedResponse.data.oracle_id} lang:${language}`,
              unique: "prints",
              include_multilingual: true,
            },
          },
        ),
      );
      return Array.isArray(response.data.data)
        ? response.data.data.filter((card) => this.isCard(card))
        : [];
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404)
        return [];
      this.throwUnavailable("localized printing lookup", error);
    }
  }
  async findPrintedNameCandidates(
    name: string,
    language: ScryfallLanguage,
  ): Promise<ScryfallCard[]> {
    const fragment = name.trim().slice(1);
    if (fragment.length < 5) return [];
    const escapedFragment = fragment.replace(/[\\/^$.*+?()[\]{}|]/g, "\\$&");
    try {
      const response = await this.request(() =>
        this.httpService.get<SearchResponse>(
          "https://api.scryfall.com/cards/search",
          {
            ...this.requestConfig,
            params: {
              q: `lang:${language} name:/${escapedFragment}/ include:multilingual`,
              unique: "prints",
              include_multilingual: true,
            },
          },
        ),
      );
      return Array.isArray(response.data.data)
        ? response.data.data.filter((card) => this.isCard(card))
        : [];
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404)
        return [];
      this.throwUnavailable("printed-name fragment search", error);
    }
  }
  async findPrintings(name: string, set: string): Promise<ScryfallCard[]> {
    try {
      const response = await this.request(() =>
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
      this.throwUnavailable("name-and-set search", error);
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
  private request<T>(
    request: () => Observable<AxiosResponse<T>>,
  ): Promise<AxiosResponse<T>> {
    const queued = this.requestQueue.then(async () => {
      const waitMs = Math.max(
        0,
        this.lastRequestStartedAt + SCRYFALL_REQUEST_INTERVAL_MS - Date.now(),
      );
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.lastRequestStartedAt = Date.now();
      return firstValueFrom(request());
    });
    this.requestQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }
  private throwUnavailable(operation: string, error: unknown): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? "no-response";
      const responseBody = this.serializeLogValue(error.response?.data);
      this.logger.error(
        `Scryfall ${operation} failed: HTTP ${status}; axiosCode=${error.code ?? "none"}; response=${responseBody}`,
      );
    } else {
      this.logger.error(
        `Scryfall ${operation} failed without an HTTP response: ${this.serializeLogValue(error)}`,
      );
    }
    throw new ServiceUnavailableException("Scryfall validation is unavailable");
  }
  private serializeLogValue(value: unknown): string {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === "string") return value;
    if (value === undefined) return "undefined";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
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
