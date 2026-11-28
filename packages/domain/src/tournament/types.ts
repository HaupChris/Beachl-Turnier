import type { MatchId, SetFormat, SetScore, Team, TeamId } from '../model/types';
import type { Minutes } from '../schedule/types';

/** Modi der Version 1 (README.md „Modi“; Q41). */
export type TournamentFormat = 'round-robin' | 'groups-full-placement' | 'groups-split-bracket';

/** Bereich für Satzmodus, Spieldauer und Schiedsrichter (Q22–Q24, Q49, Q50). */
export interface AreaSettings {
  readonly setFormat: SetFormat;
  /** Geschätzte Spieldauer in Minuten; Standard aus dem Satzmodus (Q50). */
  readonly matchDuration: number;
  readonly referees: boolean;
}

export interface TournamentConfig {
  readonly name: string;
  readonly format: TournamentFormat;
  /** Teams mit Setzplatz 1…N. */
  readonly teams: readonly Team[];
  readonly courts: number;
  readonly startTime: Minutes;
  readonly preliminary: AreaSettings;
  readonly knockout: AreaSettings;
  /** Nur „Jeder gegen jeden“: Platzierungsspiele an (Q29). */
  readonly placementMatches: boolean;
}

/** Ereignisse während des Turniers (Q40; architecture.md „Fachlogik“). */
export type TournamentEvent =
  | {
      readonly type: 'ResultEntered' | 'ResultCorrected';
      readonly matchId: MatchId;
      /** Teams A und B bei der Eingabe; passt das nicht mehr, ist das Ergebnis veraltet. */
      readonly teams: readonly [TeamId, TeamId];
      readonly sets: readonly SetScore[];
    }
  | {
      readonly type: 'RockPaperScissorsDecided';
      /** Gruppenindex, oder `null` für die Tabelle bei „Jeder gegen jeden“. */
      readonly groupIndex: number | null;
      /** Reihenfolge der gleichstehenden Teams nach Schere-Stein-Papier. */
      readonly order: readonly TeamId[];
    }
  | { readonly type: 'TeamWithdrawn'; readonly teamId: TeamId }
  | { readonly type: 'WithdrawalReverted'; readonly teamId: TeamId }
  | {
      readonly type: 'RefereeChanged';
      readonly matchId: MatchId;
      /** `null` = kein Schiedsrichter. */
      readonly teamId: TeamId | null;
    };

export interface TournamentDocument {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly createdAt: string;
  readonly config: TournamentConfig;
  readonly events: readonly TournamentEvent[];
}
