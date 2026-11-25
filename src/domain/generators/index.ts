/**
 * Match Generators Module
 *
 * Provides match generation strategies for different tournament systems.
 *
 * Generators:
 * - RoundRobinGenerator: Polygon method for round-robin schedules
 * - SwissGenerator: Dynamic pairing based on standings
 * - GroupPhaseGenerator: Snake seeding for group distribution (TODO)
 *
 * @see docs/tournament-modes-specification.md
 */

// Core interface and types
export {
  type MatchGenerator,
  type MatchPairing,
  type GeneratorConfig,
  type TeamInput,
  type GeneratedMatch,
  type GenerationResult,
  // Utility functions
  assignCourts,
  roundRobinMatchCount,
  roundRobinRoundCount,
} from './MatchGenerator';

// Generator implementations
export {
  RoundRobinGenerator,
  generateRoundRobinPairings,
  validateRoundRobinPairings,
} from './RoundRobinGenerator';

export {
  SwissGenerator,
  generateSwissRound1,
  generateSwissNextRound,
  validateSwissPairings,
  getRecommendedSwissRounds,
  getMaxSwissRounds,
  type SwissTeamState,
  type MatchRecord,
  type SwissPairing,
} from './SwissGenerator';

export {
  GroupPhaseGenerator,
  generateSnakeSeeding,
  validateSnakeSeeding,
  getExpectedSnakeDistribution,
  getGroupPhaseMatchCount,
  type GroupDistribution,
  type GroupPhaseConfig,
  type GroupMatchResult,
} from './GroupPhaseGenerator';

// Bracket generators
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
  // Implementations
  PlacementTreeGenerator,
  generatePlacementTreeBracket,
  validatePlacementTreeBracket,
} from './brackets';
