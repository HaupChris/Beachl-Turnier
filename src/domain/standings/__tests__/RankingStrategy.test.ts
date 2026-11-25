/**
 * Tests for Ranking Strategies
 *
 * These tests verify that:
 * 1. Base statistics are calculated correctly
 * 2. Standard ranking uses wins → set diff → point diff
 * 3. Head-to-head ranking prioritizes direct match results
 * 4. Swiss ranking uses Buchholz and Fine-Buchholz correctly
 * 5. Ties are handled properly with same rank numbers
 *
 * @see docs/tournament-modes-specification.md Section 2.1
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBaseStats,
  getOpponents,
  havePlayedEachOther,
  getHeadToHeadResult,
  assignRanks,
  type MatchForStandings,
  type TeamForStandings,
  type StandingEntry,
  DEFAULT_RANKING_CONFIG,
} from '../RankingStrategy';
import { StandardRankingStrategy, HeadToHeadRankingStrategy } from '../StandardRankingStrategy';
import { SwissRankingStrategy, calculateBuchholz, calculateFineBuchholz } from '../SwissRankingStrategy';

// =============================================================================
// TEST DATA HELPERS
// =============================================================================

/**
 * Create a completed match with given scores
 */
function createMatch(
  teamAId: string,
  teamBId: string,
  scores: Array<[number, number]>,
  winnerId: string
): MatchForStandings {
  return {
    teamAId,
    teamBId,
    scores: scores.map(([teamA, teamB]) => ({ teamA, teamB })),
    winnerId,
    status: 'completed',
  };
}

/**
 * Create a simple 2-1 victory for teamA
 */
function createWinFor(teamAId: string, teamBId: string): MatchForStandings {
  return createMatch(teamAId, teamBId, [[21, 15], [18, 21], [15, 10]], teamAId);
}

/**
 * Create teams with given IDs
 */
function createTeams(...ids: string[]): TeamForStandings[] {
  return ids.map((id) => ({ id, name: `Team ${id}` }));
}

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('calculateBaseStats', () => {
    it('returns zero stats for team with no matches', () => {
      const stats = calculateBaseStats('team1', [], DEFAULT_RANKING_CONFIG);

      expect(stats.played).toBe(0);
      expect(stats.won).toBe(0);
      expect(stats.lost).toBe(0);
      expect(stats.setsWon).toBe(0);
      expect(stats.setsLost).toBe(0);
      expect(stats.pointsWon).toBe(0);
      expect(stats.pointsLost).toBe(0);
      expect(stats.points).toBe(0);
    });

    it('counts wins correctly for winning team', () => {
      const matches = [createWinFor('team1', 'team2')];
      const stats = calculateBaseStats('team1', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.played).toBe(1);
      expect(stats.won).toBe(1);
      expect(stats.lost).toBe(0);
      expect(stats.points).toBe(1);
    });

    it('counts losses correctly for losing team', () => {
      const matches = [createWinFor('team1', 'team2')];
      const stats = calculateBaseStats('team2', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.played).toBe(1);
      expect(stats.won).toBe(0);
      expect(stats.lost).toBe(1);
      expect(stats.points).toBe(0);
    });

    it('calculates sets won/lost correctly for winner', () => {
      // Match: team1 wins 2-1 (21-15, 18-21, 15-10)
      const matches = [createWinFor('team1', 'team2')];
      const stats = calculateBaseStats('team1', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.setsWon).toBe(2);
      expect(stats.setsLost).toBe(1);
      expect(stats.setDifference).toBe(1);
    });

    it('calculates sets won/lost correctly for loser', () => {
      const matches = [createWinFor('team1', 'team2')];
      const stats = calculateBaseStats('team2', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.setsWon).toBe(1);
      expect(stats.setsLost).toBe(2);
      expect(stats.setDifference).toBe(-1);
    });

    it('calculates points won/lost correctly', () => {
      // Match: 21-15, 18-21, 15-10 → team1: 54 points, team2: 46 points
      const matches = [createWinFor('team1', 'team2')];
      const stats = calculateBaseStats('team1', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.pointsWon).toBe(21 + 18 + 15);
      expect(stats.pointsLost).toBe(15 + 21 + 10);
      expect(stats.pointDifference).toBe(54 - 46);
    });

    it('ignores matches not involving the team', () => {
      const matches = [createWinFor('team1', 'team2')];
      const stats = calculateBaseStats('team3', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.played).toBe(0);
    });

    it('ignores non-completed matches', () => {
      const matches: MatchForStandings[] = [
        { teamAId: 'team1', teamBId: 'team2', scores: [], winnerId: null, status: 'scheduled' },
      ];
      const stats = calculateBaseStats('team1', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.played).toBe(0);
    });

    it('accumulates stats over multiple matches', () => {
      const matches = [
        createWinFor('team1', 'team2'),
        createWinFor('team1', 'team3'),
        createWinFor('team4', 'team1'), // team1 loses
      ];
      const stats = calculateBaseStats('team1', matches, DEFAULT_RANKING_CONFIG);

      expect(stats.played).toBe(3);
      expect(stats.won).toBe(2);
      expect(stats.lost).toBe(1);
      expect(stats.points).toBe(2);
    });
  });

  describe('getOpponents', () => {
    it('returns empty array for team with no matches', () => {
      expect(getOpponents('team1', [])).toEqual([]);
    });

    it('returns opponent when team is teamA', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(getOpponents('team1', matches)).toEqual(['team2']);
    });

    it('returns opponent when team is teamB', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(getOpponents('team2', matches)).toEqual(['team1']);
    });

    it('returns multiple opponents from multiple matches', () => {
      const matches = [
        createWinFor('team1', 'team2'),
        createWinFor('team1', 'team3'),
        createWinFor('team4', 'team1'),
      ];
      expect(getOpponents('team1', matches)).toEqual(['team2', 'team3', 'team4']);
    });

    it('ignores non-completed matches', () => {
      const matches: MatchForStandings[] = [
        createWinFor('team1', 'team2'),
        { teamAId: 'team1', teamBId: 'team3', scores: [], winnerId: null, status: 'scheduled' },
      ];
      expect(getOpponents('team1', matches)).toEqual(['team2']);
    });
  });

  describe('havePlayedEachOther', () => {
    it('returns true when teams have played (teamA vs teamB order)', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(havePlayedEachOther('team1', 'team2', matches)).toBe(true);
    });

    it('returns true when teams have played (reversed order)', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(havePlayedEachOther('team2', 'team1', matches)).toBe(true);
    });

    it('returns false when teams have not played', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(havePlayedEachOther('team1', 'team3', matches)).toBe(false);
    });
  });

  describe('getHeadToHeadResult', () => {
    it('returns 1 when first team won', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(getHeadToHeadResult('team1', 'team2', matches)).toBe(1);
    });

    it('returns -1 when second team won', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(getHeadToHeadResult('team2', 'team1', matches)).toBe(-1);
    });

    it('returns 0 when teams have not played', () => {
      const matches = [createWinFor('team1', 'team2')];
      expect(getHeadToHeadResult('team1', 'team3', matches)).toBe(0);
    });
  });

  describe('assignRanks', () => {
    it('assigns rank 1 to the best team', () => {
      const standings = [
        { teamId: 'team1', played: 2, won: 2, lost: 0, setsWon: 4, setsLost: 0, setDifference: 4, pointsWon: 84, pointsLost: 60, pointDifference: 24, points: 2 },
        { teamId: 'team2', played: 2, won: 0, lost: 2, setsWon: 0, setsLost: 4, setDifference: -4, pointsWon: 60, pointsLost: 84, pointDifference: -24, points: 0 },
      ];

      const ranked = assignRanks(standings, (a, b) => a.points - b.points);

      expect(ranked.find((e) => e.teamId === 'team1')?.rank).toBe(1);
      expect(ranked.find((e) => e.teamId === 'team2')?.rank).toBe(2);
    });

    it('assigns same rank to tied teams', () => {
      const standings = [
        { teamId: 'team1', played: 1, won: 1, lost: 0, setsWon: 2, setsLost: 0, setDifference: 2, pointsWon: 42, pointsLost: 30, pointDifference: 12, points: 1 },
        { teamId: 'team2', played: 1, won: 1, lost: 0, setsWon: 2, setsLost: 0, setDifference: 2, pointsWon: 42, pointsLost: 30, pointDifference: 12, points: 1 },
        { teamId: 'team3', played: 2, won: 0, lost: 2, setsWon: 0, setsLost: 4, setDifference: -4, pointsWon: 60, pointsLost: 84, pointDifference: -24, points: 0 },
      ];

      const ranked = assignRanks(standings, (a, b) => a.points - b.points);

      expect(ranked.find((e) => e.teamId === 'team1')?.rank).toBe(1);
      expect(ranked.find((e) => e.teamId === 'team2')?.rank).toBe(1);
      expect(ranked.find((e) => e.teamId === 'team3')?.rank).toBe(3);
    });
  });
});

// =============================================================================
// STANDARD RANKING STRATEGY TESTS
// =============================================================================

describe('StandardRankingStrategy', () => {
  const strategy = new StandardRankingStrategy();

  describe('getCriteria', () => {
    it('returns criteria in priority order: points → setDifference → pointDifference', () => {
      const criteria = strategy.getCriteria();

      expect(criteria.map((c) => c.name)).toEqual(['points', 'setDifference', 'pointDifference']);
    });

    it('all criteria have higherIsBetter = true', () => {
      const criteria = strategy.getCriteria();

      expect(criteria.every((c) => c.higherIsBetter)).toBe(true);
    });
  });

  describe('calculateStandings', () => {
    it('ranks team with more wins higher', () => {
      const teams = createTeams('A', 'B', 'C');
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('A', 'C'),
        createWinFor('B', 'C'),
      ];

      const standings = strategy.calculateStandings(matches, teams);

      expect(standings.find((e) => e.teamId === 'A')?.rank).toBe(1);
      expect(standings.find((e) => e.teamId === 'B')?.rank).toBe(2);
      expect(standings.find((e) => e.teamId === 'C')?.rank).toBe(3);
    });

    it('uses set difference as tiebreaker when wins are equal', () => {
      const teams = createTeams('A', 'B', 'C');
      // A beats B 2-0, B beats C 2-0, C beats A 2-1
      // All have 1 win, but different set differences
      const matches = [
        createMatch('A', 'B', [[21, 15], [21, 15]], 'A'),         // A: +2 sets
        createMatch('B', 'C', [[21, 15], [21, 15]], 'B'),         // B: +2 sets from this
        createMatch('C', 'A', [[21, 18], [18, 21], [15, 10]], 'C'), // C: +1 set, A: -1 set
      ];
      // A: 1 win, +2-1=+1 set diff
      // B: 1 win, +2-2=0 set diff
      // C: 1 win, +2-2=0 set diff

      const standings = strategy.calculateStandings(matches, teams);
      const rankA = standings.find((e) => e.teamId === 'A')?.rank;

      expect(rankA).toBe(1); // A has best set difference
    });

    it('uses point difference when wins and set difference are equal', () => {
      const teams = createTeams('A', 'B');
      // Both have 1 win, same set difference, different point difference
      const matches = [
        createMatch('A', 'B', [[21, 10]], 'A'),   // A: +11 points
        createMatch('B', 'A', [[21, 19]], 'B'),   // B: +2 points, A: -2 points
      ];

      const standings = strategy.calculateStandings(matches, teams);

      // A has +11-2=+9 point diff, B has +2-11=-9 point diff
      expect(standings.find((e) => e.teamId === 'A')?.rank).toBe(1);
    });
  });

  describe('compare', () => {
    it('returns positive when first team has more points', () => {
      const a = { points: 3 } as StandingEntry;
      const b = { points: 1 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeGreaterThan(0);
    });

    it('returns negative when first team has fewer points', () => {
      const a = { points: 1 } as StandingEntry;
      const b = { points: 3 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeLessThan(0);
    });

    it('returns 0 when all criteria are equal', () => {
      const a = { points: 2, setDifference: 1, pointDifference: 5 } as StandingEntry;
      const b = { points: 2, setDifference: 1, pointDifference: 5 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBe(0);
    });
  });
});

// =============================================================================
// HEAD-TO-HEAD RANKING STRATEGY TESTS
// =============================================================================

describe('HeadToHeadRankingStrategy', () => {
  const strategy = new HeadToHeadRankingStrategy();

  describe('getCriteria', () => {
    it('includes headToHead as first criterion', () => {
      const criteria = strategy.getCriteria();

      expect(criteria[0].name).toBe('headToHead');
    });

    it('includes standard criteria after headToHead', () => {
      const criteria = strategy.getCriteria();

      expect(criteria.slice(1).map((c) => c.name)).toEqual(['points', 'setDifference', 'pointDifference']);
    });
  });

  describe('compare', () => {
    it('prioritizes head-to-head winner when teams have played', () => {
      const matches = [createWinFor('A', 'B')];
      const a = { teamId: 'A', points: 1, setDifference: -5, pointDifference: -20 } as StandingEntry;
      const b = { teamId: 'B', points: 3, setDifference: 5, pointDifference: 20 } as StandingEntry;

      // A beat B directly, so A should rank higher despite worse stats
      expect(strategy.compare(a, b, matches)).toBeGreaterThan(0);
    });

    it('falls back to standard criteria when teams have not played', () => {
      const matches: MatchForStandings[] = [];
      const a = { teamId: 'A', points: 3, setDifference: 5, pointDifference: 20 } as StandingEntry;
      const b = { teamId: 'B', points: 1, setDifference: -5, pointDifference: -20 } as StandingEntry;

      expect(strategy.compare(a, b, matches)).toBeGreaterThan(0);
    });
  });

  describe('calculateStandings', () => {
    it('ranks head-to-head winner higher when points are equal', () => {
      const teams = createTeams('A', 'B', 'C');
      // A beats B, B beats C, C beats A → circular, but head-to-head matters
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('B', 'C'),
        createWinFor('C', 'A'),
      ];

      const standings = strategy.calculateStandings(matches, teams);

      // All have 1 win, but when comparing:
      // A vs B: A wins head-to-head → A ranks higher than B
      // B vs C: B wins head-to-head → B ranks higher than C
      // C vs A: C wins head-to-head → C ranks higher than A
      // This creates a cycle, so final ranking depends on tie resolution
      expect(standings.every((e) => e.rank >= 1 && e.rank <= 3)).toBe(true);
    });
  });
});

// =============================================================================
// SWISS RANKING STRATEGY TESTS
// =============================================================================

describe('SwissRankingStrategy', () => {
  const strategy = new SwissRankingStrategy();

  describe('getCriteria', () => {
    it('returns criteria in priority order: points → buchholz → fineBuchholz → setQuotient → pointQuotient', () => {
      const criteria = strategy.getCriteria();

      expect(criteria.map((c) => c.name)).toEqual([
        'points',
        'buchholz',
        'fineBuchholz',
        'setQuotient',
        'pointQuotient',
      ]);
    });
  });

  describe('calculateStandings', () => {
    it('calculates Buchholz as sum of opponents match points', () => {
      const teams = createTeams('A', 'B', 'C', 'D');
      // Round 1: A beats B (A:1, B:0), C beats D (C:1, D:0)
      // Round 2: A beats C (A:2, C:1), B beats D (B:1, D:0)
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('C', 'D'),
        createWinFor('A', 'C'),
        createWinFor('B', 'D'),
      ];

      const standings = strategy.calculateStandings(matches, teams);

      // A played B (1 point) and C (1 point) → Buchholz = 2
      const standingA = standings.find((e) => e.teamId === 'A')!;
      expect(standingA.buchholz).toBe(2);

      // D played C (1 point) and B (1 point) → Buchholz = 2
      const standingD = standings.find((e) => e.teamId === 'D')!;
      expect(standingD.buchholz).toBe(2);
    });

    it('uses Buchholz as tiebreaker when points are equal', () => {
      const teams = createTeams('A', 'B', 'C', 'D', 'E', 'F');
      // Setup: A and B both have exactly 1 win, but their opponents have different points
      // C, D are weak (0 points each), E, F are strong (1 point each)
      const matches = [
        // A beats weak opponent C
        createWinFor('A', 'C'),
        // B beats strong opponent E
        createWinFor('B', 'E'),
        // E gets 1 win (so E has 1 point when B played them)
        createWinFor('E', 'D'),
        // F gets 1 win (so F has 1 point)
        createWinFor('F', 'C'),
      ];
      // Final points: A=1, B=1, C=0, D=0, E=1, F=1
      // A's Buchholz: opponent C has 0 points → 0
      // B's Buchholz: opponent E has 1 point → 1
      // B should rank higher due to higher Buchholz

      const standings = strategy.calculateStandings(matches, teams);

      const standingA = standings.find((e) => e.teamId === 'A')!;
      const standingB = standings.find((e) => e.teamId === 'B')!;

      // Verify Buchholz calculation
      expect(standingA.buchholz).toBe(0);
      expect(standingB.buchholz).toBe(1);

      // B should rank higher than A
      expect(standingB.rank).toBeLessThan(standingA.rank);
    });

    it('calculates Fine-Buchholz as sum of opponents Buchholz', () => {
      const teams = createTeams('A', 'B', 'C', 'D');
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('C', 'D'),
        createWinFor('A', 'C'),
        createWinFor('B', 'D'),
      ];

      const standings = strategy.calculateStandings(matches, teams);

      // A played B and C
      // B's Buchholz: played A (2 pts) and D (0 pts) = 2
      // C's Buchholz: played A (2 pts) and D (0 pts) = 2
      // A's Fine-Buchholz = 2 + 2 = 4
      const standingA = standings.find((e) => e.teamId === 'A')!;
      expect(standingA.fineBuchholz).toBe(4);
    });

    it('calculates setQuotient as setsWon / setsLost', () => {
      const teams = createTeams('A', 'B');
      // A wins 2-1
      const matches = [createWinFor('A', 'B')];

      const standings = strategy.calculateStandings(matches, teams);

      const standingA = standings.find((e) => e.teamId === 'A')!;
      expect(standingA.setQuotient).toBe(2 / 1);

      const standingB = standings.find((e) => e.teamId === 'B')!;
      expect(standingB.setQuotient).toBe(1 / 2);
    });

    it('handles setQuotient when setsLost is 0', () => {
      const teams = createTeams('A', 'B');
      // A wins 2-0
      const matches = [createMatch('A', 'B', [[21, 15], [21, 15]], 'A')];

      const standings = strategy.calculateStandings(matches, teams);

      const standingA = standings.find((e) => e.teamId === 'A')!;
      expect(standingA.setQuotient).toBe(Infinity);
    });

    it('ranks team with 2 wins higher than team with 1 win', () => {
      const teams = createTeams('A', 'B', 'C');
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('A', 'C'),
        createWinFor('B', 'C'),
      ];

      const standings = strategy.calculateStandings(matches, teams);

      expect(standings.find((e) => e.teamId === 'A')?.rank).toBe(1);
    });
  });

  describe('compare', () => {
    it('compares by points first', () => {
      const a = { points: 3, buchholz: 0, fineBuchholz: 0, setQuotient: 1, pointQuotient: 1 } as StandingEntry;
      const b = { points: 2, buchholz: 10, fineBuchholz: 20, setQuotient: 5, pointQuotient: 5 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeGreaterThan(0);
    });

    it('compares by Buchholz when points are equal', () => {
      const a = { points: 2, buchholz: 5, fineBuchholz: 0, setQuotient: 1, pointQuotient: 1 } as StandingEntry;
      const b = { points: 2, buchholz: 3, fineBuchholz: 10, setQuotient: 5, pointQuotient: 5 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeGreaterThan(0);
    });

    it('compares by Fine-Buchholz when points and Buchholz are equal', () => {
      const a = { points: 2, buchholz: 5, fineBuchholz: 8, setQuotient: 1, pointQuotient: 1 } as StandingEntry;
      const b = { points: 2, buchholz: 5, fineBuchholz: 6, setQuotient: 5, pointQuotient: 5 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeGreaterThan(0);
    });

    it('compares by setQuotient when all Buchholz values are equal', () => {
      const a = { points: 2, buchholz: 5, fineBuchholz: 8, setQuotient: 2.0, pointQuotient: 1 } as StandingEntry;
      const b = { points: 2, buchholz: 5, fineBuchholz: 8, setQuotient: 1.5, pointQuotient: 5 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeGreaterThan(0);
    });

    it('compares by pointQuotient as final tiebreaker', () => {
      const a = { points: 2, buchholz: 5, fineBuchholz: 8, setQuotient: 2.0, pointQuotient: 1.3 } as StandingEntry;
      const b = { points: 2, buchholz: 5, fineBuchholz: 8, setQuotient: 2.0, pointQuotient: 1.2 } as StandingEntry;

      expect(strategy.compare(a, b, [])).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// EXPORTED UTILITY FUNCTION TESTS
// =============================================================================

describe('Exported Buchholz Functions', () => {
  describe('calculateBuchholz', () => {
    it('returns sum of opponents points', () => {
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('A', 'C'),
      ];
      // A played B and C
      // B has 0 points, C has 0 points
      const teamPoints = new Map([
        ['A', 2],
        ['B', 0],
        ['C', 0],
      ]);

      expect(calculateBuchholz('A', matches, teamPoints)).toBe(0);
    });

    it('returns correct Buchholz for opponent with points', () => {
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('B', 'C'),
      ];
      // A played B (who has 1 point from beating C)
      const teamPoints = new Map([
        ['A', 1],
        ['B', 1],
        ['C', 0],
      ]);

      expect(calculateBuchholz('A', matches, teamPoints)).toBe(1);
    });
  });

  describe('calculateFineBuchholz', () => {
    it('returns sum of opponents Buchholz scores', () => {
      const matches = [
        createWinFor('A', 'B'),
        createWinFor('A', 'C'),
      ];
      // A played B and C
      const buchholzScores = new Map([
        ['A', 4],
        ['B', 3],
        ['C', 2],
      ]);

      expect(calculateFineBuchholz('A', matches, buchholzScores)).toBe(5); // 3 + 2
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  const standardStrategy = new StandardRankingStrategy();
  const swissStrategy = new SwissRankingStrategy();

  describe('Empty tournament', () => {
    it('handles no matches', () => {
      const teams = createTeams('A', 'B', 'C');
      const standings = standardStrategy.calculateStandings([], teams);

      expect(standings).toHaveLength(3);
      expect(standings.every((e) => e.points === 0)).toBe(true);
    });

    it('assigns rank 1 to all teams when no matches played', () => {
      const teams = createTeams('A', 'B');
      const standings = standardStrategy.calculateStandings([], teams);

      expect(standings.every((e) => e.rank === 1)).toBe(true);
    });
  });

  describe('Single team', () => {
    it('handles tournament with single team', () => {
      const teams = createTeams('A');
      const standings = standardStrategy.calculateStandings([], teams);

      expect(standings).toHaveLength(1);
      expect(standings[0].rank).toBe(1);
    });
  });

  describe('Null team IDs in matches', () => {
    it('ignores matches with null teamAId', () => {
      const teams = createTeams('A', 'B');
      const matches: MatchForStandings[] = [
        { teamAId: null, teamBId: 'B', scores: [], winnerId: null, status: 'completed' },
        createWinFor('A', 'B'),
      ];

      const standings = standardStrategy.calculateStandings(matches, teams);
      const standingA = standings.find((e) => e.teamId === 'A')!;

      expect(standingA.played).toBe(1);
    });
  });

  describe('Large tournament', () => {
    it('handles 16 teams correctly', () => {
      const teams = createTeams(
        '1', '2', '3', '4', '5', '6', '7', '8',
        '9', '10', '11', '12', '13', '14', '15', '16'
      );

      // Create round-robin matches where team 1 beats everyone
      const matches: MatchForStandings[] = [];
      for (let i = 2; i <= 16; i++) {
        matches.push(createWinFor('1', i.toString()));
      }

      const standings = swissStrategy.calculateStandings(matches, teams);

      expect(standings.find((e) => e.teamId === '1')?.rank).toBe(1);
      expect(standings.find((e) => e.teamId === '1')?.won).toBe(15);
    });
  });
});
