/**
 * Tests for Tournament Validator
 *
 * These tests verify that:
 * 1. Team count validation works for all systems
 * 2. Group configuration validation is accurate
 * 3. Swiss round validation is correct
 * 4. State transition validation works
 */

import { describe, it, expect } from 'vitest';
import {
  TournamentValidator,
  createTournamentValidator,
  validateTournamentConfig,
  validateTeamCount,
  getTeamCountConstraints,
  calculateOptimalGroupConfig,
  TEAM_COUNT_CONSTRAINTS,
  type TournamentConfig,
} from '../TournamentValidator';

// =============================================================================
// TEAM COUNT VALIDATION TESTS
// =============================================================================

describe('TournamentValidator - Team Count', () => {
  const validator = new TournamentValidator();

  describe('round-robin', () => {
    it('accepts valid team count', () => {
      const result = validator.validateTeamCount('round-robin', 6);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects too few teams', () => {
      const result = validator.validateTeamCount('round-robin', 1);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
    });

    it('rejects too many teams', () => {
      const result = validator.validateTeamCount('round-robin', 20);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('maximum'))).toBe(true);
    });

    it('warns about non-optimal team count', () => {
      const result = validator.validateTeamCount('round-robin', 2);
      expect(result.warnings.some((w) => w.includes('best with'))).toBe(true);
    });
  });

  describe('swiss', () => {
    it('accepts valid team count', () => {
      const result = validator.validateTeamCount('swiss', 16);
      expect(result.valid).toBe(true);
    });

    it('accepts large team count', () => {
      const result = validator.validateTeamCount('swiss', 32);
      expect(result.valid).toBe(true);
    });

    it('rejects too few teams', () => {
      const result = validator.validateTeamCount('swiss', 2);
      expect(result.valid).toBe(false);
    });
  });

  describe('group-based systems', () => {
    it.each([
      ['groups-only', 8],
      ['groups-full-placement', 12],
      ['groups-split-bracket', 16],
      ['groups-ssvb-knockout', 16],
    ])('%s accepts %d teams', (system, teamCount) => {
      const result = validator.validateTeamCount(system as any, teamCount);
      expect(result.valid).toBe(true);
    });

    it('rejects too few teams for groups', () => {
      const result = validator.validateTeamCount('groups-only', 4);
      expect(result.valid).toBe(false);
    });
  });

  describe('legacy system names', () => {
    it.each([
      ['playoff', 6],
      ['group-phase', 12],
      ['beachl-all-placements', 16],
      ['beachl-short-main', 16],
      ['knockout', 12],
    ])('%s accepts %d teams', (system, teamCount) => {
      const result = validator.validateTeamCount(system as any, teamCount);
      expect(result.valid).toBe(true);
    });
  });

  describe('unknown system', () => {
    it('rejects unknown system', () => {
      const result = validator.validateTeamCount('unknown-system' as any, 10);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unknown'))).toBe(true);
    });
  });
});

// =============================================================================
// GROUP CONFIGURATION TESTS
// =============================================================================

describe('TournamentValidator - Group Configuration', () => {
  const validator = new TournamentValidator();

  describe('validateGroupConfig', () => {
    it('validates correct 4-group configuration', () => {
      const result = validator.validateGroupConfig(16, 4, 4);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates configuration with byes', () => {
      const result = validator.validateGroupConfig(14, 4, 4);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('bye'))).toBe(true);
    });

    it('rejects too few groups', () => {
      const result = validator.validateGroupConfig(8, 1, 4);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Minimum'))).toBe(true);
    });

    it('rejects too many groups', () => {
      const result = validator.validateGroupConfig(40, 10, 4);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Maximum'))).toBe(true);
    });

    it('rejects not enough teams', () => {
      const result = validator.validateGroupConfig(6, 4, 4);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Not enough teams'))).toBe(true);
    });

    it('rejects too many byes', () => {
      // 4 teams in 2 groups of 4 = 8 slots, 4 byes (entire group would be empty)
      const result = validator.validateGroupConfig(4, 2, 4);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty groups'))).toBe(true);
    });
  });

  describe('calculateGroupConfig', () => {
    it.each([
      [16, 4, { numberOfGroups: 4, byesNeeded: 0 }],
      [14, 4, { numberOfGroups: 4, byesNeeded: 2 }],
      [12, 3, { numberOfGroups: 4, byesNeeded: 0 }],
      [18, 3, { numberOfGroups: 6, byesNeeded: 0 }],
      [20, 5, { numberOfGroups: 4, byesNeeded: 0 }],
    ])('%d teams, %d per group', (teamCount, teamsPerGroup, expected) => {
      const result = validator.calculateGroupConfig(teamCount, teamsPerGroup as 3 | 4 | 5);
      expect(result.valid).toBe(true);
      expect(result.numberOfGroups).toBe(expected.numberOfGroups);
      expect(result.byesNeeded).toBe(expected.byesNeeded);
    });

    it('rejects configurations that require too many byes due to even groups', () => {
      const result = validator.calculateGroupConfig(12, 4);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('even group count');
    });

    it('rejects too few teams', () => {
      const result = validator.calculateGroupConfig(4, 4);
      expect(result.valid).toBe(false);
    });

    it('rejects too many teams', () => {
      const result = validator.calculateGroupConfig(50, 4);
      expect(result.valid).toBe(false);
    });
  });
});

// =============================================================================
// SWISS VALIDATION TESTS
// =============================================================================

describe('TournamentValidator - Swiss Rounds', () => {
  const validator = new TournamentValidator();

  describe('validateSwissRounds', () => {
    it('accepts valid round count', () => {
      const result = validator.validateSwissRounds(16, 4);
      expect(result.valid).toBe(true);
    });

    it('rejects too few rounds', () => {
      const result = validator.validateSwissRounds(16, 0);
      expect(result.valid).toBe(false);
    });

    it('rejects too many rounds', () => {
      const result = validator.validateSwissRounds(8, 10);
      expect(result.valid).toBe(false);
    });

    it('warns about few rounds', () => {
      const result = validator.validateSwissRounds(16, 2);
      expect(result.warnings.some((w) => w.includes('Consider'))).toBe(true);
    });

    it('warns about many rounds', () => {
      const result = validator.validateSwissRounds(8, 7);
      expect(result.warnings.some((w) => w.includes('more than necessary'))).toBe(true);
    });
  });
});

// =============================================================================
// CONFIG VALIDATION TESTS
// =============================================================================

describe('TournamentValidator - Full Config', () => {
  const validator = new TournamentValidator();

  describe('validateConfig', () => {
    it('validates complete valid config', () => {
      const config: TournamentConfig = {
        system: 'round-robin',
        teamCount: 8,
        numberOfCourts: 2,
        setsPerMatch: 2,
        pointsPerSet: 21,
      };
      const result = validator.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('validates group-based config', () => {
      const config: TournamentConfig = {
        system: 'groups-full-placement',
        teamCount: 16,
        numberOfCourts: 4,
        setsPerMatch: 2,
        pointsPerSet: 21,
        numberOfGroups: 4,
        teamsPerGroup: 4,
      };
      const result = validator.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid courts', () => {
      const config: TournamentConfig = {
        system: 'round-robin',
        teamCount: 8,
        numberOfCourts: 0,
        setsPerMatch: 2,
        pointsPerSet: 21,
      };
      const result = validator.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('court'))).toBe(true);
    });

    it('rejects invalid sets per match', () => {
      const config: TournamentConfig = {
        system: 'round-robin',
        teamCount: 8,
        numberOfCourts: 2,
        setsPerMatch: 5,
        pointsPerSet: 21,
      };
      const result = validator.validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it('rejects invalid points per set', () => {
      const config: TournamentConfig = {
        system: 'round-robin',
        teamCount: 8,
        numberOfCourts: 2,
        setsPerMatch: 2,
        pointsPerSet: 0,
      };
      const result = validator.validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it('warns about many courts', () => {
      const config: TournamentConfig = {
        system: 'round-robin',
        teamCount: 8,
        numberOfCourts: 15,
        setsPerMatch: 2,
        pointsPerSet: 21,
      };
      const result = validator.validateConfig(config);
      expect(result.warnings.some((w) => w.includes('unusual'))).toBe(true);
    });
  });
});

// =============================================================================
// STATE TRANSITION TESTS
// =============================================================================

describe('TournamentValidator - State Transitions', () => {
  const validator = new TournamentValidator();

  describe('canPerformAction', () => {
    describe('start action', () => {
      it('allows start in configuration state', () => {
        const result = validator.canPerformAction('start', {
          status: 'configuration',
          hasTeams: true,
          hasMatches: false,
        });
        expect(result.valid).toBe(true);
      });

      it('rejects start without teams', () => {
        const result = validator.canPerformAction('start', {
          status: 'configuration',
          hasTeams: false,
          hasMatches: false,
        });
        expect(result.valid).toBe(false);
      });

      it('rejects start when already started', () => {
        const result = validator.canPerformAction('start', {
          status: 'in-progress',
          hasTeams: true,
          hasMatches: true,
        });
        expect(result.valid).toBe(false);
      });
    });

    describe('score action', () => {
      it('allows scoring in progress', () => {
        const result = validator.canPerformAction('score', {
          status: 'in-progress',
          hasTeams: true,
          hasMatches: true,
        });
        expect(result.valid).toBe(true);
      });

      it('rejects scoring before start', () => {
        const result = validator.canPerformAction('score', {
          status: 'configuration',
          hasTeams: true,
          hasMatches: false,
        });
        expect(result.valid).toBe(false);
      });

      it('warns about scoring completed tournament', () => {
        const result = validator.canPerformAction('score', {
          status: 'completed',
          hasTeams: true,
          hasMatches: true,
        });
        expect(result.warnings.some((w) => w.includes('completed'))).toBe(true);
      });
    });

    describe('advance action', () => {
      it('allows advance in progress', () => {
        const result = validator.canPerformAction('advance', {
          status: 'in-progress',
          hasTeams: true,
          hasMatches: true,
        });
        expect(result.valid).toBe(true);
      });

      it('rejects advance before start', () => {
        const result = validator.canPerformAction('advance', {
          status: 'configuration',
          hasTeams: true,
          hasMatches: false,
        });
        expect(result.valid).toBe(false);
      });
    });

    describe('complete action', () => {
      it('allows completion with all matches done', () => {
        const result = validator.canPerformAction('complete', {
          status: 'in-progress',
          hasTeams: true,
          hasMatches: true,
          allMatchesComplete: true,
        });
        expect(result.valid).toBe(true);
      });

      it('warns about incomplete matches', () => {
        const result = validator.canPerformAction('complete', {
          status: 'in-progress',
          hasTeams: true,
          hasMatches: true,
          allMatchesComplete: false,
        });
        expect(result.warnings.some((w) => w.includes('Not all matches'))).toBe(true);
      });
    });
  });
});

// =============================================================================
// CONVENIENCE FUNCTION TESTS
// =============================================================================

describe('Convenience Functions', () => {
  describe('createTournamentValidator', () => {
    it('creates validator instance', () => {
      const validator = createTournamentValidator();
      expect(validator).toBeInstanceOf(TournamentValidator);
    });
  });

  describe('validateTournamentConfig', () => {
    it('validates config directly', () => {
      const result = validateTournamentConfig({
        system: 'swiss',
        teamCount: 16,
        numberOfCourts: 4,
        setsPerMatch: 2,
        pointsPerSet: 21,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTeamCount', () => {
    it('validates team count directly', () => {
      const result = validateTeamCount('round-robin', 8);
      expect(result.valid).toBe(true);
    });
  });

  describe('getTeamCountConstraints', () => {
    it('returns constraints for known system', () => {
      const constraints = getTeamCountConstraints('swiss');
      expect(constraints).not.toBeNull();
      expect(constraints?.min).toBe(4);
    });

    it('returns null for unknown system', () => {
      const constraints = getTeamCountConstraints('unknown' as any);
      expect(constraints).toBeNull();
    });
  });

  describe('calculateOptimalGroupConfig', () => {
    it('calculates config directly', () => {
      const config = calculateOptimalGroupConfig(16, 4);
      expect(config.valid).toBe(true);
      expect(config.numberOfGroups).toBe(4);
    });
  });
});

// =============================================================================
// CONSTRAINT TESTS
// =============================================================================

describe('TEAM_COUNT_CONSTRAINTS', () => {
  it('has constraints for all standard systems', () => {
    const systems = [
      'round-robin',
      'round-robin-playoff',
      'swiss',
      'groups-only',
      'groups-full-placement',
      'groups-split-bracket',
      'groups-ssvb-knockout',
      'placement-tree',
    ];

    for (const system of systems) {
      expect(TEAM_COUNT_CONSTRAINTS[system]).toBeDefined();
      expect(TEAM_COUNT_CONSTRAINTS[system].min).toBeGreaterThan(0);
    }
  });

  it('has recommended ranges', () => {
    expect(TEAM_COUNT_CONSTRAINTS['round-robin'].recommended).toBeDefined();
    expect(TEAM_COUNT_CONSTRAINTS['swiss'].recommended).toBeDefined();
  });
});
