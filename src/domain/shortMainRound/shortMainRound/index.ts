/**
 * BeachL-Kurze-Hauptrunde (Shortened Main Round) Module
 *
 * This module provides functionality for managing shortened main round knockout tournaments
 * following the BeachL format with flexible group structures (2-8 groups).
 */

// Main tournament generation
export { generateShortMainRoundTournament } from './generator';

// Placeholder tournament generation
export {
  generateShortMainRoundTournamentPlaceholder,
  generateShortMainRoundMatchesPlaceholder,
} from './placeholderGenerator';

// Team population
export { populateShortMainRoundTeams } from './populateTeams';

// Bracket management
export { updateShortMainRoundBracket } from './bracketUpdater';

// Placement calculations
export {
  calculateShortMainRoundPlacements,
  getShortMainRoundLabel,
  getShortMainRoundMatchCount,
} from './placements';

// Type definitions
export type { TeamSeed, SeedMapping } from './types';

// Match generation helpers (exported for testing/advanced usage)
export {
  generateShortMainRoundMatches,
  generateRound1Matches,
  generateSubsequentRoundMatches,
  categorizeTeams,
} from './matchGenerator';
