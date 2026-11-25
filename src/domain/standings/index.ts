/**
 * Standings Module
 *
 * Provides ranking strategy implementations for tournament standings calculation.
 *
 * Strategies:
 * - StandardRankingStrategy: wins → set difference → point difference
 * - HeadToHeadRankingStrategy: direct match result → standard criteria
 * - SwissRankingStrategy: match points → Buchholz → Fine-Buchholz → quotients
 *
 * @see docs/tournament-modes-specification.md Section 2.1
 */

// Core interface and types
export {
  type RankingStrategy,
  type RankingCriterion,
  type RankingConfig,
  type StandingEntry,
  type MatchForStandings,
  type TeamForStandings,
  type SetScore,
  DEFAULT_RANKING_CONFIG,
  // Utility functions
  calculateBaseStats,
  getOpponents,
  havePlayedEachOther,
  getHeadToHeadResult,
  assignRanks,
} from './RankingStrategy';

// Strategy implementations
export { StandardRankingStrategy, HeadToHeadRankingStrategy } from './StandardRankingStrategy';

export {
  SwissRankingStrategy,
  calculateBuchholz,
  calculateFineBuchholz,
} from './SwissRankingStrategy';
