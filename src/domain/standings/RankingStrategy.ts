/**
 * Ranking Strategy Interface
 *
 * Defines the contract for calculating tournament standings.
 * Different tournament systems use different ranking criteria:
 *
 * - Standard: wins → set difference → point difference
 * - Swiss: match points → Buchholz → Fine-Buchholz → set quotient
 * - Head-to-Head: direct comparison first, then standard criteria
 *
 * @see docs/tournament-modes-specification.md Section 2.1 for Swiss ranking
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single set score
 */
export interface SetScore {
  teamA: number;
  teamB: number;
}

/**
 * Minimal match interface for standings calculation
 */
export interface MatchForStandings {
  teamAId: string | null;
  teamBId: string | null;
  scores: SetScore[];
  winnerId: string | null;
  status: 'scheduled' | 'in-progress' | 'completed' | 'pending';
}

/**
 * Minimal team interface for standings calculation
 */
export interface TeamForStandings {
  id: string;
  name: string;
}

/**
 * Standing entry with all calculated statistics
 */
export interface StandingEntry {
  teamId: string;
  rank: number;

  // Match statistics
  played: number;
  won: number;
  lost: number;

  // Set statistics
  setsWon: number;
  setsLost: number;
  setDifference: number;

  // Point statistics
  pointsWon: number;
  pointsLost: number;
  pointDifference: number;

  // Ranking points (system-dependent)
  points: number;

  // Swiss-specific (optional)
  buchholz?: number;
  fineBuchholz?: number;
  setQuotient?: number;
  pointQuotient?: number;
}

/**
 * Ranking criterion definition
 */
export interface RankingCriterion {
  name: string;
  description: string;
  getValue: (entry: StandingEntry) => number;
  higherIsBetter: boolean;
}

/**
 * Configuration for ranking calculation
 */
export interface RankingConfig {
  /** Points awarded for a win */
  pointsPerWin: number;
  /** Points awarded for a loss */
  pointsPerLoss: number;
  /** Whether to use head-to-head comparison first */
  useHeadToHead: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  pointsPerWin: 1,
  pointsPerLoss: 0,
  useHeadToHead: false,
};

// =============================================================================
// RANKING STRATEGY INTERFACE
// =============================================================================

/**
 * Interface for ranking strategies
 *
 * Implementations:
 * - StandardRankingStrategy: wins → set diff → point diff
 * - SwissRankingStrategy: match points → Buchholz → fBH → set quotient
 * - HeadToHeadRankingStrategy: head-to-head first, then standard
 */
export interface RankingStrategy {
  /**
   * Strategy name for identification
   */
  readonly name: string;

  /**
   * Calculate standings from completed matches
   */
  calculateStandings(
    matches: MatchForStandings[],
    teams: TeamForStandings[],
    config?: Partial<RankingConfig>
  ): StandingEntry[];

  /**
   * Compare two teams for ranking purposes
   * Returns: negative if a < b (a ranks lower), positive if a > b (a ranks higher), 0 if equal
   */
  compare(
    a: StandingEntry,
    b: StandingEntry,
    matches: MatchForStandings[]
  ): number;

  /**
   * Get the ranking criteria in priority order
   */
  getCriteria(): RankingCriterion[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate base statistics for a team from matches
 */
export function calculateBaseStats(
  teamId: string,
  matches: MatchForStandings[],
  config: RankingConfig = DEFAULT_RANKING_CONFIG
): Omit<StandingEntry, 'rank' | 'buchholz' | 'fineBuchholz' | 'setQuotient' | 'pointQuotient'> {
  let played = 0;
  let won = 0;
  let lost = 0;
  let setsWon = 0;
  let setsLost = 0;
  let pointsWon = 0;
  let pointsLost = 0;

  for (const match of matches) {
    if (match.status !== 'completed') continue;
    if (match.teamAId !== teamId && match.teamBId !== teamId) continue;

    played++;
    const isTeamA = match.teamAId === teamId;

    // Count win/loss
    if (match.winnerId === teamId) {
      won++;
    } else if (match.winnerId !== null) {
      lost++;
    }

    // Count sets and points
    for (const score of match.scores) {
      const teamScore = isTeamA ? score.teamA : score.teamB;
      const oppScore = isTeamA ? score.teamB : score.teamA;

      pointsWon += teamScore;
      pointsLost += oppScore;

      if (teamScore > oppScore) {
        setsWon++;
      } else if (oppScore > teamScore) {
        setsLost++;
      }
    }
  }

  return {
    teamId,
    played,
    won,
    lost,
    setsWon,
    setsLost,
    setDifference: setsWon - setsLost,
    pointsWon,
    pointsLost,
    pointDifference: pointsWon - pointsLost,
    points: won * config.pointsPerWin + lost * config.pointsPerLoss,
  };
}

/**
 * Get all opponents a team has played against
 */
export function getOpponents(teamId: string, matches: MatchForStandings[]): string[] {
  const opponents: string[] = [];

  for (const match of matches) {
    if (match.status !== 'completed') continue;

    if (match.teamAId === teamId && match.teamBId) {
      opponents.push(match.teamBId);
    } else if (match.teamBId === teamId && match.teamAId) {
      opponents.push(match.teamAId);
    }
  }

  return opponents;
}

/**
 * Check if two teams have played against each other
 */
export function havePlayedEachOther(
  teamAId: string,
  teamBId: string,
  matches: MatchForStandings[]
): boolean {
  return matches.some(
    m =>
      m.status === 'completed' &&
      ((m.teamAId === teamAId && m.teamBId === teamBId) ||
        (m.teamAId === teamBId && m.teamBId === teamAId))
  );
}

/**
 * Get the result of a head-to-head match between two teams
 * Returns: 1 if teamA won, -1 if teamB won, 0 if not played or tie
 */
export function getHeadToHeadResult(
  teamAId: string,
  teamBId: string,
  matches: MatchForStandings[]
): number {
  for (const match of matches) {
    if (match.status !== 'completed') continue;

    if (
      (match.teamAId === teamAId && match.teamBId === teamBId) ||
      (match.teamAId === teamBId && match.teamBId === teamAId)
    ) {
      if (match.winnerId === teamAId) return 1;
      if (match.winnerId === teamBId) return -1;
    }
  }
  return 0;
}

/**
 * Assign ranks to standings based on comparison function
 */
export function assignRanks(
  standings: Omit<StandingEntry, 'rank'>[],
  compare: (a: StandingEntry, b: StandingEntry) => number
): StandingEntry[] {
  // Add temporary ranks
  const withRanks = standings.map(s => ({ ...s, rank: 0 }));

  // Sort by comparison function (higher = better = lower rank number)
  withRanks.sort((a, b) => compare(b, a));

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < withRanks.length; i++) {
    if (i > 0 && compare(withRanks[i], withRanks[i - 1]) === 0) {
      // Same as previous - same rank
      withRanks[i].rank = withRanks[i - 1].rank;
    } else {
      withRanks[i].rank = currentRank;
    }
    currentRank++;
  }

  return withRanks;
}
