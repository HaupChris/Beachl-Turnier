/**
 * Swiss System Match Generator
 *
 * Implements the Swiss pairing algorithm for generating tournament rounds
 * based on current standings.
 *
 * Algorithm:
 * 1. Round 1: Use seeding (top half vs bottom half)
 * 2. Subsequent rounds:
 *    - Calculate rankings using Buchholz tiebreakers
 *    - Group teams by match points (score groups)
 *    - Pair teams within same score group, prefer avoiding rematches
 *    - Use greedy pairing with backtracking when stuck
 * 3. Handle bye for odd number of teams
 *
 * @see docs/tournament-modes-specification.md Section 2
 */

import {
  type MatchGenerator,
  type TeamInput,
  type GeneratorConfig,
  type GenerationResult,
  type GeneratedMatch,
  assignCourts,
} from './MatchGenerator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Team with current standings for Swiss pairing
 */
export interface SwissTeamState {
  id: string;
  index: number;
  matchPoints: number;
  buchholz: number;
  fineBuchholz: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  hasBye: boolean;
}

/**
 * Previous match record for rematch checking
 */
export interface MatchRecord {
  teamAId: string;
  teamBId: string;
  winnerId: string | null;
}

/**
 * Configuration for Swiss round generation
 */
export interface SwissRoundConfig {
  roundNumber: number;
  history: MatchRecord[];
  standings: SwissTeamState[];
}

/**
 * Pairing result with metadata
 */
export interface SwissPairing {
  teamAIndex: number;
  teamBIndex: number;
  isBye: boolean;
  reason?: string;
}

// =============================================================================
// SWISS GENERATOR
// =============================================================================

export class SwissGenerator implements MatchGenerator {
  readonly name = 'swiss';

  generate(teams: TeamInput[], config: GeneratorConfig): GenerationResult {
    // Swiss generates one round at a time, so this is not the primary entry point
    // Instead, use generateSwissRound for progressive round generation
    const pairings = this.generateRound1Pairings(teams.length);

    const matches: GeneratedMatch[] = [];
    const courtAssignments = assignCourts(pairings.length, config.courts);
    const startMatchNumber = config.startMatchNumber ?? 1;
    const startRound = config.startRound ?? 1;

    for (let i = 0; i < pairings.length; i++) {
      const pairing = pairings[i];
      if (pairing.isBye) continue;

      matches.push({
        round: startRound,
        matchNumber: startMatchNumber + i,
        teamAId: teams[pairing.teamAIndex].id,
        teamBId: teams[pairing.teamBIndex].id,
        courtNumber: courtAssignments[i],
      });
    }

    return {
      matches,
      rounds: 1,
      matchesPerRound: Math.floor(teams.length / 2),
    };
  }

  getExpectedMatchCount(teamCount: number): number {
    // Swiss typically runs ceil(log2(N)) + 1 rounds
    const rounds = this.getExpectedRoundCount(teamCount);
    const matchesPerRound = Math.floor(teamCount / 2);
    return rounds * matchesPerRound;
  }

  getExpectedRoundCount(teamCount: number): number {
    // Recommended: ceil(log2(N)) + 1
    if (teamCount <= 1) return 0;
    return Math.ceil(Math.log2(teamCount)) + 1;
  }

  /**
   * Generate Round 1 pairings based on seeding
   *
   * Pairing: Seed 1 vs Seed (N/2 + 1), Seed 2 vs Seed (N/2 + 2), etc.
   */
  generateRound1Pairings(teamCount: number): SwissPairing[] {
    if (teamCount < 2) return [];

    const pairings: SwissPairing[] = [];
    const halfCount = Math.floor(teamCount / 2);

    for (let i = 0; i < halfCount; i++) {
      pairings.push({
        teamAIndex: i,
        teamBIndex: halfCount + i,
        isBye: false,
        reason: 'seeding',
      });
    }

    // Handle bye for odd number of teams
    if (teamCount % 2 !== 0) {
      pairings.push({
        teamAIndex: teamCount - 1,
        teamBIndex: -1, // bye marker
        isBye: true,
        reason: 'bye',
      });
    }

    return pairings;
  }

  /**
   * Generate pairings for subsequent rounds based on standings
   *
   * Algorithm:
   * 1. Sort teams by ranking (match points, then Buchholz, etc.)
   * 2. Group by match points
   * 3. Pair within groups, avoiding rematches
   * 4. Use backtracking if no valid pairing exists
   */
  generateSubsequentRoundPairings(
    standings: SwissTeamState[],
    history: MatchRecord[]
  ): SwissPairing[] {
    // Sort by ranking criteria
    const sorted = this.sortByRanking(standings);

    // Greedy pairing with backtracking
    return this.pairWithBacktracking(sorted, history);
  }

  /**
   * Sort teams by Swiss ranking criteria
   */
  sortByRanking(teams: SwissTeamState[]): SwissTeamState[] {
    return [...teams].sort((a, b) => {
      // 1. Match points (descending)
      if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;

      // 2. Buchholz (descending)
      if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz;

      // 3. Fine-Buchholz (descending)
      if (a.fineBuchholz !== b.fineBuchholz) return b.fineBuchholz - a.fineBuchholz;

      // 4. Set quotient (descending)
      const aSetQ = a.setsLost > 0 ? a.setsWon / a.setsLost : a.setsWon > 0 ? Infinity : 1;
      const bSetQ = b.setsLost > 0 ? b.setsWon / b.setsLost : b.setsWon > 0 ? Infinity : 1;
      if (aSetQ !== bSetQ) return bSetQ - aSetQ;

      // 5. Point quotient (descending)
      const aPtQ = a.pointsLost > 0 ? a.pointsWon / a.pointsLost : a.pointsWon > 0 ? Infinity : 1;
      const bPtQ = b.pointsLost > 0 ? b.pointsWon / b.pointsLost : b.pointsWon > 0 ? Infinity : 1;
      return bPtQ - aPtQ;
    });
  }

  /**
   * Group teams by match points
   */
  groupByMatchPoints(teams: SwissTeamState[]): Map<number, SwissTeamState[]> {
    const groups = new Map<number, SwissTeamState[]>();

    for (const team of teams) {
      if (!groups.has(team.matchPoints)) {
        groups.set(team.matchPoints, []);
      }
      groups.get(team.matchPoints)!.push(team);
    }

    return groups;
  }

  /**
   * Greedy pairing with backtracking
   */
  pairWithBacktracking(
    sortedTeams: SwissTeamState[],
    history: MatchRecord[]
  ): SwissPairing[] {
    const pairings: SwissPairing[] = [];
    const unpaired = [...sortedTeams];

    while (unpaired.length > 1) {
      const team = unpaired[0];
      const opponent = this.findValidOpponent(team, unpaired.slice(1), history);

      if (opponent) {
        pairings.push({
          teamAIndex: team.index,
          teamBIndex: opponent.index,
          isBye: false,
        });
        unpaired.splice(unpaired.indexOf(team), 1);
        unpaired.splice(unpaired.indexOf(opponent), 1);
      } else {
        // If no valid opponent found, try backtracking
        const backtrackResult = this.tryBacktrack(pairings, team, unpaired, history);
        if (backtrackResult) {
          // Backtrack succeeded, retry
          continue;
        } else {
          // No solution found, pair with first available (allow rematch)
          const fallbackOpponent = unpaired[1];
          if (fallbackOpponent) {
            pairings.push({
              teamAIndex: team.index,
              teamBIndex: fallbackOpponent.index,
              isBye: false,
              reason: 'rematch-forced',
            });
            unpaired.splice(0, 2);
          } else {
            // Only one team left
            break;
          }
        }
      }
    }

    // Handle bye
    if (unpaired.length === 1) {
      const byeTeam = unpaired[0];
      pairings.push({
        teamAIndex: byeTeam.index,
        teamBIndex: -1,
        isBye: true,
        reason: 'bye',
      });
    }

    return pairings;
  }

  /**
   * Find a valid opponent for a team
   * Prefers same score group, avoids rematches
   */
  findValidOpponent(
    team: SwissTeamState,
    candidates: SwissTeamState[],
    history: MatchRecord[]
  ): SwissTeamState | null {
    // First try same score group
    const sameScoreGroup = candidates.filter(
      (c) => c.matchPoints === team.matchPoints && !this.hasPlayedBefore(team.id, c.id, history)
    );

    if (sameScoreGroup.length > 0) {
      return sameScoreGroup[0];
    }

    // Try any team that hasn't been played
    for (const candidate of candidates) {
      if (!this.hasPlayedBefore(team.id, candidate.id, history)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Check if two teams have played before
   */
  hasPlayedBefore(teamAId: string, teamBId: string, history: MatchRecord[]): boolean {
    return history.some(
      (m) =>
        (m.teamAId === teamAId && m.teamBId === teamBId) ||
        (m.teamAId === teamBId && m.teamBId === teamAId)
    );
  }

  /**
   * Try backtracking to find a valid pairing
   */
  tryBacktrack(
    pairings: SwissPairing[],
    _stuckTeam: SwissTeamState,
    _unpaired: SwissTeamState[],
    _history: MatchRecord[]
  ): boolean {
    // Simple backtracking: try undoing the last pairing
    if (pairings.length === 0) {
      return false;
    }

    // For now, just return false (no backtracking)
    // Full backtracking would be more complex
    return false;
  }
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Generate Round 1 pairings for Swiss tournament
 */
export function generateSwissRound1(teamCount: number): SwissPairing[] {
  const generator = new SwissGenerator();
  return generator.generateRound1Pairings(teamCount);
}

/**
 * Generate pairings for subsequent Swiss rounds
 */
export function generateSwissNextRound(
  standings: SwissTeamState[],
  history: MatchRecord[]
): SwissPairing[] {
  const generator = new SwissGenerator();
  return generator.generateSubsequentRoundPairings(standings, history);
}

/**
 * Check if a Swiss pairing is valid (no rematches)
 */
export function validateSwissPairings(
  pairings: SwissPairing[],
  history: MatchRecord[],
  teams: { id: string; index: number }[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const generator = new SwissGenerator();

  for (const pairing of pairings) {
    if (pairing.isBye) continue;

    const teamAId = teams.find((t) => t.index === pairing.teamAIndex)?.id;
    const teamBId = teams.find((t) => t.index === pairing.teamBIndex)?.id;

    if (!teamAId || !teamBId) {
      errors.push(`Invalid team indices in pairing: ${pairing.teamAIndex} vs ${pairing.teamBIndex}`);
      continue;
    }

    if (generator.hasPlayedBefore(teamAId, teamBId, history)) {
      errors.push(`Rematch detected: ${teamAId} vs ${teamBId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate recommended number of rounds for Swiss tournament
 */
export function getRecommendedSwissRounds(teamCount: number): number {
  if (teamCount <= 1) return 0;
  return Math.ceil(Math.log2(teamCount)) + 1;
}

/**
 * Get maximum number of rounds for Swiss tournament (before rematches become unavoidable)
 */
export function getMaxSwissRounds(teamCount: number): number {
  // Maximum is when each team has played every other team
  return teamCount - 1;
}
