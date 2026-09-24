import { ServiceUnavailableException } from "@nestjs/common";
import { Subject, of, throwError } from "rxjs";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { ScryfallCardSyncService } from "./scryfall-card-sync.service";

const descriptor = {
  type: "all_cards",
  download_uri: "https://data.scryfall.io/all-cards.json",
};

const jsonStream = (value: unknown): Readable =>
  Readable.from([JSON.stringify(value)]);

describe("ScryfallCardSyncService", () => {
  const model = { bulkWrite: jest.fn() };
  const http = { get: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) => (key.endsWith("batchSize") ? 2 : 100)),
  };
  let service: ScryfallCardSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScryfallCardSyncService(
      model as never,
      http as never,
      config as never,
    );
    model.bulkWrite.mockResolvedValue({});
  });

  function respondWith(cards: unknown[]): void {
    http.get
      .mockReturnValueOnce(of({ data: descriptor }))
      .mockReturnValueOnce(of({ data: jsonStream(cards) }));
  }

  it("downloads, streams and merges cards in unordered batches", async () => {
    respondWith([
      { id: "card-1", name: "Old name", prices: { eur: "1.00" } },
      { id: "card-2", name: "Second" },
      { id: "card-3", name: "Third" },
    ]);

    await expect(service.synchronize()).resolves.toEqual({
      processed: 3,
      batches: 2,
      skipped: false,
    });
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      "https://api.scryfall.com/bulk-data/all-cards",
      expect.objectContaining({
        timeout: 100,
        headers: expect.objectContaining({
          "User-Agent": "NearbyCardTrader/1.0 scryfall-card-sync",
          Accept: "application/json;q=0.9,*/*;q=0.8",
        }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      descriptor.download_uri,
      expect.objectContaining({ responseType: "stream" }),
    );
    expect(model.bulkWrite).toHaveBeenCalledTimes(2);
    expect(model.bulkWrite).toHaveBeenNthCalledWith(
      1,
      [
        {
          updateOne: {
            filter: { id: "card-1" },
            update: {
              $set: expect.objectContaining({
                id: "card-1",
                name: "Old name",
                prices: { eur: "1.00" },
                syncedAt: expect.any(Date),
              }),
              $push: {
                priceHistory: {
                  capturedAt: expect.any(Date),
                  prices: { eur: "1.00" },
                },
              },
            },
            upsert: true,
          },
        },
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: { id: "card-2" },
            upsert: true,
          }),
        }),
      ],
      { ordered: false },
    );
  });

  it("handles an empty catalog without writing", async () => {
    respondWith([]);
    await expect(service.synchronize()).resolves.toEqual({
      processed: 0,
      batches: 0,
      skipped: false,
    });
    expect(model.bulkWrite).not.toHaveBeenCalled();
  });

  it("skips a concurrent synchronization", async () => {
    const metadata = new Subject<unknown>();
    http.get.mockImplementation((url: string) =>
      url.includes("bulk-data") ? metadata : of({ data: jsonStream([]) }),
    );
    const first = service.synchronize();
    await expect(service.synchronize()).resolves.toEqual({
      processed: 0,
      batches: 0,
      skipped: true,
    });
    metadata.next({ data: descriptor });
    metadata.complete();
    await expect(first).resolves.toEqual({
      processed: 0,
      batches: 0,
      skipped: false,
    });
  });

  it.each([
    {},
    { type: "oracle_cards", download_uri: descriptor.download_uri },
    { type: "all_cards" },
  ])("rejects an invalid bulk descriptor", async (data) => {
    http.get.mockReturnValue(of({ data }));
    await expect(service.synchronize()).rejects.toThrow(
      "invalid all-cards descriptor",
    );
  });

  it.each([
    "not a URL",
    "http://data.scryfall.io/all-cards.json",
    "https://example.com/all-cards.json",
  ])("rejects an untrusted download URI %s", async (download_uri) => {
    http.get.mockReturnValue(
      of({
        data: { type: "all_cards", download_uri },
      }),
    );
    await expect(service.synchronize()).rejects.toThrow("invalid download URI");
  });

  it("ingests the current Scryfall JSON Lines gzip format", async () => {
    const jsonlUri =
      "https://data.scryfall.io/all-cards/all-cards-20260924211809.jsonl.gz";
    http.get
      .mockReturnValueOnce(
        of({
          data: {
            type: "all_cards",
            jsonl_download_uri: jsonlUri,
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: Readable.from([
            gzipSync(
              '{"id":"card-1","prices":{"eur":"1.00"}}\n\n{"id":"card-2"}\n',
            ),
          ]),
        }),
      );

    await expect(service.synchronize()).resolves.toEqual({
      processed: 2,
      batches: 1,
      skipped: false,
    });
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      jsonlUri,
      expect.objectContaining({ responseType: "stream" }),
    );
  });

  it("rejects malformed Scryfall JSON Lines", async () => {
    http.get
      .mockReturnValueOnce(
        of({
          data: {
            type: "all_cards",
            jsonl_download_uri:
              "https://data.scryfall.io/all-cards/all-cards.jsonl.gz",
          },
        }),
      )
      .mockReturnValueOnce(
        of({ data: Readable.from([gzipSync('{"id":}\n')]) }),
      );

    await expect(service.synchronize()).rejects.toThrow(
      "malformed all-cards JSON Lines",
    );
  });

  it("accepts the root Scryfall download host", async () => {
    http.get
      .mockReturnValueOnce(
        of({
          data: {
            type: "all_cards",
            download_uri: "https://scryfall.io/all-cards.json",
          },
        }),
      )
      .mockReturnValueOnce(of({ data: jsonStream([]) }));
    await expect(service.synchronize()).resolves.toMatchObject({
      skipped: false,
    });
  });

  it("rejects a response that is not a readable stream", async () => {
    http.get
      .mockReturnValueOnce(of({ data: descriptor }))
      .mockReturnValueOnce(of({ data: {} }));
    await expect(service.synchronize()).rejects.toThrow(
      "invalid all-cards stream",
    );
  });

  it.each([{}, { id: "" }, { id: 4 }])(
    "rejects malformed card data %j",
    async (card) => {
      respondWith([card]);
      await expect(service.synchronize()).rejects.toThrow("malformed card");
      expect(model.bulkWrite).not.toHaveBeenCalled();
    },
  );

  it("maps provider and stream failures and allows a retry", async () => {
    http.get.mockReturnValueOnce(throwError(() => new Error("network")));
    await expect(service.synchronize()).rejects.toThrow(
      "synchronization is unavailable",
    );
    respondWith([]);
    await expect(service.synchronize()).resolves.toMatchObject({
      skipped: false,
    });
  });

  it("preserves explicit synchronization errors", async () => {
    http.get.mockReturnValue(
      throwError(() => new ServiceUnavailableException("provider unavailable")),
    );
    await expect(service.synchronize()).rejects.toThrow("provider unavailable");
  });

  it.each(["not-json", '[{"id":"card-1",}]', '[{"id":"card-1"'])(
    "maps invalid JSON streams",
    async (payload) => {
      http.get
        .mockReturnValueOnce(of({ data: descriptor }))
        .mockReturnValueOnce(of({ data: Readable.from([payload]) }));
      await expect(service.synchronize()).rejects.toThrow(
        "malformed all-cards JSON",
      );
    },
  );

  it("accepts JSON whitespace around and between cards", async () => {
    http.get.mockReturnValueOnce(of({ data: descriptor })).mockReturnValueOnce(
      of({
        data: Readable.from([' \n [ {"id":"card-1"} , {"id":"card-2"} ] \n ']),
      }),
    );
    await expect(service.synchronize()).resolves.toMatchObject({
      processed: 2,
    });
  });

  it("parses nested values, escapes and UTF-8 split across stream chunks", async () => {
    const payload = JSON.stringify([
      { id: "card-1", name: 'Épée "rare"', faces: [{ name: "recto" }] },
    ]);
    const bytes = Buffer.from(payload);
    const accent = bytes.indexOf(Buffer.from("É"));
    const chunks = [
      bytes.subarray(0, accent + 1),
      bytes.subarray(accent + 1, accent + 7),
      bytes.subarray(accent + 7),
    ];
    http.get
      .mockReturnValueOnce(of({ data: descriptor }))
      .mockReturnValueOnce(of({ data: Readable.from(chunks) }));

    await expect(service.synchronize()).resolves.toMatchObject({
      processed: 1,
    });
    expect(model.bulkWrite).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          updateOne: expect.objectContaining({
            update: {
              $set: expect.objectContaining({
                id: "card-1",
                name: 'Épée "rare"',
                faces: [{ name: "recto" }],
              }),
              $push: {
                priceHistory: {
                  capturedAt: expect.any(Date),
                  prices: null,
                },
              },
            },
          }),
        }),
      ],
      { ordered: false },
    );
  });

  it("maps Mongo batch failures", async () => {
    respondWith([{ id: "card-1" }]);
    model.bulkWrite.mockRejectedValue(new Error("mongo unavailable"));
    await expect(service.synchronize()).rejects.toThrow(
      "synchronization is unavailable",
    );
  });
});
