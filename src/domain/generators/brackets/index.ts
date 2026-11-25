/**
 * Bracket Generators Module
 *
 * Provides bracket generation strategies for knockout tournament phases.
 *
 * Generators:
 * - PlacementTreeGenerator: Full placement tree (Mode 3A)
 *   - Every team plays until final placement determined
 *   - Winners advance to compete for higher placements
 *   - Losers advance to compete for lower placements
 *
 * Planned:
 * - SplitBracketGenerator: Split bracket by group ranks (Mode 3B)
 * - SSVBKnockoutGenerator: SSVB Knockout format (Mode 3C)
 *
 * @see docs/tournament-modes-specification.md Section 3
 */

// Core interface and types
export {
  type BracketGenerator,
  type BracketMatch,
  type BracketConfig,
  type BracketTeamSeed,
  type BracketGenerationResult,
  type PlacementInterval,
  type MatchDependency,
  type MatchRouting,
  // Utility functions
  bracketRoundCount,
  bracketSize,
  bracketByes,
  generateMatchId,
  createSeedPairings,
  isByePosition,
} from './BracketGenerator';

// Generator implementations
export {
  PlacementTreeGenerator,
  generatePlacementTreeBracket,
  validatePlacementTreeBracket,
} from './PlacementTreeGenerator';

export {
  SplitBracketGenerator,
  generateSplitBracket,
  validateSplitBracketConfig,
  type SplitBracketConfig,
  type GroupStanding,
  type BracketTier,
  type SplitBracketMatch,
} from './SplitBracketGenerator';

export {
  SSVBKnockoutGenerator,
  generateSSVBKnockout,
  validateSSVBKnockoutConfig,
  getEliminatedTeams,
  calculateSSVBPlacements,
  type SSVBKnockoutConfig,
  type SSVBBracketMatch,
  type SSVBGenerationResult,
  type EliminatedTeam,
} from './SSVBKnockoutGenerator';
