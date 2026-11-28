import type { MatchId, SetScore, TeamId } from '../model/types';
import type { TournamentEvent } from './types';

export interface StoredResult {
  readonly teams: readonly [TeamId, TeamId];
  readonly sets: readonly SetScore[];
}

/** Zusammengefasster Stand aller Ereignisse; Ergebnisse noch ungeprüft. */
export interface EventState {
  readonly results: ReadonlyMap<MatchId, StoredResult>;
  readonly rockPaperScissors: readonly { groupIndex: number | null; order: readonly TeamId[] }[];
  /** Team → Phase des Rückzugs, bestimmt zum Zeitpunkt des Ereignisses (Q28). */
  readonly withdrawals: ReadonlyMap<TeamId, 'preliminary' | 'knockout'>;
  readonly refereeOverrides: ReadonlyMap<MatchId, TeamId | null>;
}

/**
 * Spielt die Ereignisse der Reihe nach ab. `isPreliminaryComplete` entscheidet bei einem Rückzug,
 * ob er in der Vorrunde (alle Spiele annulliert) oder im K.o. (Walkover) gilt (Q28).
 */
export function replayEvents(
  events: readonly TournamentEvent[],
  isPreliminaryComplete: (partial: EventState) => boolean,
): EventState {
  const results = new Map<MatchId, StoredResult>();
  const rockPaperScissors: { groupIndex: number | null; order: readonly TeamId[] }[] = [];
  const withdrawals = new Map<TeamId, 'preliminary' | 'knockout'>();
  const refereeOverrides = new Map<MatchId, TeamId | null>();
  const snapshot = (): EventState => ({
    results,
    rockPaperScissors,
    withdrawals,
    refereeOverrides,
  });

  for (const event of events) {
    switch (event.type) {
      case 'ResultEntered':
      case 'ResultCorrected':
        results.set(event.matchId, { teams: event.teams, sets: event.sets });
        break;
      case 'RockPaperScissorsDecided': {
        const key = [...event.order].sort().join('|');
        const existing = rockPaperScissors.findIndex(
          (d) => d.groupIndex === event.groupIndex && [...d.order].sort().join('|') === key,
        );
        if (existing >= 0) rockPaperScissors.splice(existing, 1);
        rockPaperScissors.push({ groupIndex: event.groupIndex, order: event.order });
        break;
      }
      case 'TeamWithdrawn':
        if (!withdrawals.has(event.teamId)) {
          withdrawals.set(
            event.teamId,
            isPreliminaryComplete(snapshot()) ? 'knockout' : 'preliminary',
          );
        }
        break;
      case 'WithdrawalReverted':
        withdrawals.delete(event.teamId);
        break;
      case 'RefereeChanged':
        refereeOverrides.set(event.matchId, event.teamId);
        break;
    }
  }
  return snapshot();
}
