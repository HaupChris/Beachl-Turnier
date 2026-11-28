import {
  areaSettings,
  createTournament,
  decideRockPaperScissors,
  deriveTournament,
  enterResult,
  type MatchView,
  type TeamId,
  type TournamentConfig,
  type TournamentDocument,
  type TournamentFormat,
} from '../../src';
import { makeTeams } from '../helpers';

export function newTournament(
  format: TournamentFormat,
  teamCount: number,
  overrides: Partial<TournamentConfig> = {},
): TournamentDocument {
  const config: TournamentConfig = {
    name: 'Testturnier',
    format,
    teams: makeTeams(teamCount),
    courts: 4,
    startTime: 9 * 60,
    preliminary: areaSettings({ kind: 'singleSet', pointsPerSet: 21 }),
    knockout: areaSettings({ kind: 'singleSet', pointsPerSet: 21 }),
    placementMatches: true,
    ...overrides,
  };
  const created = createTournament(config, { id: 't1', createdAt: '2026-11-28T10:00:00Z' });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

export const seedOf = (id: TeamId | undefined) => Number(id?.slice(1) ?? 99);
export const betterSeed = (m: MatchView) => (seedOf(m.teamA) < seedOf(m.teamB) ? 'a' : 'b');

/** Satz, den Team A bzw. B gewinnt (1 Satz bis 21). */
export const setFor = (winner: 'a' | 'b') =>
  winner === 'a' ? [{ a: 21, b: 15 }] : [{ a: 15, b: 21 }];

/**
 * Spielt das Turnier über die Befehle durch: Jedes bereite Spiel bekommt ein Ergebnis nach
 * `pick`; offene Schere-Stein-Papier-Entscheidungen fallen nach Setzplatz.
 */
export function playThrough(
  doc: TournamentDocument,
  pick: (m: MatchView) => 'a' | 'b' = betterSeed,
): TournamentDocument {
  let current = doc;
  for (let guard = 0; guard < 500; guard++) {
    const view = deriveTournament(current);
    const tie = [view.table, ...view.groups.map((g) => g.standings)]
      .map((s, i) => ({
        pending: s?.pendingRockPaperScissors[0],
        groupIndex: view.table ? null : i - 1,
      }))
      .find((x) => x.pending);
    if (tie?.pending) {
      const order = [...tie.pending].sort((a, b) => seedOf(a) - seedOf(b));
      const decided = decideRockPaperScissors(current, tie.groupIndex, order);
      if (!decided.ok) throw new Error(decided.error);
      current = decided.value;
      continue;
    }
    const ready = view.matches.find((m) => m.status === 'ready');
    if (!ready) return current;
    const entered = enterResult(current, ready.id, setFor(pick(ready)));
    if (!entered.ok) throw new Error(entered.error);
    current = entered.value;
  }
  throw new Error('Turnier endet nicht');
}
