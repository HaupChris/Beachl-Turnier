import type { Group } from '../groups/planGroupPhase';
import type { KnockoutPlan, MatchStage, SlotSource } from '../knockout/types';
import type { MatchId, SetScore, TeamId } from '../model/types';
import type { ResultSummary } from '../results/evaluateResult';
import type { ScheduledReferee } from '../schedule/types';
import type { GroupStandings } from '../standings/groupStandings';
import type { TournamentConfig } from './types';

export type MatchPhase = 'group' | 'roundRobin' | 'knockout' | 'placement';

/**
 * - `waiting`: Teams stehen noch nicht fest
 * - `ready`: beide Teams stehen fest, Ergebnis fehlt
 * - `completed`: Ergebnis eingetragen
 * - `walkover`: kampflos entschieden (Rückzug im K.o., Q28)
 * - `cancelled`: annulliert, weil ein Team in der Vorrunde zurückgezogen hat (Q28)
 */
export type MatchStatus = 'waiting' | 'ready' | 'completed' | 'walkover' | 'cancelled';

export interface MatchView {
  readonly id: MatchId;
  readonly phase: MatchPhase;
  readonly groupIndex?: number;
  /** K.o. und Platzierungsspiele: Platzhalter für die Anzeige. */
  readonly slotA?: SlotSource;
  readonly slotB?: SlotSource;
  readonly stage?: MatchStage;
  /** Platzierungsspiele nach „Jeder gegen jeden“: Rang, um den gespielt wird. */
  readonly placementRank?: number;
  readonly teamA: TeamId | undefined;
  readonly teamB: TeamId | undefined;
  readonly sets: readonly SetScore[] | undefined;
  readonly summary: ResultSummary | undefined;
  readonly winner: TeamId | undefined;
  readonly status: MatchStatus;
  readonly court: number;
  readonly start: number;
  readonly end: number;
  readonly referee: ScheduledReferee | undefined;
}

export interface GroupView {
  readonly group: Group;
  readonly standings: GroupStandings;
}

export interface WithdrawalView {
  readonly teamId: TeamId;
  /** In welcher Phase zurückgezogen wurde (Q28). */
  readonly phase: 'preliminary' | 'knockout';
}

export interface TournamentView {
  readonly config: TournamentConfig;
  readonly matches: readonly MatchView[];
  /** Gruppenmodi. */
  readonly groups: readonly GroupView[];
  readonly knockoutPlan: KnockoutPlan | undefined;
  /** „Jeder gegen jeden“: Tabelle. */
  readonly table: GroupStandings | undefined;
  readonly withdrawals: readonly WithdrawalView[];
  /** Feststehende Plätze; vollständig, sobald das Turnier beendet ist. */
  readonly placements: readonly { readonly place: number; readonly teamId: TeamId }[];
  readonly isFinished: boolean;
  /** Hinweise für die Turnierleitung, z. B. ignorierte oder veraltete Ergebnisse. */
  readonly warnings: readonly string[];
}
