/**
 * Domain Types Index
 *
 * This module exports all domain types for use throughout the application.
 */

// System types and guards
export {
  // Types
  type TournamentSystem,
  type StandaloneSystem,
  type GroupBasedSystem,
  type KnockoutPhaseSystem,
  // Type guards
  isStandaloneSystem,
  isGroupBasedSystem,
  isKnockoutPhaseSystem,
  isTournamentSystem,
  // Capability checks
  requiresPhaseTransition,
  hasFullPlacementRanking,
  usesMultipleBrackets,
  eliminatesAfterGroups,
  isProgressiveRoundSystem,
  usesRoundRobinMatches,
  hasOptionalPlayoff,
  // Legacy mapping
  normalizeSystemName,
  LEGACY_SYSTEM_MAP,
  NEW_TO_LEGACY_MAP,
  // Metadata
  SYSTEM_DISPLAY_NAMES,
  SYSTEM_DESCRIPTIONS,
  getPhase2System,
  getMinimumTeamCount,
  getRecommendedMaxTeamCount,
} from './system';

// Match types and guards
export {
  // Types
  type Match,
  type StandardMatch,
  type KnockoutMatch,
  type PlacementMatch,
  type MultiBracketMatch,
  type SetScore,
  type MatchStatus,
  type KnockoutRoundType,
  type PlacementRoundType,
  type MultiBracketRoundType,
  type MatchDependency,
  type TeamSource,
  type PlacementInterval,
  // Type guards
  isStandardMatch,
  isKnockoutMatch,
  isPlacementMatch,
  isMultiBracketMatch,
  hasDependencies,
  isMatchReady,
  isPlayoffMatch,
  isThirdPlaceMatch,
  // Factory functions
  createStandardMatch,
  createKnockoutMatch,
  createPlacementMatch,
  createMultiBracketMatch,
  // Utilities
  getMatchTypeLabel,
  calculateWinner,
} from './match';

// Graph types and utilities
export {
  // Types
  type MatchNode,
  type BracketGraph,
  type TeamSlot,
  type StaticTeamSlot,
  type ByeTeamSlot,
  type DependentTeamSlot,
  type PlaceholderTeamSlot,
  type MatchEdge,
  type MatchNodeMetadata,
  // Team slot type guards
  isStaticSlot,
  isByeSlot,
  isDependentSlot,
  isPlaceholderSlot,
  isSlotResolved,
  // Match node utilities
  isNodeReady,
  isByeMatch,
  getTeamIdFromSlot,
  getSlotDisplayText,
  isFinalMatch,
  isThirdPlaceMatchNode,
  isConditionalMatch,
  // Factory functions
  createStaticSlot,
  createByeSlot,
  createDependentSlot,
  createPlaceholderSlot,
  createMatchEdge,
  createMatchNode,
  // Graph utilities
  findNodeById,
  getDependentMatches,
  getWinnerNextMatch,
  getLoserNextMatch,
  getRootMatches,
  getMatchesByRound,
  propagateResult,
} from './graph';
