/**
 * Scheduling Module
 *
 * Provides domain-layer abstractions for tournament scheduling:
 * - Time slot calculation with parallel court support
 * - Court assignment strategies
 * - Phase transition handling
 * - Duration estimation
 *
 * @see docs/tournament-modes-specification.md
 */

export {
  // Main class
  SchedulingEngine,

  // Factory function
  createSchedulingEngine,

  // Utility functions
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateMatchDuration,
  calculateTimeSlots,

  // Quick estimation functions
  estimateRoundRobinDuration,
  estimateSwissDuration,
  estimateGroupPhaseDuration,

  // Default config
  DEFAULT_SCHEDULING_CONFIG,

  // Types
  type SchedulingConfig,
  type MatchFormat,
  type CourtAssignmentStrategy,
  type ScheduledMatch,
  type MatchInput,
  type PhaseSchedule,
  type TournamentSchedule,
  type DurationEstimate,
} from './SchedulingEngine';

// Core utilities
export {
  DEFAULT_SCHEDULING,
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateMatchDuration,
} from './core';

// Match time calculations
export {
  calculateMatchStartTime,
  calculateTournamentEndTime,
  checkTimeOverrun,
  calculatePhaseEndMinutes,
} from './matchTime';

// Tournament duration estimation
export {
  estimateTournamentDuration,
  estimateSSVBTournamentDuration,
} from './tournamentEstimation';

// Phase-aware time calculations
export {
  calculateMatchStartTimeWithPhases,
  calculateMatchStartTimeForPhase,
} from './phaseTime';

// Knockout time calculations
export {
  calculateKnockoutMatchStartTime,
  calculateKnockoutMatchStartTimeWithOffset,
} from './knockoutTime';
