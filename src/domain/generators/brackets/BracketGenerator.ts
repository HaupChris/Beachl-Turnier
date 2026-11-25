/**
 * Bracket Generator Interface
 *
 * Defines the contract for generating knockout bracket structures.
 * Different bracket types have different routing rules:
 *
 * - PlacementTree: Full placement (winners and losers both continue)
 * - SingleElimination: Losers are eliminated
 * - DoubleElimination: Two chances before elimination
 *
 * @see docs/tournament-modes-specification.md Section 3
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Placement interval tracking what placements a match determines
 */
export interface PlacementInterval {
  /** Starting placement (1 = first place) */
  start: number;
  /** Ending placement */
  end: number;
}

/**
 * Match dependency reference
 */
export interface MatchDependency {
  /** ID of the feeding match */
  matchId: string;
  /** Which result from that match (winner or loser) */
  result: 'winner' | 'loser';
}

/**
 * Match routing destination
 */
export interface MatchRouting {
  /** ID of the destination match */
  matchId: string;
  /** Which slot in the destination match (A or B) */
  slot: 'A' | 'B';
}

/**
 * A bracket match with dependency and routing information
 */
export interface BracketMatch {
  /** Unique match identifier */
  id: string;
  /** Round number (1 = first round of bracket) */
  round: number;
  /** Sequential match number */
  matchNumber: number;
  /** Position in bracket visualization */
  bracketPosition: number;

  /** Team A (static assignment) */
  teamAId: string | null;
  /** Team B (static assignment) */
  teamBId: string | null;

  /** Court assignment */
  courtNumber: number | null;

  /** What placement range this match determines */
  placementInterval: PlacementInterval;
  /** Where winners go next (null = determines final placement) */
  winnerInterval: PlacementInterval | null;
  /** Where losers go next (null = determines final placement or eliminated) */
  loserInterval: PlacementInterval | null;

  /** Dependencies on previous matches */
  dependsOn?: {
    teamA?: MatchDependency;
    teamB?: MatchDependency;
  };

  /** Routing for winners (null = tournament ends) */
  winnerGoesTo: MatchRouting | null;
  /** Routing for losers (null = eliminated or tournament ends) */
  loserGoesTo: MatchRouting | null;

  /** Final placement if this is a placement match */
  playoffForPlace?: number;
}

/**
 * Configuration for bracket generation
 */
export interface BracketConfig {
  /** Number of available courts */
  courts: number;
  /** Starting match number */
  startMatchNumber?: number;
  /** Starting round number */
  startRound?: number;
  /** Whether to include consolation matches */
  includeConsolation?: boolean;
  /** Whether to include third place match */
  includeThirdPlaceMatch?: boolean;
}

/**
 * Team seeding for bracket placement
 */
export interface BracketTeamSeed {
  id: string;
  seed: number;
}

/**
 * Result of bracket generation
 */
export interface BracketGenerationResult {
  matches: BracketMatch[];
  rounds: number;
  totalMatches: number;
}

// =============================================================================
// BRACKET GENERATOR INTERFACE
// =============================================================================

/**
 * Interface for bracket generators
 */
export interface BracketGenerator {
  /**
   * Generator name for identification
   */
  readonly name: string;

  /**
   * Generate bracket matches for a set of seeded teams
   */
  generate(teams: BracketTeamSeed[], config: BracketConfig): BracketGenerationResult;

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
 * Calculate the number of rounds needed for n teams
 */
export function bracketRoundCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.ceil(Math.log2(teamCount));
}

/**
 * Calculate the bracket size (next power of 2)
 */
export function bracketSize(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.pow(2, Math.ceil(Math.log2(teamCount)));
}

/**
 * Calculate the number of byes needed
 */
export function bracketByes(teamCount: number): number {
  return bracketSize(teamCount) - teamCount;
}

/**
 * Generate a unique match ID
 */
export function generateMatchId(): string {
  return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create standard seeding order (1 vs last, 2 vs second-to-last, etc.)
 */
export function createSeedPairings(teamCount: number): [number, number][] {
  const size = bracketSize(teamCount);
  const pairs: [number, number][] = [];

  for (let i = 0; i < size / 2; i++) {
    pairs.push([i, size - 1 - i]);
  }

  return pairs;
}

/**
 * Check if a team position is a bye (index >= teamCount)
 */
export function isByePosition(position: number, teamCount: number): boolean {
  return position >= teamCount;
}
