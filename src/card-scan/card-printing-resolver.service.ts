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
    if (
      candidate.language &&
      candidate.language !== "en" &&
      !this.requiresLocalizedLookup(candidate)
    )
      return { ...base, status: ScanCardStatus.AMBIGUOUS, candidates: [] };
    if (this.requiresLocalizedLookup(candidate))
      return this.resolveLocalized(base, candidate);
    if (!candidate.set)
      return this.resolveLocalized(base, {
        ...candidate,
        language: "en",
      });
    const exact = candidate.collectorNumber
      ? exactCards.find(
          (card) =>
            card.set.toLowerCase() === candidate.set!.toLowerCase() &&
            normalizeCollectorNumber(card.collector_number) ===
              normalizeCollectorNumber(candidate.collectorNumber!),
        )
      : undefined;
    if (exact && this.canonicalIdentityMatches(candidate, exact))
      return {
        ...base,
        status: ScanCardStatus.RESOLVED,
        resolved: this.toPrinting(exact),
      };
    if (!candidate.canonicalName)
      return this.resolveLocalized(base, {
        ...candidate,
        language: "en",
      });
    const matches = (
      await this.scryfall.findPrintings(candidate.canonicalName, candidate.set)
    ).filter((card) => this.namesMatch(candidate.canonicalName!, card.name));
    if (matches.length === 1)
      return {
        ...base,
        status: ScanCardStatus.RESOLVED,
        resolved: this.toPrinting(matches[0]),
      };
    if (matches.length > 1)
      return {
        ...base,
        status: ScanCardStatus.AMBIGUOUS,
        candidates: matches.map((card) => this.toPrinting(card)),
      };
    return this.resolveLocalized(base, {
      ...candidate,
      language: "en",
    });
  }
  private async resolveLocalized(
    base: { id: string; quantity: number; detected: CardRecognitionCandidate },
    candidate: CardRecognitionCandidate,
  ): Promise<ResolvedScanCard> {
    const lookupLanguage =
      candidate.printedName &&
      candidate.canonicalName &&
      this.namesMatch(candidate.printedName, candidate.canonicalName)
        ? "en"
        : candidate.language!;
    let printings = await this.scryfall.findLocalizedPrintings(
      candidate.printedName ?? candidate.canonicalName!,
      lookupLanguage,
    );
    if (!printings.length && candidate.printedName) {
      const printedNameCandidates =
        await this.scryfall.findPrintedNameCandidates(
          candidate.printedName,
          lookupLanguage,
        );
      printings = this.closestPrintedNameMatches(
        candidate.printedName,
        printedNameCandidates,
      );
    }
    if (!printings.length && candidate.printedName && candidate.canonicalName) {
      printings = await this.scryfall.findLocalizedPrintings(
        candidate.canonicalName,
        lookupLanguage,
      );
    }
    if (!printings.length) return { ...base, status: ScanCardStatus.NOT_FOUND };
    const nameMatches = printings.filter(
      (card) => card.lang === lookupLanguage,
    );
    const hintedMatches = nameMatches.filter(
      (card) =>
        (!candidate.set ||
          card.set.toLowerCase() === candidate.set.toLowerCase()) &&
        (!candidate.collectorNumber ||
          normalizeCollectorNumber(card.collector_number) ===
            normalizeCollectorNumber(candidate.collectorNumber)),
    );
    const matches = hintedMatches.length ? hintedMatches : nameMatches;
    if (matches.length === 1)
      return {
        ...base,
        status: ScanCardStatus.RESOLVED,
        resolved: this.toPrinting(matches[0]),
      };
    return {
      ...base,
      status: ScanCardStatus.AMBIGUOUS,
      candidates: matches.map((card) => this.toPrinting(card)),
    };
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
    return Boolean(
      candidate.printedName &&
      candidate.language === "en" &&
      this.namesMatch(candidate.printedName, card.name),
    );
  }
  private namesMatch(candidateName: string, scryfallName: string): boolean {
    const candidate = this.normalize(candidateName);
    return [...scryfallName.split(" // "), scryfallName]
      .map((name) => this.normalize(name))
      .includes(candidate);
  }
  private closestPrintedNameMatches(
    detectedName: string,
    cards: ScryfallCard[],
  ): ScryfallCard[] {
    const withDistances = cards
      .filter((card) => card.printed_name)
      .map((card) => ({
        card,
        distance: this.editDistance(
          this.normalize(detectedName),
          this.normalize(card.printed_name!),
        ),
      }));
    const minimumDistance = Math.min(
      ...withDistances.map(({ distance }) => distance),
    );
    return withDistances
      .filter(({ distance }) => distance === minimumDistance)
      .map(({ card }) => card);
  }
  private editDistance(left: string, right: string): number {
    let previous = Array.from(
      { length: right.length + 1 },
      (_, index) => index,
    );
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const current = [leftIndex];
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        current[rightIndex] = Math.min(
          current[rightIndex - 1] + 1,
          previous[rightIndex] + 1,
          previous[rightIndex - 1] +
            (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
        );
      }
      previous = current;
    }
    return previous[right.length];
  }
  private normalize(name: string): string {
    return name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/gi, "oe")
      .replace(/æ/gi, "ae")
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
