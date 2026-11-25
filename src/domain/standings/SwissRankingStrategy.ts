/**
 * Swiss Ranking Strategy
 * Priority: match points → Buchholz → Fine-Buchholz → set quotient → point quotient
 *
 * Buchholz = Sum of all opponents' match points
 * Fine-Buchholz = Sum of all opponents' Buchholz numbers
 *
 * @see docs/tournament-modes-specification.md Section 2.1
 */

import {
  type RankingStrategy,
  type RankingCriterion,
  type StandingEntry,
  type MatchForStandings,
  type TeamForStandings,
  type RankingConfig,
  DEFAULT_RANKING_CONFIG,
  calculateBaseStats,
  getOpponents,
  assignRanks,
} from './RankingStrategy';

export class SwissRankingStrategy implements RankingStrategy {
  readonly name = 'swiss';

  getCriteria(): RankingCriterion[] {
    return [
      { name: 'points', description: 'Match points', getValue: (e) => e.points, higherIsBetter: true },
      { name: 'buchholz', description: 'Buchholz number', getValue: (e) => e.buchholz ?? 0, higherIsBetter: true },
      { name: 'fineBuchholz', description: 'Fine-Buchholz', getValue: (e) => e.fineBuchholz ?? 0, higherIsBetter: true },
      { name: 'setQuotient', description: 'Set quotient', getValue: (e) => e.setQuotient ?? 0, higherIsBetter: true },
      { name: 'pointQuotient', description: 'Point quotient', getValue: (e) => e.pointQuotient ?? 0, higherIsBetter: true },
    ];
  }

  calculateStandings(
    matches: MatchForStandings[],
    teams: TeamForStandings[],
    config?: Partial<RankingConfig>
  ): StandingEntry[] {
    const cfg = { ...DEFAULT_RANKING_CONFIG, ...config };

    // Step 1: Calculate base stats for all teams
    const baseStats = new Map<string, ReturnType<typeof calculateBaseStats>>();
    for (const team of teams) {
      baseStats.set(team.id, calculateBaseStats(team.id, matches, cfg));
    }

    // Step 2: Calculate Buchholz (sum of opponents' match points)
    const buchholzScores = new Map<string, number>();
    for (const team of teams) {
      const opponents = getOpponents(team.id, matches);
      const buchholz = opponents.reduce((sum, oppId) => {
        const oppStats = baseStats.get(oppId);
        return sum + (oppStats?.points ?? 0);
      }, 0);
      buchholzScores.set(team.id, buchholz);
    }

    // Step 3: Calculate Fine-Buchholz (sum of opponents' Buchholz)
    const fineBuchholzScores = new Map<string, number>();
    for (const team of teams) {
      const opponents = getOpponents(team.id, matches);
      const fineBuchholz = opponents.reduce((sum, oppId) => {
        return sum + (buchholzScores.get(oppId) ?? 0);
      }, 0);
      fineBuchholzScores.set(team.id, fineBuchholz);
    }

    // Step 4: Build full standings with Swiss-specific fields
    const standings: Omit<StandingEntry, 'rank'>[] = teams.map((team) => {
      const base = baseStats.get(team.id)!;
      return {
        ...base,
        buchholz: buchholzScores.get(team.id) ?? 0,
        fineBuchholz: fineBuchholzScores.get(team.id) ?? 0,
        setQuotient: base.setsLost > 0 ? base.setsWon / base.setsLost : base.setsWon > 0 ? Infinity : 1,
        pointQuotient: base.pointsLost > 0 ? base.pointsWon / base.pointsLost : base.pointsWon > 0 ? Infinity : 1,
      };
    });

    return assignRanks(standings, (a, b) => this.compare(a, b, matches));
  }

  compare(a: StandingEntry, b: StandingEntry, _matches: MatchForStandings[]): number {
    // 1. Match points
    if (a.points !== b.points) return a.points - b.points;

    // 2. Buchholz
    const aBH = a.buchholz ?? 0;
    const bBH = b.buchholz ?? 0;
    if (aBH !== bBH) return aBH - bBH;

    // 3. Fine-Buchholz
    const aFBH = a.fineBuchholz ?? 0;
    const bFBH = b.fineBuchholz ?? 0;
    if (aFBH !== bFBH) return aFBH - bFBH;

    // 4. Set quotient
    const aSQ = a.setQuotient ?? 1;
    const bSQ = b.setQuotient ?? 1;
    if (aSQ !== bSQ) return aSQ - bSQ;

    // 5. Point quotient
    const aPQ = a.pointQuotient ?? 1;
    const bPQ = b.pointQuotient ?? 1;
    return aPQ - bPQ;
  }
}

/**
 * Calculate Buchholz score for a single team
 */
export function calculateBuchholz(
  teamId: string,
  matches: MatchForStandings[],
  teamPoints: Map<string, number>
): number {
  const opponents = getOpponents(teamId, matches);
  return opponents.reduce((sum, oppId) => sum + (teamPoints.get(oppId) ?? 0), 0);
}

/**
 * Calculate Fine-Buchholz score for a single team
 */
export function calculateFineBuchholz(
  teamId: string,
  matches: MatchForStandings[],
  buchholzScores: Map<string, number>
): number {
  const opponents = getOpponents(teamId, matches);
  return opponents.reduce((sum, oppId) => sum + (buchholzScores.get(oppId) ?? 0), 0);
}
