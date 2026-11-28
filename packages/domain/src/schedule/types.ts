import type { MatchId, TeamId } from '../model/types';
import type { SlotSource } from '../knockout/types';

/** Zeit in Minuten seit Mitternacht, z. B. 9:30 Uhr = 570. */
export type Minutes = number;

/** Wer ein Spiel pfeift (Q20, Q25, Q49). */
export type ScheduledReferee =
  | { readonly kind: 'team'; readonly teamId: TeamId }
  /** Verlierer eines vorherigen Spiels, z. B. letztes Spiel der 5er-Gruppe (Q45). */
  | { readonly kind: 'loserOf'; readonly matchId: MatchId }
  /** K.o.: Team, das noch nicht feststeht, z. B. „Verlierer Spiel 5“ oder „1.A“. */
  | { readonly kind: 'placeholder'; readonly source: SlotSource }
  /** Kein freies Team gefunden: Die Turnierleitung teilt zu. */
  | { readonly kind: 'organizer' };

export interface ScheduledMatch {
  readonly matchId: MatchId;
  /** Feld, 1-basiert. */
  readonly court: number;
  readonly start: Minutes;
  readonly end: Minutes;
  /** `undefined`, wenn in diesem Bereich keine Schiedsrichter eingesetzt werden. */
  readonly referee: ScheduledReferee | undefined;
}

export interface PhaseScheduleOptions {
  readonly courts: number;
  readonly start: Minutes;
  /** Geschätzte Dauer eines Spiels inklusive Feldwechsel (Q50). */
  readonly matchDuration: number;
  /** Schiedsrichter in diesem Bereich an oder aus, Standard aus (Q49). */
  readonly referees: boolean;
}
