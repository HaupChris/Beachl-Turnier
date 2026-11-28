import type { MatchId } from '../model/types';

/**
 * Platzhalter für ein Team, das noch nicht feststeht (Q40; architecture.md „Fachlogik“).
 * Doku-Schreibweise: „2.G3“, „Sieger Spiel 5“, „Verlierer Q1“.
 */
export type SlotSource =
  /** Gruppenplatz `rank` in Gruppe `groupIndex` (0 = G1). */
  | { readonly kind: 'groupRank'; readonly groupIndex: number; readonly rank: number }
  | { readonly kind: 'winnerOf'; readonly matchId: MatchId }
  | { readonly kind: 'loserOf'; readonly matchId: MatchId };

/**
 * Art eines K.o.-Spiels für die Anzeige.
 * - `round`: Runde im Baum um Platz 1; `size` = Zahl der Plätze im Baumabschnitt (8 = Viertelfinale)
 * - `placementRound`: Runde in einem Platzierungsbaum
 * - `placementMatch`: Spiel um einen einzelnen Platz (Platz 1 = Finale)
 * - `playIn`: Vorschaltspiel 4. gegen 5. (Q27)
 */
export type MatchStage =
  | { readonly kind: 'round'; readonly size: number }
  | { readonly kind: 'placementRound' }
  | { readonly kind: 'placementMatch'; readonly place: number }
  | { readonly kind: 'playIn' };

export interface KnockoutMatch {
  /** Fortlaufend „K1“, „K2“, … in Spielreihenfolge. */
  readonly id: MatchId;
  readonly number: number;
  readonly sectionId: string;
  /** Spalte im Baum, 1-basiert. */
  readonly round: number;
  readonly slotA: SlotSource;
  readonly slotB: SlotSource;
  /** Plätze, um die die beiden Teams in diesem Spiel noch spielen. */
  readonly places: { readonly from: number; readonly to: number };
  readonly stage: MatchStage;
}

export interface BracketSection {
  readonly id: string;
  /** Anzeigename, z. B. „Hauptfeld“, „Platz 13–18“. */
  readonly title: string;
  readonly places: { readonly from: number; readonly to: number };
}

/**
 * Endplatzierung: Welcher Platzhalter erhält welchen Platz.
 * Mehrere Einträge mit demselben Platz = geteilter Platz (Q11, Q26).
 */
export interface PlacementEntry {
  readonly place: number;
  readonly source: SlotSource;
}

export interface KnockoutPlan {
  readonly sections: readonly BracketSection[];
  readonly matches: readonly KnockoutMatch[];
  readonly placements: readonly PlacementEntry[];
}

/** Tatsächliche Gruppengrößen nach der Gruppenphase, Index 0 = G1. */
export interface KnockoutInput {
  readonly groupSizes: readonly number[];
}
