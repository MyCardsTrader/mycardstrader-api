import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { AxiosError } from "axios";
import { of, throwError } from "rxjs";
import { ScryfallService } from "./scryfall.service";
const valid = {
  id: "id",
  oracle_id: "oracle",
  name: "Sol Ring",
  lang: "en" as const,
  set: "cmm",
  collector_number: "395",
};
describe("ScryfallService", () => {
  const http = { post: jest.fn(), get: jest.fn() };
  const config = { getOrThrow: jest.fn(() => 100) };
  let service: ScryfallService;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    service = new ScryfallService(http as never, config as never);
  });
  it("skips collection calls without exact identifiers", async () => {
    await expect(
      service.getPrintingDetails([{ canonicalName: "Sol Ring", quantity: 1 }]),
    ).resolves.toEqual([]);
    expect(http.post).not.toHaveBeenCalled();
  });
  it("gets valid exact details in one collection call with required headers", async () => {
    http.post.mockReturnValue(of({ data: { data: [valid, { id: "bad" }] } }));
    await expect(
      service.getPrintingDetails([
        { set: "cmm", collectorNumber: "395", quantity: 1 },
      ]),
    ).resolves.toEqual([valid]);
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining("collection"),
      { identifiers: [{ set: "cmm", collector_number: "395" }] },
      {
        timeout: 100,
        headers: {
          Accept: "application/json;q=0.9,*/*;q=0.8",
          "User-Agent": "NearbyCardTrader/1.0 card-scanner",
        },
      },
    );
  });
  it("keeps concurrent Scryfall request starts at least 600 ms apart", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    http.post.mockReturnValue(of({ data: { data: [valid] } }));
    try {
      const first = service.getPrintingDetails([
        { set: "cmm", collectorNumber: "395", quantity: 1 },
      ]);
      const second = service.getPrintingDetails([
        { set: "cmm", collectorNumber: "396", quantity: 1 },
      ]);
      await first;
      await Promise.resolve();
      expect(http.post).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(599);
      expect(http.post).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await second;
      expect(http.post).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
  it("removes OCR padding from numeric collection identifiers only", async () => {
    http.post.mockReturnValue(of({ data: { data: [] } }));
    await service.getPrintingDetails([
      { set: "mh3", collectorNumber: "0039", quantity: 1 },
      { set: "mh3", collectorNumber: "000", quantity: 1 },
      { set: "mh3", collectorNumber: "0039a", quantity: 1 },
    ]);
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining("collection"),
      {
        identifiers: [
          { set: "mh3", collector_number: "39" },
          { set: "mh3", collector_number: "0" },
          { set: "mh3", collector_number: "0039a" },
        ],
      },
      expect.any(Object),
    );
  });
  it("handles malformed collection data", async () => {
    http.post.mockReturnValue(of({ data: {} }));
    await expect(
      service.getPrintingDetails([
        { set: "cmm", collectorNumber: "395", quantity: 1 },
      ]),
    ).resolves.toEqual([]);
  });
  it("maps collection failures", async () => {
    http.post.mockReturnValue(throwError(() => new Error()));
    await expect(
      service.getPrintingDetails([
        { set: "cmm", collectorNumber: "395", quantity: 1 },
      ]),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      "Scryfall collection lookup failed without an HTTP response: Error: ",
    );
  });
  it("logs the exact Scryfall response and HTTP status", async () => {
    const error = new AxiosError("rate limited", "ERR_BAD_RESPONSE");
    error.response = {
      status: 429,
      data: {
        object: "error",
        code: "rate_limited",
        details: "You are requesting too quickly.",
      },
    } as never;
    http.post.mockReturnValue(throwError(() => error));
    await expect(
      service.getPrintingDetails([
        { set: "cmm", collectorNumber: "395", quantity: 1 },
      ]),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Scryfall collection lookup failed: HTTP 429; axiosCode=ERR_BAD_RESPONSE; response={"object":"error","code":"rate_limited","details":"You are requesting too quickly."}',
    );
  });
  it("finds localized printings from a fuzzy card name", async () => {
    const french = {
      ...valid,
      lang: "fr" as const,
      printed_name: "Anneau solaire",
    };
    http.get
      .mockReturnValueOnce(of({ data: valid }))
      .mockReturnValueOnce(of({ data: { data: [french, { id: "bad" }] } }));
    await expect(
      service.findLocalizedPrintings("Anneau solaire", "fr"),
    ).resolves.toEqual([french]);
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      "https://api.scryfall.com/cards/named",
      expect.objectContaining({ params: { fuzzy: "Anneau solaire" } }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      "https://api.scryfall.com/cards/search",
      expect.objectContaining({
        params: {
          q: `oracleid:${valid.oracle_id} lang:fr`,
          unique: "prints",
          include_multilingual: true,
        },
      }),
    );
  });
  it("returns no localized printings for malformed fuzzy data", async () => {
    http.get.mockReturnValue(of({ data: { id: "bad" } }));
    await expect(
      service.findLocalizedPrintings("Anneau solaire", "fr"),
    ).resolves.toEqual([]);
    expect(http.get).toHaveBeenCalledTimes(1);
  });
  it("returns no localized printings for malformed search data", async () => {
    http.get
      .mockReturnValueOnce(of({ data: valid }))
      .mockReturnValueOnce(of({ data: {} }));
    await expect(
      service.findLocalizedPrintings("Anneau solaire", "fr"),
    ).resolves.toEqual([]);
  });
  it("returns no localized printings when the fuzzy card does not exist", async () => {
    const error = new AxiosError();
    error.response = { status: 404 } as never;
    http.get.mockReturnValue(throwError(() => error));
    await expect(
      service.findLocalizedPrintings("Carte absente", "fr"),
    ).resolves.toEqual([]);
  });
  it("maps localized lookup failures", async () => {
    http.get.mockReturnValue(throwError(() => new Error()));
    await expect(
      service.findLocalizedPrintings("Anneau solaire", "fr"),
    ).rejects.toThrow(ServiceUnavailableException);
  });
  it("searches multilingual printed-name fragments", async () => {
    const french = {
      ...valid,
      lang: "fr" as const,
      printed_name: "Fenaison",
    };
    http.get.mockReturnValue(of({ data: { data: [french, { id: "bad" }] } }));
    await expect(
      service.findPrintedNameCandidates("R/enaison", "fr"),
    ).resolves.toEqual([french]);
    expect(http.get).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/search",
      expect.objectContaining({
        params: {
          q: "lang:fr name:/\\/enaison/ include:multilingual",
          unique: "prints",
          include_multilingual: true,
        },
      }),
    );
  });
  it("skips printed-name fragment searches that are too short", async () => {
    await expect(
      service.findPrintedNameCandidates("Reap", "fr"),
    ).resolves.toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
  });
  it("handles missing and failed printed-name fragment searches", async () => {
    http.get.mockReturnValueOnce(of({ data: {} }));
    await expect(
      service.findPrintedNameCandidates("Renaison", "fr"),
    ).resolves.toEqual([]);
    const notFound = new AxiosError();
    notFound.response = { status: 404 } as never;
    http.get.mockReturnValueOnce(throwError(() => notFound));
    await expect(
      service.findPrintedNameCandidates("Renaison", "fr"),
    ).resolves.toEqual([]);
    http.get.mockReturnValueOnce(throwError(() => new Error("network")));
    await expect(
      service.findPrintedNameCandidates("Renaison", "fr"),
    ).rejects.toThrow(ServiceUnavailableException);
    http.get.mockReturnValueOnce(
      throwError(() => new AxiosError("network without response")),
    );
    await expect(
      service.findPrintedNameCandidates("Renaison", "fr"),
    ).rejects.toThrow(ServiceUnavailableException);
  });
  it("searches valid printings with headers", async () => {
    http.get.mockReturnValue(of({ data: { data: [valid, null] } }));
    await expect(service.findPrintings("Sol Ring", "cmm")).resolves.toEqual([
      valid,
    ]);
    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining("search"),
      expect.objectContaining({
        headers: expect.any(Object),
        params: { q: '!"Sol Ring" set:cmm', unique: "prints" },
      }),
    );
  });
  it("handles malformed search data", async () => {
    http.get.mockReturnValue(of({ data: {} }));
    await expect(service.findPrintings("Sol Ring", "cmm")).resolves.toEqual([]);
  });
  it("turns search 404 into no matches", async () => {
    const error = new AxiosError();
    error.response = { status: 404 } as never;
    http.get.mockReturnValue(throwError(() => error));
    await expect(service.findPrintings("Missing", "cmm")).resolves.toEqual([]);
  });
  it.each([new Error(), new AxiosError("network")])(
    "maps other search failures",
    async (error) => {
      http.get.mockReturnValue(throwError(() => error));
      await expect(service.findPrintings("Sol Ring", "cmm")).rejects.toThrow(
        ServiceUnavailableException,
      );
    },
  );
  it("rejects a malformed printed_name", async () => {
    http.get.mockReturnValue(
      of({ data: { data: [{ ...valid, printed_name: 3 }] } }),
    );
    await expect(service.findPrintings("Sol Ring", "cmm")).resolves.toEqual([]);
  });
  it("rejects an unsupported Scryfall language", async () => {
    http.get.mockReturnValue(
      of({ data: { data: [{ ...valid, lang: "xx" }] } }),
    );
    await expect(service.findPrintings("Sol Ring", "cmm")).resolves.toEqual([]);
  });
});

describe("ScryfallService localized network branch", () => {
  it("maps an Axios network error without a response", async () => {
    const http = {
      get: jest
        .fn()
        .mockReturnValue(throwError(() => new AxiosError("network"))),
    };
    const service = new ScryfallService(
      http as never,
      { getOrThrow: () => 100 } as never,
    );
    await expect(
      service.findLocalizedPrintings("Anneau solaire", "fr"),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

describe("ScryfallService error log serialization", () => {
  const service = new ScryfallService({} as never, {} as never) as any;

  it("serializes strings and undefined values", () => {
    expect(service.serializeLogValue("upstream message")).toBe(
      "upstream message",
    );
    expect(service.serializeLogValue(undefined)).toBe("undefined");
  });

  it("falls back safely for circular response bodies", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(service.serializeLogValue(circular)).toBe("[object Object]");
  });
});
