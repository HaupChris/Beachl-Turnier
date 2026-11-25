/**
 * Orchestrators Module
 *
 * Provides application-layer orchestrators that coordinate complex domain operations:
 * - MatchCompletionOrchestrator: Match completion, bracket propagation, phase transitions
 * - TournamentStartOrchestrator: Tournament initialization, match generation
 *
 * @see docs/tournament-modes-specification.md
 */

// Match completion orchestration
export {
  MatchCompletionOrchestrator,
  PhaseTransitionDetector,
  createMatchCompletionOrchestrator,
  determineMatchWinner,
  isGroupComplete,
  getNextMatchForTeam,
  countCompletedMatches,
  getCompletionPercentage,
  type SetScore,
  type MatchData,
  type StandingData,
  type MatchCompletionResult,
  type WinnerResult,
  type MatchCompletionConfig,
} from './MatchCompletionOrchestrator';

// Tournament start orchestration
export {
  TournamentStartOrchestrator,
  SwissRoundOrchestrator,
  createTournamentStartOrchestrator,
  createSwissRoundOrchestrator,
  calculateRoundRobinMatchCount,
  calculateRoundRobinRoundCount,
  calculateGroupPhaseMatchCount,
  type TeamData,
  type GroupConfig,
  type GroupPhaseConfig,
  type GeneratedMatch,
  type InitialStanding,
  type KnockoutSettings,
  type KnockoutPhasePlaceholder,
  type TournamentStartConfig,
  type TournamentStartResult,
} from './TournamentStartOrchestrator';
