import { CardPrintingResolver } from "./card-printing-resolver.service";
import { ScanCardStatus, ScryfallCard } from "./card-scan.types";
import { ScryfallService } from "./scryfall.service";
const card = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: "11111111-1111-4111-8111-111111111111",
  oracle_id: "22222222-2222-4222-8222-222222222222",
  name: "Sol Ring",
  set: "cmm",
  collector_number: "395",
  ...overrides,
});
describe("CardPrintingResolver", () => {
  const scryfall = { getPrintingDetails: jest.fn(), findPrintings: jest.fn() };
  let resolver: CardPrintingResolver;
  beforeEach(() => {
    jest.resetAllMocks();
    resolver = new CardPrintingResolver(scryfall as unknown as ScryfallService);
    scryfall.getPrintingDetails.mockResolvedValue([]);
    scryfall.findPrintings.mockResolvedValue([]);
  });
  it("resolves an exact name, set, and collector match", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([card()]);
    const [result] = await resolver.resolveAll([
      { name: "Sol Ring", set: "cmm", collectorNumber: "395", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
    expect(result.resolved).toMatchObject({
      name: "Sol Ring",
      set: "cmm",
      collectorNumber: "395",
    });
    expect(scryfall.findPrintings).not.toHaveBeenCalled();
  });
  it("does not accept a collector number belonging to another card", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([
      card({ name: "Arcane Signet" }),
    ]);
    scryfall.findPrintings.mockResolvedValue([]);
    const [result] = await resolver.resolveAll([
      { name: "Sol Ring", set: "cmm", collectorNumber: "395", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
    expect(scryfall.findPrintings).toHaveBeenCalledWith("Sol Ring", "cmm");
  });
  it("falls back when the collector number is wrong", async () => {
    scryfall.findPrintings.mockResolvedValue([
      card({ collector_number: "396" }),
    ]);
    const [result] = await resolver.resolveAll([
      { name: "Sol Ring", set: "cmm", collectorNumber: "999", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
    expect(result.resolved?.collectorNumber).toBe("396");
  });
  it("resolves the only name and set printing", async () => {
    scryfall.findPrintings.mockResolvedValue([card()]);
    const [result] = await resolver.resolveAll([
      { name: "Sól   Ring", set: "cmm", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
  });
  it("returns all plausible candidates when multiple printings exist", async () => {
    scryfall.findPrintings.mockResolvedValue([
      card(),
      card({
        id: "33333333-3333-4333-8333-333333333333",
        collector_number: "395a",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      { name: "Sol Ring", set: "cmm", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.AMBIGUOUS);
    expect(result.candidates).toHaveLength(2);
  });
  it("returns not_found when Scryfall has no match", async () => {
    const [result] = await resolver.resolveAll([
      { name: "Imaginary Card", set: "cmm", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
  });
  it("does not choose a printing when the set is missing", async () => {
    const [result] = await resolver.resolveAll([
      { name: "Sol Ring", quantity: 1 },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.AMBIGUOUS,
      candidates: [],
    });
    expect(scryfall.findPrintings).not.toHaveBeenCalled();
  });
  it("returns not_found when the name is unreadable", async () => {
    const [result] = await resolver.resolveAll([{ set: "cmm", quantity: 1 }]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
  });
  it("matches one face of a double-faced Scryfall name", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([
      card({ name: "Fire // Ice" }),
    ]);
    const [result] = await resolver.resolveAll([
      { name: "Fire", set: "cmm", collectorNumber: "395", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
  });
});
