/**
 * Tests for Score Validator
 *
 * These tests verify that:
 * 1. Valid volleyball scores are accepted
 * 2. Invalid scores are rejected with proper error messages
 * 3. Best-of-3 logic works correctly
 * 4. Match winner determination is accurate
 */

import { describe, it, expect } from 'vitest';
import {
  ScoreValidator,
  createScoreValidator,
  validateMatchScores,
  validateSetScore,
  determineMatchWinner,
  type SetScore,
} from '../ScoreValidator';

// =============================================================================
// SET VALIDATION TESTS
// =============================================================================

describe('ScoreValidator - Set Validation', () => {
  const validator = new ScoreValidator();

  describe('valid sets', () => {
    it.each([
      [{ teamA: 21, teamB: 15 }, 21, 'standard win'],
      [{ teamA: 21, teamB: 19 }, 21, 'close game'],
      [{ teamA: 15, teamB: 21 }, 21, 'team B wins'],
      [{ teamA: 25, teamB: 23 }, 21, 'extended set'],
      [{ teamA: 23, teamB: 25 }, 21, 'extended set B wins'],
      [{ teamA: 15, teamB: 10 }, 15, '15-point set'],
      [{ teamA: 17, teamB: 15 }, 15, '15-point extended'],
    ])('accepts %o with target %d (%s)', (score, target, _desc) => {
      const result = validator.validateSet(score, 0, target, 2);
      expect(result.valid).toBe(true);
      expect(result.winner).not.toBeNull();
    });

    it('accepts empty set (0:0)', () => {
      const result = validator.validateSet({ teamA: 0, teamB: 0 }, 0, 21, 2);
      expect(result.valid).toBe(true);
      expect(result.winner).toBeNull();
    });
  });

  describe('invalid sets', () => {
    it('rejects draws', () => {
      const result = validator.validateSet({ teamA: 21, teamB: 21 }, 0, 21, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Draws are not allowed');
    });

    it('rejects winner not reaching target', () => {
      const result = validator.validateSet({ teamA: 20, teamB: 18 }, 0, 21, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must reach at least 21 points');
    });

    it('rejects insufficient margin at target', () => {
      const result = validator.validateSet({ teamA: 21, teamB: 20 }, 0, 21, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2-point margin');
    });

    it('rejects wrong margin in extended set', () => {
      const result = validator.validateSet({ teamA: 25, teamB: 22 }, 0, 21, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('margin must be exactly 2');
    });

    it('rejects negative scores', () => {
      const result = validator.validateSet({ teamA: -1, teamB: 21 }, 0, 21, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-negative integer');
    });
  });

  describe('winner determination', () => {
    it('correctly identifies team A as winner', () => {
      const result = validator.validateSet({ teamA: 21, teamB: 15 }, 0, 21, 2);
      expect(result.winner).toBe('A');
    });

    it('correctly identifies team B as winner', () => {
      const result = validator.validateSet({ teamA: 15, teamB: 21 }, 0, 21, 2);
      expect(result.winner).toBe('B');
    });
  });
});

// =============================================================================
// MATCH VALIDATION TESTS
// =============================================================================

describe('ScoreValidator - Match Validation', () => {
  describe('two-set format', () => {
    const validator = new ScoreValidator({ setsPerMatch: 2, pointsPerSet: 21 });

    it('validates complete 2-0 match', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 21, teamB: 18 },
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(true);
      expect(result.setsWonA).toBe(2);
      expect(result.setsWonB).toBe(0);
      expect(result.matchWinner).toBe('A');
      expect(result.isComplete).toBe(true);
    });

    it('validates complete 1-1 split', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 15, teamB: 21 },
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(true);
      expect(result.setsWonA).toBe(1);
      expect(result.setsWonB).toBe(1);
      expect(result.matchWinner).toBeNull(); // No winner in 2-set split
      expect(result.isComplete).toBe(false);
    });
  });

  describe('best-of-3 format', () => {
    const validator = new ScoreValidator({
      setsPerMatch: 3,
      pointsPerSet: 21,
      pointsPerThirdSet: 15,
    });

    it('validates 2-0 win (no third set needed)', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 21, teamB: 18 },
        { teamA: 0, teamB: 0 },
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(true);
      expect(result.setsWonA).toBe(2);
      expect(result.matchWinner).toBe('A');
      expect(result.isComplete).toBe(true);
    });

    it('validates 2-1 win with third set', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 18, teamB: 21 },
        { teamA: 15, teamB: 12 },
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(true);
      expect(result.setsWonA).toBe(2);
      expect(result.setsWonB).toBe(1);
      expect(result.matchWinner).toBe('A');
      expect(result.isComplete).toBe(true);
    });

    it('rejects unnecessary third set', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 21, teamB: 18 },
        { teamA: 15, teamB: 10 }, // Unnecessary!
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('unnecessary'))).toBe(true);
    });

    it('uses correct point target for third set', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 18, teamB: 21 },
        { teamA: 15, teamB: 12 }, // 15-point third set
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(true);
      expect(result.setResults[2].valid).toBe(true);
    });

    it('rejects third set with wrong point target', () => {
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 18, teamB: 21 },
        { teamA: 14, teamB: 12 }, // Neither reached 15!
      ];
      const result = validator.validateMatch(scores);

      expect(result.valid).toBe(false);
    });
  });

  describe('getRequiredSetsCount', () => {
    it('returns 2 for 2-set format', () => {
      const validator = new ScoreValidator({ setsPerMatch: 2 });
      expect(validator.getRequiredSetsCount([])).toBe(2);
    });

    it('returns 2 for best-of-3 when first two sets have same winner', () => {
      const validator = new ScoreValidator({ setsPerMatch: 3 });
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 21, teamB: 18 },
      ];
      expect(validator.getRequiredSetsCount(scores)).toBe(2);
    });

    it('returns 3 for best-of-3 when sets are split', () => {
      const validator = new ScoreValidator({ setsPerMatch: 3 });
      const scores: SetScore[] = [
        { teamA: 21, teamB: 15 },
        { teamA: 18, teamB: 21 },
      ];
      expect(validator.getRequiredSetsCount(scores)).toBe(3);
    });
  });
});

// =============================================================================
// CONVENIENCE FUNCTION TESTS
// =============================================================================

describe('Convenience Functions', () => {
  describe('createScoreValidator', () => {
    it('creates validator with defaults', () => {
      const validator = createScoreValidator();
      expect(validator).toBeInstanceOf(ScoreValidator);
    });

    it('creates validator with custom format', () => {
      const validator = createScoreValidator({ setsPerMatch: 3 });
      expect(validator.getRequiredSetsCount([])).toBe(3);
    });
  });

  describe('validateMatchScores', () => {
    it('validates scores directly', () => {
      const result = validateMatchScores([
        { teamA: 21, teamB: 15 },
        { teamA: 21, teamB: 18 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.matchWinner).toBe('A');
    });
  });

  describe('validateSetScore', () => {
    it('validates single set', () => {
      const result = validateSetScore({ teamA: 21, teamB: 15 }, 21, 2);
      expect(result.valid).toBe(true);
      expect(result.winner).toBe('A');
    });
  });

  describe('determineMatchWinner', () => {
    it('determines winner from scores', () => {
      const winner = determineMatchWinner([
        { teamA: 15, teamB: 21 },
        { teamA: 18, teamB: 21 },
      ]);
      expect(winner).toBe('B');
    });

    it('returns null for incomplete match', () => {
      const winner = determineMatchWinner([
        { teamA: 21, teamB: 15 },
        { teamA: 15, teamB: 21 },
      ]);
      expect(winner).toBeNull();
    });
  });
});

// =============================================================================
// INPUT VALIDATION TESTS
// =============================================================================

describe('ScoreValidator - Input Validation', () => {
  const validator = new ScoreValidator();

  describe('validateScoreInputs', () => {
    it('accepts valid inputs', () => {
      const result = validator.validateScoreInputs([
        { teamA: 21, teamB: 15 },
        { teamA: 0, teamB: 0 },
      ]);
      expect(result.valid).toBe(true);
    });

    it('rejects negative inputs', () => {
      const result = validator.validateScoreInputs([{ teamA: -1, teamB: 15 }]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects non-integer inputs', () => {
      const result = validator.validateScoreInputs([{ teamA: 21.5, teamB: 15 }]);
      expect(result.valid).toBe(false);
    });
  });

  describe('isPartiallyValid', () => {
    it('accepts empty score', () => {
      expect(validator.isPartiallyValid({ teamA: 0, teamB: 0 }, 21)).toBe(true);
    });

    it('accepts score in progress', () => {
      expect(validator.isPartiallyValid({ teamA: 15, teamB: 12 }, 21)).toBe(true);
    });

    it('rejects extremely high scores', () => {
      expect(validator.isPartiallyValid({ teamA: 100, teamB: 50 }, 21)).toBe(false);
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('ScoreValidator - Edge Cases', () => {
  it('handles empty score array', () => {
    const validator = new ScoreValidator();
    const result = validator.validateMatch([]);
    expect(result.setsWonA).toBe(0);
    expect(result.setsWonB).toBe(0);
    expect(result.matchWinner).toBeNull();
  });

  it('handles single set format', () => {
    const validator = new ScoreValidator({ setsPerMatch: 1, pointsPerSet: 21 });
    const result = validator.validateMatch([{ teamA: 21, teamB: 15 }]);
    expect(result.valid).toBe(true);
    expect(result.matchWinner).toBe('A');
    expect(result.isComplete).toBe(true);
  });

  it('handles 15-point format', () => {
    const validator = new ScoreValidator({ setsPerMatch: 2, pointsPerSet: 15 });
    const result = validator.validateMatch([
      { teamA: 15, teamB: 10 },
      { teamA: 15, teamB: 13 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.matchWinner).toBe('A');
  });

  it('handles very extended sets', () => {
    const validator = new ScoreValidator();
    const result = validator.validateSet({ teamA: 35, teamB: 33 }, 0, 21, 2);
    expect(result.valid).toBe(true);
    expect(result.winner).toBe('A');
  });
});
