import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { normalizeCollectorNumber } from "./collector-number";
import {
  CardRecognitionCandidate,
  ResolvedScanCard,
  ScanCardStatus,
  ScryfallCard,
  ValidatedPrinting,
} from "./card-scan.types";
import { ScryfallService } from "./scryfall.service";
const RELIABLE_LANGUAGE_CONFIDENCE = 0.8;
@Injectable()
export class CardPrintingResolver {
  constructor(private readonly scryfall: ScryfallService) {}
  async resolveAll(
    candidates: CardRecognitionCandidate[],
  ): Promise<ResolvedScanCard[]> {
    const exactCards = await this.scryfall.getPrintingDetails(candidates);
    const results: ResolvedScanCard[] = [];
    for (const candidate of candidates)
      results.push(await this.resolve(candidate, exactCards));
    return results;
  }
  private async resolve(
    candidate: CardRecognitionCandidate,
    exactCards: ScryfallCard[],
  ): Promise<ResolvedScanCard> {
    const base = {
      id: randomUUID(),
      quantity: candidate.quantity,
      detected: candidate,
    };
    if (!candidate.canonicalName && !candidate.printedName)
      return { ...base, status: ScanCardStatus.NOT_FOUND };
    if (!candidate.set)
      return { ...base, status: ScanCardStatus.AMBIGUOUS, candidates: [] };
    const exact = candidate.collectorNumber
      ? exactCards.find(
          (card) =>
            card.set.toLowerCase() === candidate.set!.toLowerCase() &&
            normalizeCollectorNumber(card.collector_number) ===
              normalizeCollectorNumber(candidate.collectorNumber!),
        )
      : undefined;
    if (exact && this.canonicalIdentityMatches(candidate, exact))
      return this.resolveExactLanguage(base, candidate, exact);
    if (!candidate.canonicalName)
      return { ...base, status: ScanCardStatus.AMBIGUOUS, candidates: [] };
    const matches = (
      await this.scryfall.findPrintings(candidate.canonicalName, candidate.set)
    ).filter((card) => this.namesMatch(candidate.canonicalName!, card.name));
    if (matches.length === 1)
      return this.resolveExactLanguage(base, candidate, matches[0]);
    if (matches.length > 1)
      return {
        ...base,
        status: ScanCardStatus.AMBIGUOUS,
        candidates: matches.map((card) => this.toPrinting(card)),
      };
    return { ...base, status: ScanCardStatus.NOT_FOUND };
  }
  private async resolveExactLanguage(
    base: { id: string; quantity: number; detected: CardRecognitionCandidate },
    candidate: CardRecognitionCandidate,
    identity: ScryfallCard,
  ): Promise<ResolvedScanCard> {
    if (
      candidate.language &&
      candidate.language !== "en" &&
      !this.requiresLocalizedLookup(candidate)
    )
      return { ...base, status: ScanCardStatus.AMBIGUOUS, candidates: [] };
    if (!this.requiresLocalizedLookup(candidate))
      return {
        ...base,
        status: ScanCardStatus.RESOLVED,
        resolved: this.toPrinting(identity),
      };
    const localized = await this.scryfall.getLocalizedPrinting(
      identity.set,
      identity.collector_number,
      candidate.language!,
    );
    if (
      localized &&
      this.samePrintingIdentity(identity, localized) &&
      this.detectedNamesMatch(candidate, localized)
    )
      return {
        ...base,
        status: ScanCardStatus.RESOLVED,
        resolved: this.toPrinting(localized),
      };
    return { ...base, status: ScanCardStatus.AMBIGUOUS, candidates: [] };
  }
  private requiresLocalizedLookup(
    candidate: CardRecognitionCandidate,
  ): boolean {
    return Boolean(
      candidate.language &&
      candidate.language !== "en" &&
      (candidate.languageConfidence ?? 0) >= RELIABLE_LANGUAGE_CONFIDENCE,
    );
  }
  private canonicalIdentityMatches(
    candidate: CardRecognitionCandidate,
    card: ScryfallCard,
  ): boolean {
    if (candidate.canonicalName)
      return this.namesMatch(candidate.canonicalName, card.name);
    if (candidate.printedName && this.requiresLocalizedLookup(candidate))
      return true;
    return Boolean(
      candidate.printedName &&
      candidate.language === "en" &&
      this.namesMatch(candidate.printedName, card.name),
    );
  }
  private detectedNamesMatch(
    candidate: CardRecognitionCandidate,
    card: ScryfallCard,
  ): boolean {
    const canonicalMatches =
      !candidate.canonicalName ||
      this.namesMatch(candidate.canonicalName, card.name);
    const printedMatches =
      !candidate.printedName ||
      Boolean(
        card.printed_name &&
        this.namesMatch(candidate.printedName, card.printed_name),
      );
    return (
      canonicalMatches && printedMatches && card.lang === candidate.language
    );
  }
  private samePrintingIdentity(
    reference: ScryfallCard,
    localized: ScryfallCard,
  ): boolean {
    return (
      reference.oracle_id === localized.oracle_id &&
      reference.set.toLowerCase() === localized.set.toLowerCase() &&
      reference.collector_number === localized.collector_number
    );
  }
  private namesMatch(candidateName: string, scryfallName: string): boolean {
    const candidate = this.normalize(candidateName);
    return [...scryfallName.split(" // "), scryfallName]
      .map((name) => this.normalize(name))
      .includes(candidate);
  }
  private normalize(name: string): string {
    return name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  private toPrinting(card: ScryfallCard): ValidatedPrinting {
    return {
      scryfallId: card.id,
      oracleId: card.oracle_id,
      name: card.name,
      printedName: card.printed_name,
      language: card.lang,
      set: card.set,
      collectorNumber: card.collector_number,
    };
  }
}
