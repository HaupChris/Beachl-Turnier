/**
 * Validation Module
 *
 * Provides domain-layer validation for tournament operations:
 * - ScoreValidator: Match score validation
 * - TournamentValidator: Tournament configuration validation
 *
 * @see docs/tournament-modes-specification.md
 */

// Score validation
export {
  ScoreValidator,
  createScoreValidator,
  validateMatchScores,
  validateSetScore,
  determineMatchWinner,
  DEFAULT_SCORE_FORMAT,
  type SetScore,
  type ScoreFormat,
  type ValidationResult as ScoreValidationResult,
  type SetValidationResult,
  type MatchValidationResult,
} from './ScoreValidator';

// Tournament validation
export {
  TournamentValidator,
  createTournamentValidator,
  validateTournamentConfig,
  validateTeamCount,
  getTeamCountConstraints,
  calculateOptimalGroupConfig,
  TEAM_COUNT_CONSTRAINTS,
  MAX_GROUPS,
  MIN_GROUPS,
  type TournamentConfig,
  type ValidationResult as TournamentValidationResult,
  type TeamCountConstraints,
  type GroupConfigResult,
} from './TournamentValidator';
