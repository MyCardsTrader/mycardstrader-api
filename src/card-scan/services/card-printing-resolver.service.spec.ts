import { CardPrintingResolver } from "./card-printing-resolver.service";
import { ScanCardStatus, ScryfallCard } from "../card-scan.types";
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
    findLocalizedPrintings: jest.fn(),
    findPrintedNameCandidates: jest.fn(),
    findPrintings: jest.fn(),
  };
  let resolver: CardPrintingResolver;
  beforeEach(() => {
    jest.resetAllMocks();
    resolver = new CardPrintingResolver(scryfall as unknown as ScryfallService);
    scryfall.getPrintingDetails.mockResolvedValue([]);
    scryfall.findLocalizedPrintings.mockResolvedValue([]);
    scryfall.findPrintedNameCandidates.mockResolvedValue([]);
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
    expect(scryfall.findLocalizedPrintings).not.toHaveBeenCalled();
  });
  it("resolves a zero-padded collector number without falling back to ambiguous printings", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([
      card({
        name: "Pearl-Ear, Imperial Advisor",
        set: "mh3",
        collector_number: "39",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Pearl-Ear, Imperial Advisor",
        printedName: "Pearl-Ear, Imperial Advisor",
        language: "en",
        set: "mh3",
        collectorNumber: "0039",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
    expect(result.detected.collectorNumber).toBe("0039");
    expect(result.resolved?.collectorNumber).toBe("39");
    expect(scryfall.findPrintings).not.toHaveBeenCalled();
  });
  it("still validates the localized language for zero-padded numbers", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ id: "fr-id", lang: "fr", printed_name: "Anneau solaire" }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        set: "cmm",
        collectorNumber: "0395",
        quantity: 1,
      },
    ]);
    expect(scryfall.findLocalizedPrintings).toHaveBeenCalledWith(
      "Anneau solaire",
      "fr",
    );
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
  });
  it("does not treat different alphanumeric collector numbers as equal", async () => {
    scryfall.getPrintingDetails.mockResolvedValue([
      card({ collector_number: "39a" }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        set: "cmm",
        collectorNumber: "039a",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
    expect(scryfall.findPrintings).toHaveBeenCalled();
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
  it("returns not_found when an English named card has no fuzzy match", async () => {
    const [result] = await resolver.resolveAll([
      { canonicalName: "Sol Ring", language: "en", quantity: 1 },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.NOT_FOUND,
    });
  });
  it("resolves an English printed-only card through fuzzy fallback", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ id: "sol-ring-en" }),
    ]);
    const [result] = await resolver.resolveAll([
      { printedName: "Sol Ring", language: "en", set: "cmm", quantity: 1 },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: { scryfallId: "sol-ring-en" },
    });
  });
  it("finds English cards by name when the detected set is wrong", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({
        id: "fissure",
        name: "Fissure",
        set: "drk",
        collector_number: "70",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Fissure",
        canonicalName: "Fissure",
        language: "en",
        set: "10e",
        quantity: 1,
      },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: { scryfallId: "fissure", set: "drk" },
    });
    expect(scryfall.findLocalizedPrintings).toHaveBeenCalledWith(
      "Fissure",
      "en",
    );
  });
  it("returns not_found when a localized-only name has no fuzzy match", async () => {
    const [result] = await resolver.resolveAll([
      {
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        set: "cmm",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
    expect(scryfall.findLocalizedPrintings).toHaveBeenCalledWith(
      "Anneau solaire",
      "fr",
    );
  });
  it("resolves a French printing and stores both names", async () => {
    const french = card({
      id: "fr-id",
      lang: "fr",
      printed_name: "Anneau solaire",
    });
    scryfall.findLocalizedPrintings.mockResolvedValue([french]);
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
    expect(scryfall.findLocalizedPrintings).toHaveBeenCalledWith(
      "Anneau solaire",
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
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ id: "fr-id", lang: "fr", printed_name: "Anneau solaire" }),
    ]);
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
  it("returns not_found when fuzzy localized validation finds nothing", async () => {
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
    expect(result.status).toBe(ScanCardStatus.NOT_FOUND);
  });
  it("keeps localized printings in another language ambiguous", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ lang: "de", printed_name: "Anneau solaire" }),
    ]);
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
  it("returns localized versions for user review when printing hints are absent", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ id: "fr-1", lang: "fr", printed_name: "Anneau solaire" }),
      card({
        id: "fr-2",
        lang: "fr",
        set: "clb",
        collector_number: "865",
        printed_name: "Anneau solaire",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.AMBIGUOUS);
    expect(result.candidates?.map((candidate) => candidate.scryfallId)).toEqual(
      ["fr-1", "fr-2"],
    );
  });
  it("resolves one recognized version when OCR printing hints do not match", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({
        id: "heartstone-fr",
        lang: "fr",
        set: "sth",
        collector_number: "134",
        printed_name: "Pierrecoeur",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Pierrecœur",
        canonicalName: "Heartstone",
        language: "fr",
        languageConfidence: 1,
        set: "1ed",
        collectorNumber: "148",
        quantity: 1,
      },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: { scryfallId: "heartstone-fr" },
    });
  });
  it("uses English candidates when the printed and canonical names are identical", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({
        id: "portcullis-en",
        oracle_id: "6230c179-0263-4fa4-b0ff-f2cb621de147",
        name: "Portcullis",
        lang: "en",
        set: "sth",
        collector_number: "139",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Portcullis",
        canonicalName: "Portcullis",
        language: "fr",
        languageConfidence: 1,
        set: "1ed",
        collectorNumber: "152",
        quantity: 1,
      },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: {
        scryfallId: "portcullis-en",
        language: "en",
      },
    });
    expect(scryfall.findLocalizedPrintings).toHaveBeenCalledWith(
      "Portcullis",
      "en",
    );
  });
  it("falls back to the canonical name when the printed name finds nothing", async () => {
    scryfall.findLocalizedPrintings
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        card({
          id: "fr-id",
          name: "Phyrexian Grimoire",
          lang: "fr",
          printed_name: "Grimoire phyrexian",
          set: "tmp",
          collector_number: "301",
        }),
      ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Nom OCR incorrect",
        canonicalName: "Phyrexian Grimoire",
        language: "fr",
        languageConfidence: 1,
        quantity: 1,
      },
    ]);
    expect(scryfall.findLocalizedPrintings).toHaveBeenNthCalledWith(
      2,
      "Phyrexian Grimoire",
      "fr",
    );
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
  });
  it("corrects a one-letter localized OCR error with the closest printed name", async () => {
    scryfall.findPrintedNameCandidates.mockResolvedValue([
      card({
        id: "altar-reap-fr",
        name: "Altar's Reap",
        printed_name: "Fenaison de l'autel",
        lang: "fr",
        set: "c15",
        collector_number: "112",
      }),
      card({
        id: "reap-fr",
        name: "Reap",
        printed_name: "Fenaison",
        lang: "fr",
        set: "tmp",
        collector_number: "247",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Renaison",
        canonicalName: "Reanimation",
        language: "fr",
        languageConfidence: 1,
        set: "10e",
        quantity: 1,
      },
    ]);
    expect(scryfall.findPrintedNameCandidates).toHaveBeenCalledWith(
      "Renaison",
      "fr",
    );
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: {
        scryfallId: "reap-fr",
        name: "Reap",
        printedName: "Fenaison",
      },
    });
  });
  it("filters localized versions with the available set hint", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ id: "fr-1", lang: "fr", printed_name: "Anneau solaire" }),
      card({
        id: "fr-2",
        lang: "fr",
        set: "clb",
        printed_name: "Anneau solaire",
      }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        printedName: "Anneau solaire",
        language: "fr",
        languageConfidence: 1,
        set: "CLB",
        quantity: 1,
      },
    ]);
    expect(result).toMatchObject({
      status: ScanCardStatus.RESOLVED,
      resolved: { scryfallId: "fr-2" },
    });
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
    expect(scryfall.findLocalizedPrintings).not.toHaveBeenCalled();
  });
  it("uses the canonical name when no localized printed name is available", async () => {
    scryfall.findLocalizedPrintings.mockResolvedValue([
      card({ id: "fr-id", lang: "fr", printed_name: "Anneau solaire" }),
    ]);
    const [result] = await resolver.resolveAll([
      {
        canonicalName: "Sol Ring",
        language: "fr",
        languageConfidence: 1,
        set: "cmm",
        quantity: 1,
      },
    ]);
    expect(result.status).toBe(ScanCardStatus.RESOLVED);
    expect(scryfall.findLocalizedPrintings).toHaveBeenCalledWith(
      "Sol Ring",
      "fr",
    );
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
  it("normalizes French ligatures when matching printed names", () => {
    const internalResolver = resolver as any;
    expect(internalResolver.namesMatch("Pierrecœur", "Pierrecoeur")).toBe(true);
    expect(internalResolver.namesMatch("Æther", "Aether")).toBe(true);
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
});
