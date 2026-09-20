import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  CardRecognitionCandidate,
  ResolvedScanCard,
  ScanCardStatus,
  ScryfallCard,
  ValidatedPrinting,
} from "./card-scan.types";
import { ScryfallService } from "./scryfall.service";
@Injectable()
export class CardPrintingResolver {
  constructor(private readonly scryfall: ScryfallService) {}
  async resolveAll(
    candidates: CardRecognitionCandidate[],
  ): Promise<ResolvedScanCard[]> {
    const exactCards = await this.scryfall.getPrintingDetails(candidates);
    return Promise.all(
      candidates.map((candidate) => this.resolve(candidate, exactCards)),
    );
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
    if (!candidate.name) return { ...base, status: ScanCardStatus.NOT_FOUND };
    if (!candidate.set)
      return { ...base, status: ScanCardStatus.AMBIGUOUS, candidates: [] };
    const exact = candidate.collectorNumber
      ? exactCards.find(
          (card) =>
            card.set.toLowerCase() === candidate.set.toLowerCase() &&
            card.collector_number === candidate.collectorNumber,
        )
      : undefined;
    if (exact && this.namesMatch(candidate.name, exact.name))
      return {
        ...base,
        status: ScanCardStatus.RESOLVED,
        resolved: this.toPrinting(exact),
      };
    const matches = (
      await this.scryfall.findPrintings(candidate.name, candidate.set)
    ).filter((card) => this.namesMatch(candidate.name, card.name));
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
    return { ...base, status: ScanCardStatus.NOT_FOUND };
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
      set: card.set,
      collectorNumber: card.collector_number,
    };
  }
}
