/**
 * Match Generator Interface
 *
 * Defines the contract for generating tournament matches.
 * Different tournament systems use different match generation strategies:
 *
 * - RoundRobin: Polygon method (Berger tables), everyone plays everyone
 * - Swiss: Dynamic pairing based on standings after each round
 * - Knockout: Single/Double elimination brackets
 *
 * @see docs/tournament-modes-specification.md
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A match pairing (team indices or IDs)
 */
export interface MatchPairing {
  teamAIndex: number;
  teamBIndex: number;
  round: number;
}

/**
 * Configuration for match generation
 */
export interface GeneratorConfig {
  /** Number of available courts */
  courts: number;
  /** Starting match number (default: 1) */
  startMatchNumber?: number;
  /** Starting round number (default: 1) */
  startRound?: number;
}

/**
 * Team input for match generation
 */
export interface TeamInput {
  id: string;
  seedPosition?: number;
}

/**
 * Generated match output (without platform-specific IDs)
 */
export interface GeneratedMatch {
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  courtNumber: number | null;
}

/**
 * Result of match generation
 */
export interface GenerationResult {
  matches: GeneratedMatch[];
  rounds: number;
  matchesPerRound: number;
}

// =============================================================================
// MATCH GENERATOR INTERFACE
// =============================================================================

/**
 * Interface for match generators
 */
export interface MatchGenerator {
  /**
   * Generator name for identification
   */
  readonly name: string;

  /**
   * Generate matches for a set of teams
   */
  generate(teams: TeamInput[], config: GeneratorConfig): GenerationResult;

  /**
   * Get the expected number of matches for a given team count
   */
  getExpectedMatchCount(teamCount: number): number;

  /**
   * Get the expected number of rounds for a given team count
   */
  getExpectedRoundCount(teamCount: number): number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Assign court numbers to matches in a round
 */
export function assignCourts(
  matchesInRound: number,
  availableCourts: number,
  startingCourt: number = 1
): (number | null)[] {
  const courts: (number | null)[] = [];
  for (let i = 0; i < matchesInRound; i++) {
    const courtNum = startingCourt + i;
    courts.push(courtNum <= availableCourts ? courtNum : null);
  }
  return courts;
}

/**
 * Calculate round-robin match count: n(n-1)/2
 */
export function roundRobinMatchCount(teamCount: number): number {
  return (teamCount * (teamCount - 1)) / 2;
}

/**
 * Calculate round-robin round count: n-1 (n even) or n (n odd)
 */
export function roundRobinRoundCount(teamCount: number): number {
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}
