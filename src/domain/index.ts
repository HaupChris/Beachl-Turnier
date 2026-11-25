/**
 * Domain Layer Index
 *
 * Central export point for all domain layer functionality.
 * This module provides a unified API for tournament management,
 * combining pure domain implementations with adapted legacy utilities.
 */

// =============================================================================
// TYPE SYSTEM
// =============================================================================

export {
  // System types
  type TournamentSystem,
  type StandaloneSystem,
  type GroupBasedSystem,
  type KnockoutPhaseSystem,
  // Type guards
  isStandaloneSystem,
  isGroupBasedSystem,
  isKnockoutPhaseSystem,
  isTournamentSystem,
  // System capability checks
  requiresPhaseTransition,
  hasFullPlacementRanking,
  usesMultipleBrackets,
  eliminatesAfterGroups,
  isProgressiveRoundSystem,
  usesRoundRobinMatches,
  hasOptionalPlayoff,
  // Utility functions
  normalizeSystemName,
  getPhase2System,
  getMinimumTeamCount,
  getRecommendedMaxTeamCount,
  // Constants
  LEGACY_SYSTEM_MAP,
  NEW_TO_LEGACY_MAP,
  SYSTEM_DISPLAY_NAMES,
  SYSTEM_DESCRIPTIONS,
} from './types/system';

export {
  // Match types
  type StandardMatch,
  type KnockoutMatch,
  type PlacementMatch,
  type MultiBracketMatch,
  // Type guards
  isKnockoutMatch,
  isPlacementMatch,
  isMultiBracketMatch,
  isStandardMatch,
} from './types/match';

export {
  isByeTeamId,
  isByeMatch,
  filterPlayableMatches,
} from './matchUtils';

export {
  // Graph types
  type TeamSlot,
  type MatchNode,
  type MatchEdge,
  type BracketGraph,
  // Slot creation
  createPlaceholderSlot,
  createByeSlot,
  // Slot checks
  isPlaceholderSlot,
  isByeSlot,
} from './types/graph';

// =============================================================================
// SCHEDULING
// =============================================================================

export {
  // Scheduling engine
  SchedulingEngine,
  createSchedulingEngine,
  estimateRoundRobinDuration,
  estimateSwissDuration,
  estimateGroupPhaseDuration,
  // Types
  type SchedulingConfig,
  type MatchFormat,
  type CourtAssignmentStrategy,
  type ScheduledMatch,
  type MatchInput,
  type PhaseSchedule,
  type TournamentSchedule,
  type DurationEstimate,
  // Utilities
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateMatchDuration,
  calculateTimeSlots,
  DEFAULT_SCHEDULING_CONFIG,
} from './scheduling';

// =============================================================================
// LEGACY ADAPTERS (for backward compatibility)
// =============================================================================

export {
  // Knockout
  getKnockoutRoundLabel,
  calculateKnockoutPlacements,
  populateKnockoutTeams,
  updateKnockoutBracket,
  generateKnockoutTournament,
  generateKnockoutTournamentPlaceholder,
  // Short main round
  getShortMainRoundLabel,
  calculateShortMainRoundPlacements,
  populateShortMainRoundTeams,
  updateShortMainRoundBracket,
  generateShortMainRoundTournament,
  generateShortMainRoundTournamentPlaceholder,
  // Placement tree
  getPlacementRoundLabel,
  calculatePlacementTreePlacements,
  populatePlacementTreeTeams,
  updatePlacementTreeBracket,
  generatePlacementTreeTournament,
  generatePlacementTreeTournamentPlaceholder,
  // Playoff
  getPlayoffMatchLabel,
  populatePlayoffTeams,
  generatePlayoffTournament,
  generatePlayoffTournamentPlaceholder,
  // Score validation
  validateScores,
  validateBestOfThreeScores,
  getRequiredSetsCount,
  validateScoreInputs,
  // Scheduling
  DEFAULT_SCHEDULING,
  estimateTournamentDuration,
  calculateMatchStartTimeForPhase,
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateMatchDuration,
  // Time estimation
  formatDuration,
  calculateTimeEstimation,
  calculateEndTime,
  // Group phase
  generateGroups,
  calculateAllGroupStandings,
  generateGroupPhaseMatches,
  // Group configuration
  calculateGroupConfiguration,
  // Standings
  calculateStandings,
  // Swiss system
  generateSwissRoundMatches,
  // Round robin
  generateRoundRobinMatches,
  // Referee assignment
  updateRefereeAssignmentsAfterRound,
  assignAllKnockoutReferees,
} from './legacy';
