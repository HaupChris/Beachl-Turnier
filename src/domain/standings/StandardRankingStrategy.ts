/**
 * Standard Ranking Strategy
 * Priority: wins → set difference → point difference
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
  assignRanks,
  getHeadToHeadResult,
} from './RankingStrategy';

export class StandardRankingStrategy implements RankingStrategy {
  readonly name = 'standard';

  getCriteria(): RankingCriterion[] {
    return [
      {
        name: 'points',
        description: 'Ranking points (wins)',
        getValue: (e) => e.points,
        higherIsBetter: true,
      },
      {
        name: 'setDifference',
        description: 'Set difference',
        getValue: (e) => e.setDifference,
        higherIsBetter: true,
      },
      {
        name: 'pointDifference',
        description: 'Point difference',
        getValue: (e) => e.pointDifference,
        higherIsBetter: true,
      },
    ];
  }

  calculateStandings(
    matches: MatchForStandings[],
    teams: TeamForStandings[],
    config?: Partial<RankingConfig>
  ): StandingEntry[] {
    const cfg = { ...DEFAULT_RANKING_CONFIG, ...config };

    const standings = teams.map((team) => calculateBaseStats(team.id, matches, cfg));

    return assignRanks(standings, (a, b) => this.compare(a, b, matches));
  }

  compare(a: StandingEntry, b: StandingEntry, _matches: MatchForStandings[]): number {
    // 1. Points (wins)
    if (a.points !== b.points) return a.points - b.points;

    // 2. Set difference
    if (a.setDifference !== b.setDifference) return a.setDifference - b.setDifference;

    // 3. Point difference
    if (a.pointDifference !== b.pointDifference) return a.pointDifference - b.pointDifference;

    return 0;
  }
}

/**
 * Head-to-Head Ranking Strategy
 * Priority: head-to-head result → standard criteria
 */
export class HeadToHeadRankingStrategy implements RankingStrategy {
  readonly name = 'head-to-head';
  private standardStrategy = new StandardRankingStrategy();

  getCriteria(): RankingCriterion[] {
    return [
      {
        name: 'headToHead',
        description: 'Direct match result',
        getValue: () => 0, // Computed dynamically
        higherIsBetter: true,
      },
      ...this.standardStrategy.getCriteria(),
    ];
  }

  calculateStandings(
    matches: MatchForStandings[],
    teams: TeamForStandings[],
    config?: Partial<RankingConfig>
  ): StandingEntry[] {
    const cfg = { ...DEFAULT_RANKING_CONFIG, ...config };
    const standings = teams.map((team) => calculateBaseStats(team.id, matches, cfg));
    return assignRanks(standings, (a, b) => this.compare(a, b, matches));
  }

  compare(a: StandingEntry, b: StandingEntry, matches: MatchForStandings[]): number {
    // 1. Head-to-head result
    const h2h = getHeadToHeadResult(a.teamId, b.teamId, matches);
    if (h2h !== 0) return h2h;

    // 2. Fall back to standard criteria
    return this.standardStrategy.compare(a, b, matches);
  }
}
