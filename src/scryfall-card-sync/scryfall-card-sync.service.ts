import { HttpService } from "@nestjs/axios";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { AxiosResponse } from "axios";
import { Model } from "mongoose";
import { Readable } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { firstValueFrom } from "rxjs";
import {
  ScryfallCard,
  ScryfallCardDocument,
} from "./schema/scryfall-card.schema";

interface BulkDataDescriptor {
  type?: string;
  download_uri?: string;
  jsonl_download_uri?: string;
}

interface BulkDownload {
  uri: string;
  format: "json-array" | "jsonl-gzip";
}

export interface ScryfallSyncResult {
  processed: number;
  batches: number;
  skipped: boolean;
}

const BULK_DATA_URL = "https://api.scryfall.com/bulk-data/all-cards";
const USER_AGENT = "NearbyCardTrader/1.0 scryfall-card-sync";
const HEADERS = {
  Accept: "application/json;q=0.9,*/*;q=0.8",
  "User-Agent": USER_AGENT,
};

@Injectable()
export class ScryfallCardSyncService {
  private readonly logger = new Logger(ScryfallCardSyncService.name);
  private running = false;

  constructor(
    @InjectModel(ScryfallCard.name)
    private readonly cards: Model<ScryfallCardDocument>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  @Cron("0 0 4 * * *", {
    name: "scryfall-all-cards-sync",
    timeZone: "Europe/Paris",
    waitForCompletion: true,
  })
  async synchronize(): Promise<ScryfallSyncResult> {
    if (this.running) {
      this.logger.warn("Scryfall card synchronization is already running");
      return { processed: 0, batches: 0, skipped: true };
    }

    this.running = true;
    try {
      const download = await this.getDownload();
      const stream = await this.download(download.uri);
      const result = await this.ingest(stream, download.format);
      this.logger.log(
        `Scryfall synchronization completed: ${result.processed} cards in ${result.batches} batches`,
      );
      return { ...result, skipped: false };
    } catch (error) {
      this.logger.error("Scryfall card synchronization failed", error);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        "Scryfall card synchronization is unavailable",
      );
    } finally {
      this.running = false;
    }
  }

  private async getDownload(): Promise<BulkDownload> {
    const response = await firstValueFrom(
      this.http.get<BulkDataDescriptor>(BULK_DATA_URL, this.requestConfig),
    );
    const descriptor = response.data;
    if (descriptor.type !== "all_cards")
      throw new ServiceUnavailableException(
        "Scryfall returned an invalid all-cards descriptor",
      );
    const uri = descriptor.jsonl_download_uri ?? descriptor.download_uri;
    if (!uri)
      throw new ServiceUnavailableException(
        "Scryfall returned an invalid all-cards descriptor",
      );
    this.assertTrustedDownloadUri(uri);
    return {
      uri,
      format: descriptor.jsonl_download_uri ? "jsonl-gzip" : "json-array",
    };
  }

  private async download(uri: string): Promise<Readable> {
    const response = await firstValueFrom(
      this.http.get<Readable>(uri, {
        ...this.requestConfig,
        responseType: "stream",
      }),
    );
    return this.extractReadable(response);
  }

  private async ingest(
    stream: Readable,
    format: BulkDownload["format"],
  ): Promise<{
    processed: number;
    batches: number;
  }> {
    const batchSize = this.config.getOrThrow<number>("scryfallSync.batchSize");
    const syncedAt = new Date();
    let batch: Record<string, unknown>[] = [];
    let processed = 0;
    let batches = 0;

    const cards =
      format === "jsonl-gzip"
        ? this.parseJsonLines(stream.pipe(createGunzip()))
        : this.parseCards(stream);
    for await (const card of cards) {
      batch.push(card);
      if (batch.length >= batchSize) {
        await this.writeBatch(batch, syncedAt);
        processed += batch.length;
        batches++;
        batch = [];
      }
    }

    if (batch.length) {
      await this.writeBatch(batch, syncedAt);
      processed += batch.length;
      batches++;
    }
    return { processed, batches };
  }

  private async *parseJsonLines(
    stream: Readable,
  ): AsyncGenerator<Record<string, unknown>> {
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new ServiceUnavailableException(
          "Scryfall returned malformed all-cards JSON Lines",
        );
      }
      yield this.parseCard(parsed);
    }
  }

  private async *parseCards(
    stream: Readable,
  ): AsyncGenerator<Record<string, unknown>> {
    const decoder = new StringDecoder("utf8");
    let state:
      | "start"
      | "valueOrEnd"
      | "value"
      | "item"
      | "commaOrEnd"
      | "done" = "start";
    let current = "";
    let depth = 0;
    let inString = false;
    let escaped = false;

    const consume = (
      character: string,
    ): Record<string, unknown> | undefined => {
      if (state === "item") {
        current += character;
        if (inString) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') inString = false;
        } else if (character === '"') inString = true;
        else if (character === "{" || character === "[") depth++;
        else if (character === "}" || character === "]") depth--;

        if (depth !== 0) return;
        state = "commaOrEnd";
        let parsed: unknown;
        try {
          parsed = JSON.parse(current);
        } catch {
          throw new ServiceUnavailableException(
            "Scryfall returned malformed all-cards JSON",
          );
        }
        current = "";
        return this.parseCard(parsed);
      }

      if (/\s/.test(character)) return;
      if (state === "start" && character === "[") {
        state = "valueOrEnd";
        return;
      }
      if (state === "valueOrEnd" && character === "]") {
        state = "done";
        return;
      }
      if ((state === "valueOrEnd" || state === "value") && character === "{") {
        state = "item";
        current = character;
        depth = 1;
        return;
      }
      if (state === "commaOrEnd" && character === ",") {
        state = "value";
        return;
      }
      if (state === "commaOrEnd" && character === "]") {
        state = "done";
        return;
      }
      throw new ServiceUnavailableException(
        "Scryfall returned malformed all-cards JSON",
      );
    };

    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk));
      for (const character of decoder.write(buffer)) {
        const card = consume(character);
        if (card) yield card;
      }
    }
    // StringDecoder only emits here for a truncated final UTF-8 sequence. Such a
    // sequence cannot complete a valid JSON card, but consuming it reports a
    // malformed provider response instead of silently discarding it.
    /* istanbul ignore next */
    for (const character of decoder.end()) {
      const card = consume(character);
      if (card) yield card;
    }
    if ((state as string) !== "done")
      throw new ServiceUnavailableException(
        "Scryfall returned malformed all-cards JSON",
      );
  }

  private async writeBatch(
    cards: Record<string, unknown>[],
    syncedAt: Date,
  ): Promise<void> {
    await this.cards.bulkWrite(
      cards.map((card) => {
        const { priceHistory: _priceHistory, ...currentCard } = card;
        return {
          updateOne: {
            filter: { id: card.id },
            update: {
              $set: { ...currentCard, syncedAt },
              $push: {
                priceHistory: {
                  capturedAt: syncedAt,
                  prices: card.prices ?? null,
                },
              },
            },
            upsert: true,
          },
        };
      }),
      { ordered: false },
    );
  }

  private parseCard(value: unknown): Record<string, unknown> {
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>).id !== "string" ||
      !(value as Record<string, unknown>).id
    )
      throw new ServiceUnavailableException(
        "Scryfall returned a malformed card",
      );
    return value as Record<string, unknown>;
  }

  private assertTrustedDownloadUri(uri: string): void {
    let url: URL;
    try {
      url = new URL(uri);
    } catch {
      throw new ServiceUnavailableException(
        "Scryfall returned an invalid download URI",
      );
    }
    if (
      url.protocol !== "https:" ||
      (url.hostname !== "scryfall.io" && !url.hostname.endsWith(".scryfall.io"))
    )
      throw new ServiceUnavailableException(
        "Scryfall returned an invalid download URI",
      );
  }

  private extractReadable(response: AxiosResponse<Readable>): Readable {
    if (!response.data || typeof response.data.pipe !== "function")
      throw new ServiceUnavailableException(
        "Scryfall returned an invalid all-cards stream",
      );
    return response.data;
  }

  private get requestConfig() {
    return {
      timeout: this.config.getOrThrow<number>("scryfallSync.httpTimeoutMs"),
      headers: HEADERS,
    };
  }
}
