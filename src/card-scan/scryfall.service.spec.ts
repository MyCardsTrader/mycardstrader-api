import { ServiceUnavailableException } from "@nestjs/common";
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
  });
  it("gets a localized printing by set, collector number, and language", async () => {
    const french = {
      ...valid,
      lang: "fr" as const,
      printed_name: "Anneau solaire",
    };
    http.get.mockReturnValue(of({ data: french }));
    await expect(
      service.getLocalizedPrinting("c m", "3/95", "fr"),
    ).resolves.toEqual(french);
    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining("c%20m/3%2F95/fr"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
  it("returns null for malformed localized data", async () => {
    http.get.mockReturnValue(of({ data: { id: "bad" } }));
    await expect(
      service.getLocalizedPrinting("cmm", "395", "fr"),
    ).resolves.toBeNull();
  });
  it("returns null when a localized printing does not exist", async () => {
    const error = new AxiosError();
    error.response = { status: 404 } as never;
    http.get.mockReturnValue(throwError(() => error));
    await expect(
      service.getLocalizedPrinting("cmm", "395", "fr"),
    ).resolves.toBeNull();
  });
  it("maps localized lookup failures", async () => {
    http.get.mockReturnValue(throwError(() => new Error()));
    await expect(
      service.getLocalizedPrinting("cmm", "395", "fr"),
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
      service.getLocalizedPrinting("cmm", "395", "fr"),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
