import { CardPrintingResolver } from "./card-printing-resolver.service";
import { ScanCardStatus, ScryfallCard } from "./card-scan.types";
import { ScryfallService } from "./scryfall.service";
const card = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: "11111111-1111-4111-8111-111111111111",
  oracle_id: "22222222-2222-4222-8222-222222222222",
  name: "Sol Ring",
  lang: "en",
  set: "cmm",
  collector_number: "395",
  ...overrides,
});
describe("CardPrintingResolver", () => {
  const scryfall = {
    getPrintingDetails: jest.fn(),
    getLocalizedPrinting: jest.fn(),
    findPrintings: jest.fn(),
  };
  let resolver: CardPrintingResolver;
  beforeEach(() => {
    jest.resetAllMocks();
    resolver = new CardPrintingResolver(scryfall as unknown as ScryfallService);
    scryfall.getPrintingDetails.mockResolvedValue([]);
    scryfall.getLocalizedPrinting.mockResolvedValue(null);
    scryfall.findPrintings.mockResolvedValue([]);
  });
  it("resolves an exact English printing", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([card()]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        printedName: "Sol Ring",
        language: "en",
        languageConfidence: 1,
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: {
        name: "Sol Ring",
        language: "en",
        set: "cmm",
        collectorNumber: "395",
      },
    });
    expect(scryfall.getLocalizedPrinting).not.toHaveBeenCalled();
  });
  it("does not accept a collector number belonging to another card", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([
      card({ name: "Arcane Signet" }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
    expect(scryfall.findPrintings).toHaveBeenCalledWith("Sol Ring", "cmm");
  });
  it("falls back from a wrong collector number to one name-and-set printing", async () => {
    scryfall.findPrintings.mockResolvedValue([
      card({ collector_number: "396" }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sól   Ring",
        set: "cmm",
        collectorNumber: "999",
        quantity: 1,
      },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: { collectorNumber: "396" },
    });
  });
  it("returns multiple validated printings as ambiguous", async () => {
    scryfall.findPrintings.mockResolvedValue([
      card(),
      card({ id: "other", collector_number: "395a" }),
    ]);
    const [result] = await resolver.resolveAll([
      { canonicalName: "Sol Ring", set: "cmm", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.AMBIGUOUS);
    expect(result.candidates).toHaveLength(2);
  });
  it("returns not_found when no Scryfall printing matches", async () => {
    const [result] = await resolver.resolveAll([
      { canonicalName: "Imaginary Card", set: "cmm", quantity: 1 },
    ]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
  });
  it("returns not_found when no name is readable", async () => {
    const [result] = await resolver.resolveAll([{ set: "cmm", quantity: 1 }]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
  });
  it("keeps a named card ambiguous when the set is missing", async () => {
    const [result] = await resolver.resolveAll([
      { printedName: "Anneau solaire", language: "fr", quantity: 1 },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.AMBIGUOUS,
      candidates: [],
    });
  });
  it("keeps a localized-only name ambiguous without an exact identity", async () => {
    const [result] = await resolver.resolveAll([
      {
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        set: "cmm",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.AMBIGUOUS);
    expect(scryfall.findPrintings).not.toHaveBeenCalled();
  });
  it("resolves a French printing and stores both names", async () => {
    const english = card();
    const french = card({
      id: "fr-id",
      lang: "fr",
      printed_name: "Anneau solaire",
    });
    scryfall.getPrintingDetails.mockResolvedValue([english]);
    scryfall.getLocalizedPrinting.mockResolvedValue(french);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 0.95,
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(scryfall.getLocalizedPrinting).toHaveBeenCalledWith(
      "cmm",
      "395",
      "fr",
    );
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: {
        scryfallId: "fr-id",
        name: "Sol Ring",
        printedName: "Anneau solaire",
        language: "fr",
      },
    });
  });
  it("can establish the canonical identity from a localized printed name", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([card()]);
    scryfall.getLocalizedPrinting.mockResolvedValue(
      card({ id: "fr-id", lang: "fr", printed_name: "Anneau solaire" }),
    );
    const [result] = await resolver.resolveAll([
      {
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 0.9,
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
    expect(result.resolved?.name).toBe("Sol Ring");
  });
  it.each([
    null,
    card({ lang: "fr", printed_name: "Mauvais nom" }),
    card({
      lang: "fr",
      printed_name: "Anneau solaire",
      oracle_id: "different",
    }),
    card({ lang: "de", printed_name: "Anneau solaire" }),
  ])("keeps invalid localized validation ambiguous", async (localized) => {
    scryfall.getPrintingDetails.mockResolvedValue([card()]);
    scryfall.getLocalizedPrinting.mockResolvedValue(localized);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.AMBIGUOUS);
  });
  it("keeps a low-confidence non-English language ambiguous without calling Scryfall again", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([card()]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        language: "fr",
        languageConfidence: 0.5,
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.AMBIGUOUS);
    expect(scryfall.getLocalizedPrinting).not.toHaveBeenCalled();
  });
  it("validates a localized printing after a unique fallback", async () => {
    scryfall.findPrintings.mockResolvedValue([card()]);
    scryfall.getLocalizedPrinting.mockResolvedValue(
      card({ id: "fr-id", lang: "fr", printed_name: "Anneau solaire" }),
    );
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        set: "cmm",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
  });
  it("matches one face of a double-faced canonical name", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([
      card({ name: "Fire // Ice" }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Fire",
        language: "en",
        set: "cmm",
        collectorNumber: "395",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
  });
});

describe("CardPrintingResolver multilingual validation branches", () => {
  const resolver = new CardPrintingResolver({} as ScryfallService) as any;
  const english = card();
  it("accepts an English printed name when canonical name is absent", () => {
    expect(
      resolver.canonicalIdentityMatches(
        { printedName: "Sol Ring", language: "en", quantity: 1 },
        english,
      ),
    ).toBe(true);
    expect(
      resolver.canonicalIdentityMatches(
        { printedName: "Wrong", language: "en", quantity: 1 },
        english,
      ),
    ).toBe(false);
  });
  it.each([
    { quantity: 1 },
    { language: "en", quantity: 1 },
    { language: "fr", quantity: 1 },
    { language: "fr", languageConfidence: 0.79, quantity: 1 },
  ])("does not require localized lookup for %j", (candidate) => {
    expect(resolver.requiresLocalizedLookup(candidate)).toBe(false);
  });
  it("validates optional detected canonical and printed names", () => {
    expect(
      resolver.detectedNamesMatch(
        { language: "fr", quantity: 1 },
        card({ lang: "fr" }),
      ),
    ).toBe(true);
    expect(
      resolver.detectedNamesMatch(
        { canonicalName: "Wrong", language: "fr", quantity: 1 },
        card({ lang: "fr" }),
      ),
    ).toBe(false);
    expect(
      resolver.detectedNamesMatch(
        { printedName: "Anneau solaire", language: "fr", quantity: 1 },
        card({ lang: "fr" }),
      ),
    ).toBe(false);
  });
  it("rejects set and collector mismatches after Oracle identity matches", () => {
    expect(
      resolver.samePrintingIdentity(
        english,
        card({ lang: "fr", set: "other" }),
      ),
    ).toBe(false);
    expect(
      resolver.samePrintingIdentity(
        english,
        card({ lang: "fr", collector_number: "396" }),
      ),
    ).toBe(false);
    expect(resolver.samePrintingIdentity(english, card({ lang: "fr" }))).toBe(
      true,
    );
  });
});
