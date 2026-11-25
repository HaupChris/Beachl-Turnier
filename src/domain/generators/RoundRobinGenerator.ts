/**
 * Round Robin Match Generator
 *
 * Implements the Polygon method (also known as Berger tables or circle method)
 * for generating round-robin tournament schedules.
 *
 * Algorithm:
 * 1. Arrange teams in a polygon
 * 2. Fix one team, rotate the others
 * 3. Match teams that are opposite each other
 * 4. Each rotation creates one round
 *
 * Properties:
 * - Each team plays every other team exactly once
 * - Each team plays at most once per round
 * - For n teams: produces n-1 rounds (n if odd, with byes)
 * - Total matches: n(n-1)/2
 *
 * @see docs/tournament-modes-specification.md Section 1.1
 */

import {
  type MatchGenerator,
  type TeamInput,
  type GeneratorConfig,
  type GenerationResult,
  type GeneratedMatch,
  type MatchPairing,
  assignCourts,
  roundRobinMatchCount,
  roundRobinRoundCount,
} from './MatchGenerator';

// =============================================================================
// ROUND ROBIN GENERATOR
// =============================================================================

export class RoundRobinGenerator implements MatchGenerator {
  readonly name = 'round-robin';

  generate(teams: TeamInput[], config: GeneratorConfig): GenerationResult {
    const { courts, startMatchNumber = 1, startRound = 1 } = config;

    if (teams.length < 2) {
      return { matches: [], rounds: 0, matchesPerRound: 0 };
    }

    // Generate pairings using polygon method
    const pairings = this.generatePairings(teams.length);

    // Convert pairings to matches
    const matches: GeneratedMatch[] = [];
    let matchNumber = startMatchNumber;

    // Group pairings by round for court assignment
    const pairingsByRound = new Map<number, MatchPairing[]>();
    for (const pairing of pairings) {
      const round = pairing.round;
      if (!pairingsByRound.has(round)) {
        pairingsByRound.set(round, []);
      }
      pairingsByRound.get(round)!.push(pairing);
    }

    // Process each round
    const sortedRounds = Array.from(pairingsByRound.keys()).sort((a, b) => a - b);
    for (const round of sortedRounds) {
      const roundPairings = pairingsByRound.get(round)!;
      const courtAssignments = assignCourts(roundPairings.length, courts);

      for (let i = 0; i < roundPairings.length; i++) {
        const pairing = roundPairings[i];

        // Skip bye matches (but they're already filtered in generatePairings)
        const teamAId = pairing.teamAIndex < teams.length ? teams[pairing.teamAIndex].id : null;
        const teamBId = pairing.teamBIndex < teams.length ? teams[pairing.teamBIndex].id : null;

        if (teamAId === null || teamBId === null) {
          continue;
        }

        matches.push({
          round: round + startRound - 1,
          matchNumber: matchNumber++,
          teamAId,
          teamBId,
          courtNumber: courtAssignments[i],
        });
      }
    }

    const totalRounds = roundRobinRoundCount(teams.length);
    const matchesPerRound = Math.floor(teams.length / 2);

    return {
      matches,
      rounds: totalRounds,
      matchesPerRound,
    };
  }

  getExpectedMatchCount(teamCount: number): number {
    return roundRobinMatchCount(teamCount);
  }

  getExpectedRoundCount(teamCount: number): number {
    return roundRobinRoundCount(teamCount);
  }

  /**
   * Generate pairings using the Polygon method
   *
   * The algorithm:
   * 1. For n teams (add bye if odd), arrange as indices 0..n-1
   * 2. Fix position 0 (first team)
   * 3. Rotate positions 1..n-1 clockwise each round
   * 4. Pair: (0, n-1), (1, n-2), (2, n-3), etc.
   *
   * @returns Array of pairings without bye matches
   */
  generatePairings(teamCount: number): MatchPairing[] {
    if (teamCount < 2) {
      return [];
    }

    const pairings: MatchPairing[] = [];

    // Add bye for odd team count
    const effectiveCount = teamCount % 2 === 0 ? teamCount : teamCount + 1;
    const rounds = effectiveCount - 1;
    const matchesPerRound = effectiveCount / 2;

    // Create rotating indices (0 is fixed)
    const indices = Array.from({ length: effectiveCount }, (_, i) => i);

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const teamAIndex = indices[i];
        const teamBIndex = indices[effectiveCount - 1 - i];

        // Skip bye matches (bye is at index >= teamCount)
        if (teamAIndex >= teamCount || teamBIndex >= teamCount) {
          continue;
        }

        pairings.push({
          teamAIndex,
          teamBIndex,
          round: round + 1,
        });
      }

      // Rotate: keep indices[0] fixed, rotate indices[1..n-1]
      // [0, 1, 2, 3, 4, 5] -> [0, 5, 1, 2, 3, 4]
      const last = indices.pop()!;
      indices.splice(1, 0, last);
    }

    return pairings;
  }
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Generate pairings for a round-robin tournament
 *
 * Pure function version for use outside the class
 */
export function generateRoundRobinPairings(teamCount: number): MatchPairing[] {
  const generator = new RoundRobinGenerator();
  return generator.generatePairings(teamCount);
}

/**
 * Validate that pairings are a valid round-robin schedule
 */
export function validateRoundRobinPairings(pairings: MatchPairing[], teamCount: number): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check match count
  const expectedMatches = roundRobinMatchCount(teamCount);
  if (pairings.length !== expectedMatches) {
    errors.push(`Expected ${expectedMatches} matches, got ${pairings.length}`);
  }

  // Check no self-matches
  for (const p of pairings) {
    if (p.teamAIndex === p.teamBIndex) {
      errors.push(`Self-match found: team ${p.teamAIndex} vs itself`);
    }
  }

  // Check no duplicates
  const seen = new Set<string>();
  for (const p of pairings) {
    const key = [Math.min(p.teamAIndex, p.teamBIndex), Math.max(p.teamAIndex, p.teamBIndex)].join('-');
    if (seen.has(key)) {
      errors.push(`Duplicate pairing: ${p.teamAIndex} vs ${p.teamBIndex}`);
    }
    seen.add(key);
  }

  // Check all teams play each other
  const allPairs = new Set<string>();
  for (let i = 0; i < teamCount; i++) {
    for (let j = i + 1; j < teamCount; j++) {
      allPairs.add(`${i}-${j}`);
    }
  }
  for (const p of pairings) {
    const key = `${Math.min(p.teamAIndex, p.teamBIndex)}-${Math.max(p.teamAIndex, p.teamBIndex)}`;
    allPairs.delete(key);
  }
  if (allPairs.size > 0) {
    errors.push(`Missing pairings: ${Array.from(allPairs).join(', ')}`);
  }

  // Check each team plays at most once per round
  const roundTeams = new Map<number, Set<number>>();
  for (const p of pairings) {
    if (!roundTeams.has(p.round)) {
      roundTeams.set(p.round, new Set());
    }
    const teamsInRound = roundTeams.get(p.round)!;
    if (teamsInRound.has(p.teamAIndex)) {
      errors.push(`Team ${p.teamAIndex} plays multiple times in round ${p.round}`);
    }
    if (teamsInRound.has(p.teamBIndex)) {
      errors.push(`Team ${p.teamBIndex} plays multiple times in round ${p.round}`);
    }
    teamsInRound.add(p.teamAIndex);
    teamsInRound.add(p.teamBIndex);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
