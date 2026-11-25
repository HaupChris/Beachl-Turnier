/**
 * Tournament Validator
 *
 * Validates tournament configuration and state:
 * - Team count constraints
 * - System compatibility
 * - Group configuration
 * - State transitions
 *
 * @see docs/tournament-modes-specification.md
 */

import { isGroupBasedSystem, type TournamentSystem } from '../types/system';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tournament configuration for validation
 */
export interface TournamentConfig {
  system: TournamentSystem;
  teamCount: number;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
  // Group phase options
  numberOfGroups?: number;
  teamsPerGroup?: 3 | 4 | 5;
  // Swiss options
  swissRounds?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Team count constraints for a tournament system
 */
export interface TeamCountConstraints {
  min: number;
  max: number;
  recommended?: { min: number; max: number };
}

/**
 * Group configuration result
 */
export interface GroupConfigResult {
  valid: boolean;
  numberOfGroups: number;
  teamsPerGroup: number;
  byesNeeded: number;
  totalSlots: number;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Team count constraints by tournament system
 */
export const TEAM_COUNT_CONSTRAINTS: Record<string, TeamCountConstraints> = {
  'round-robin': { min: 2, max: 12, recommended: { min: 4, max: 8 } },
  'round-robin-playoff': { min: 2, max: 12, recommended: { min: 4, max: 8 } },
  'swiss': { min: 4, max: 64, recommended: { min: 8, max: 32 } },
  'groups-only': { min: 6, max: 40, recommended: { min: 8, max: 24 } },
  'groups-full-placement': { min: 6, max: 32, recommended: { min: 8, max: 16 } },
  'groups-split-bracket': { min: 8, max: 32, recommended: { min: 12, max: 20 } },
  'groups-ssvb-knockout': { min: 8, max: 32, recommended: { min: 12, max: 16 } },
  'placement-tree': { min: 2, max: 32, recommended: { min: 4, max: 16 } },
  // Legacy names
  'playoff': { min: 2, max: 12, recommended: { min: 4, max: 8 } },
  'group-phase': { min: 6, max: 40, recommended: { min: 8, max: 24 } },
  'beachl-all-placements': { min: 6, max: 32, recommended: { min: 8, max: 16 } },
  'beachl-short-main': { min: 8, max: 32, recommended: { min: 12, max: 20 } },
  'knockout': { min: 8, max: 32, recommended: { min: 12, max: 16 } },
};

/**
 * Maximum groups allowed
 */
export const MAX_GROUPS = 8;

/**
 * Minimum groups allowed
 */
export const MIN_GROUPS = 2;

// =============================================================================
// TOURNAMENT VALIDATOR
// =============================================================================

/**
 * Tournament Validator class
 */
export class TournamentValidator {
  /**
   * Validate complete tournament configuration
   */
  validateConfig(config: TournamentConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate team count
    const teamCountResult = this.validateTeamCount(config.system, config.teamCount);
    errors.push(...teamCountResult.errors);
    warnings.push(...teamCountResult.warnings);

    // Validate courts
    if (config.numberOfCourts < 1) {
      errors.push('Must have at least 1 court');
    } else if (config.numberOfCourts > 10) {
      warnings.push('More than 10 courts is unusual');
    }

    // Validate sets per match
    if (![1, 2, 3].includes(config.setsPerMatch)) {
      errors.push('Sets per match must be 1, 2, or 3');
    }

    // Validate points per set
    if (config.pointsPerSet < 1 || config.pointsPerSet > 30) {
      errors.push('Points per set must be between 1 and 30');
    }

    // Validate group configuration if applicable
    if (isGroupBasedSystem(config.system) && config.numberOfGroups && config.teamsPerGroup) {
      const groupResult = this.validateGroupConfig(
        config.teamCount,
        config.numberOfGroups,
        config.teamsPerGroup
      );
      errors.push(...groupResult.errors);
      warnings.push(...groupResult.warnings);
    }

    // Validate Swiss rounds if applicable
    if (config.system === 'swiss' && config.swissRounds) {
      const swissResult = this.validateSwissRounds(config.teamCount, config.swissRounds);
      errors.push(...swissResult.errors);
      warnings.push(...swissResult.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate team count for a tournament system
   */
  validateTeamCount(system: TournamentSystem, teamCount: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const constraints = TEAM_COUNT_CONSTRAINTS[system];

    if (!constraints) {
      errors.push(`Unknown tournament system: ${system}`);
      return { valid: false, errors, warnings };
    }

    if (teamCount < constraints.min) {
      errors.push(`${system} requires at least ${constraints.min} teams`);
    }

    if (teamCount > constraints.max) {
      errors.push(`${system} supports maximum ${constraints.max} teams`);
    }

    if (constraints.recommended) {
      if (teamCount < constraints.recommended.min) {
        warnings.push(`${system} works best with at least ${constraints.recommended.min} teams`);
      }
      if (teamCount > constraints.recommended.max) {
        warnings.push(`${system} works best with at most ${constraints.recommended.max} teams`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate group configuration
   */
  validateGroupConfig(
    teamCount: number,
    numberOfGroups: number,
    teamsPerGroup: 3 | 4 | 5
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check group count
    if (numberOfGroups < MIN_GROUPS) {
      errors.push(`Minimum ${MIN_GROUPS} groups required`);
    }
    if (numberOfGroups > MAX_GROUPS) {
      errors.push(`Maximum ${MAX_GROUPS} groups allowed`);
    }
    if (numberOfGroups % 2 !== 0) {
      errors.push('Group-based systems require an even number of groups');
    }

    // Check if teams fit
    const minTeams = numberOfGroups * (teamsPerGroup - 1) + 1;
    const maxTeams = numberOfGroups * teamsPerGroup;

    if (teamCount < minTeams) {
      errors.push(`Not enough teams for ${numberOfGroups} groups of ${teamsPerGroup}`);
    }
    if (teamCount > maxTeams) {
      errors.push(`Too many teams for ${numberOfGroups} groups of ${teamsPerGroup}`);
    }

    // Check for even distribution
    const totalSlots = numberOfGroups * teamsPerGroup;
    const byesNeeded = totalSlots - teamCount;

    if (byesNeeded > 0) {
      if (byesNeeded >= teamsPerGroup) {
        errors.push('Too many byes would result in empty groups');
      } else {
        warnings.push(`${byesNeeded} bye${byesNeeded > 1 ? 's' : ''} needed for even groups`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Swiss round count
   */
  validateSwissRounds(teamCount: number, rounds: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const minRounds = 1;
    const maxRounds = teamCount - 1; // Can't have more rounds than opponents

    if (rounds < minRounds) {
      errors.push('Swiss system requires at least 1 round');
    }
    if (rounds > maxRounds) {
      errors.push(`Cannot have more than ${maxRounds} rounds with ${teamCount} teams`);
    }

    // Recommended rounds
    const recommendedRounds = Math.ceil(Math.log2(teamCount)) + 1;
    if (rounds < recommendedRounds - 1) {
      warnings.push(`Consider at least ${recommendedRounds - 1} rounds for better ranking`);
    }
    if (rounds > recommendedRounds + 1) {
      warnings.push(`${rounds} rounds may be more than necessary`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate optimal group configuration
   */
  calculateGroupConfig(
    teamCount: number,
    teamsPerGroup: 3 | 4 | 5
  ): GroupConfigResult {
    const minGroups = MIN_GROUPS;
    const maxGroups = MAX_GROUPS;
    const minTeams = teamsPerGroup * minGroups;
    const maxTeams = teamsPerGroup * maxGroups;

    if (teamCount < minTeams) {
      return {
        valid: false,
        numberOfGroups: 0,
        teamsPerGroup,
        byesNeeded: 0,
        totalSlots: 0,
        error: `Minimum ${minTeams} teams required for ${teamsPerGroup}-team groups`,
      };
    }

    if (teamCount > maxTeams) {
      return {
        valid: false,
        numberOfGroups: 0,
        teamsPerGroup,
        byesNeeded: 0,
        totalSlots: 0,
        error: `Maximum ${maxTeams} teams supported (${maxGroups} groups)`,
      };
    }

    let numberOfGroups = Math.ceil(teamCount / teamsPerGroup);
    if (numberOfGroups % 2 !== 0) {
      numberOfGroups += 1;
    }

    if (numberOfGroups > maxGroups) {
      return {
        valid: false,
        numberOfGroups: 0,
        teamsPerGroup,
        byesNeeded: 0,
        totalSlots: 0,
        error: `Maximum ${maxTeams} teams supported (${maxGroups} groups)`,
      };
    }

    const totalSlots = numberOfGroups * teamsPerGroup;
    const byesNeeded = totalSlots - teamCount;
    if (byesNeeded >= teamsPerGroup) {
      return {
        valid: false,
        numberOfGroups: 0,
        teamsPerGroup,
        byesNeeded: 0,
        totalSlots: 0,
        error: `Invalid configuration for ${teamCount} teams (even group count required)`,
      };
    }

    return {
      valid: true,
      numberOfGroups,
      teamsPerGroup,
      byesNeeded,
      totalSlots,
    };
  }

  /**
   * Check if tournament state allows a specific action
   */
  canPerformAction(
    action: 'start' | 'score' | 'advance' | 'complete',
    state: {
      status: 'configuration' | 'in-progress' | 'completed';
      hasTeams: boolean;
      hasMatches: boolean;
      allMatchesComplete?: boolean;
    }
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (action) {
      case 'start':
        if (state.status !== 'configuration') {
          errors.push('Tournament has already started');
        }
        if (!state.hasTeams) {
          errors.push('Cannot start tournament without teams');
        }
        break;

      case 'score':
        if (state.status === 'configuration') {
          errors.push('Tournament has not started');
        }
        if (state.status === 'completed') {
          warnings.push('Tournament is already completed');
        }
        if (!state.hasMatches) {
          errors.push('No matches to score');
        }
        break;

      case 'advance':
        if (state.status !== 'in-progress') {
          errors.push('Tournament must be in progress to advance phases');
        }
        break;

      case 'complete':
        if (state.status !== 'in-progress') {
          errors.push('Tournament must be in progress to complete');
        }
        if (!state.allMatchesComplete) {
          warnings.push('Not all matches are complete');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get constraints for a tournament system
   */
  getConstraints(system: TournamentSystem): TeamCountConstraints | null {
    return TEAM_COUNT_CONSTRAINTS[system] ?? null;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a tournament validator
 */
export function createTournamentValidator(): TournamentValidator {
  return new TournamentValidator();
}

/**
 * Quick validation of tournament config
 */
export function validateTournamentConfig(config: TournamentConfig): ValidationResult {
  const validator = new TournamentValidator();
  return validator.validateConfig(config);
}

/**
 * Quick team count validation
 */
export function validateTeamCount(
  system: TournamentSystem,
  teamCount: number
): ValidationResult {
  const validator = new TournamentValidator();
  return validator.validateTeamCount(system, teamCount);
}

/**
 * Get team count constraints for a system
 */
export function getTeamCountConstraints(system: TournamentSystem): TeamCountConstraints | null {
  return TEAM_COUNT_CONSTRAINTS[system] ?? null;
}

/**
 * Calculate optimal group configuration
 */
export function calculateOptimalGroupConfig(
  teamCount: number,
  teamsPerGroup: 3 | 4 | 5
): GroupConfigResult {
  const validator = new TournamentValidator();
  return validator.calculateGroupConfig(teamCount, teamsPerGroup);
}
