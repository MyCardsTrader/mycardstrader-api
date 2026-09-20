import { ServiceUnavailableException } from "@nestjs/common";
import { AxiosError } from "axios";
import { of, throwError } from "rxjs";
import { ScryfallService } from "./scryfall.service";
const valid = {
  id: "id",
  oracle_id: "oracle",
  name: "Sol Ring",
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
      service.getPrintingDetails([{ name: "Sol Ring", quantity: 1 }]),
    ).resolves.toEqual([]);
    expect(http.post).not.toHaveBeenCalled();
  });
  it("gets valid exact details in one collection call", async () => {
    http.post.mockReturnValue(of({ data: { data: [valid, { id: "bad" }] } }));
    await expect(
      service.getPrintingDetails([
        { set: "cmm", collectorNumber: "395", quantity: 1 },
      ]),
    ).resolves.toEqual([valid]);
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining("collection"),
      { identifiers: [{ set: "cmm", collector_number: "395" }] },
      { timeout: 100 },
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
  it("searches valid printings", async () => {
    http.get.mockReturnValue(of({ data: { data: [valid, null] } }));
    await expect(service.findPrintings("Sol Ring", "cmm")).resolves.toEqual([
      valid,
    ]);
  });
  it("handles malformed search data", async () => {
    http.get.mockReturnValue(of({ data: {} }));
    await expect(service.findPrintings("Sol Ring", "cmm")).resolves.toEqual([]);
  });
  it("turns Scryfall 404 into no matches", async () => {
    const error = new AxiosError();
    error.response = { status: 404 } as never;
    http.get.mockReturnValue(throwError(() => error));
    await expect(service.findPrintings("Missing", "cmm")).resolves.toEqual([]);
  });
  it("maps other search failures", async () => {
    http.get.mockReturnValue(throwError(() => new Error()));
    await expect(service.findPrintings("Sol Ring", "cmm")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

describe("ScryfallService network error branch", () => {
  it("maps an Axios error without a response", async () => {
    const http = {
      get: jest
        .fn()
        .mockReturnValue(throwError(() => new AxiosError("network"))),
    };
    const service = new ScryfallService(
      http as never,
      { getOrThrow: () => 100 } as never,
    );
    await expect(service.findPrintings("Sol Ring", "cmm")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
