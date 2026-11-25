/**
 * Score Validator
 *
 * Validates match scores according to volleyball rules:
 * - Points must be non-negative integers
 * - Winner must reach target points with 2-point margin
 * - Best-of-3 requires correct set count
 * - No draws allowed
 *
 * @see docs/tournament-modes-specification.md
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Set score (single set result)
 */
export interface SetScore {
  teamA: number;
  teamB: number;
}

/**
 * Match score format configuration
 */
export interface ScoreFormat {
  /** Number of sets (1, 2, or 3 for best-of-3) */
  setsPerMatch: number;
  /** Target points for regular sets (typically 21 or 25) */
  pointsPerSet: number;
  /** Target points for deciding set (typically 15) */
  pointsPerThirdSet?: number;
  /** Minimum point margin to win (typically 2) */
  minMargin?: number;
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
 * Detailed set validation result
 */
export interface SetValidationResult {
  setIndex: number;
  valid: boolean;
  winner: 'A' | 'B' | null;
  error?: string;
}

/**
 * Match validation result with winner determination
 */
export interface MatchValidationResult extends ValidationResult {
  setsWonA: number;
  setsWonB: number;
  matchWinner: 'A' | 'B' | null;
  setResults: SetValidationResult[];
  isComplete: boolean;
}

// =============================================================================
// SCORE VALIDATOR
// =============================================================================

/**
 * Default score format (2 sets of 21 points)
 */
export const DEFAULT_SCORE_FORMAT: ScoreFormat = {
  setsPerMatch: 2,
  pointsPerSet: 21,
  pointsPerThirdSet: 15,
  minMargin: 2,
};

/**
 * Score Validator class
 */
export class ScoreValidator {
  private format: ScoreFormat;

  constructor(format: Partial<ScoreFormat> = {}) {
    this.format = { ...DEFAULT_SCORE_FORMAT, ...format };
  }

  /**
   * Validate a complete match score
   */
  validateMatch(scores: SetScore[]): MatchValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const setResults: SetValidationResult[] = [];

    let setsWonA = 0;
    let setsWonB = 0;
    let matchWinner: 'A' | 'B' | null = null;

    const { setsPerMatch, pointsPerSet, pointsPerThirdSet, minMargin = 2 } = this.format;
    const isBestOfThree = setsPerMatch === 3;
    const setsToWin = isBestOfThree ? 2 : setsPerMatch;

    // Validate each set
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const isThirdSet = i === 2 && isBestOfThree;
      const targetPoints = isThirdSet ? (pointsPerThirdSet ?? 15) : pointsPerSet;

      const setResult = this.validateSet(score, i, targetPoints, minMargin);
      setResults.push(setResult);

      if (setResult.valid && setResult.winner) {
        if (setResult.winner === 'A') setsWonA++;
        else setsWonB++;
      }

      if (setResult.error) {
        errors.push(setResult.error);
      }
    }

    // Determine match winner
    if (setsWonA >= setsToWin) {
      matchWinner = 'A';
    } else if (setsWonB >= setsToWin) {
      matchWinner = 'B';
    }

    // Check if match is complete
    const isComplete = matchWinner !== null;

    // Check for unnecessary sets (best-of-3)
    if (isBestOfThree && scores.length === 3) {
      const firstTwoComplete = setResults[0].valid && setResults[1].valid;
      if (firstTwoComplete) {
        const setsAfterTwo = {
          A: (setResults[0].winner === 'A' ? 1 : 0) + (setResults[1].winner === 'A' ? 1 : 0),
          B: (setResults[0].winner === 'B' ? 1 : 0) + (setResults[1].winner === 'B' ? 1 : 0),
        };

        const thirdSetHasScore = scores[2].teamA > 0 || scores[2].teamB > 0;
        if ((setsAfterTwo.A === 2 || setsAfterTwo.B === 2) && thirdSetHasScore) {
          errors.push('Third set is unnecessary - match was decided after 2 sets');
        }
      }
    }

    // Check if not enough sets for match completion
    if (!isComplete && errors.length === 0) {
      if (isBestOfThree) {
        const validSets = setResults.filter((s) => s.valid).length;
        if (validSets < 2) {
          warnings.push('Match not complete - not enough valid sets');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      setsWonA,
      setsWonB,
      matchWinner,
      setResults,
      isComplete,
    };
  }

  /**
   * Validate a single set
   */
  validateSet(
    score: SetScore,
    setIndex: number,
    targetPoints: number,
    minMargin: number = 2
  ): SetValidationResult {
    const { teamA, teamB } = score;

    // Skip empty sets (0:0)
    if (teamA === 0 && teamB === 0) {
      return {
        setIndex,
        valid: true,
        winner: null,
      };
    }

    // Check for valid numbers
    if (!Number.isInteger(teamA) || teamA < 0) {
      return {
        setIndex,
        valid: false,
        winner: null,
        error: `Set ${setIndex + 1}: Team A score must be a non-negative integer`,
      };
    }

    if (!Number.isInteger(teamB) || teamB < 0) {
      return {
        setIndex,
        valid: false,
        winner: null,
        error: `Set ${setIndex + 1}: Team B score must be a non-negative integer`,
      };
    }

    // Check for draw
    if (teamA === teamB) {
      return {
        setIndex,
        valid: false,
        winner: null,
        error: `Set ${setIndex + 1}: Draws are not allowed`,
      };
    }

    const maxScore = Math.max(teamA, teamB);
    const minScore = Math.min(teamA, teamB);
    const winner: 'A' | 'B' = teamA > teamB ? 'A' : 'B';

    // Winner must reach target points
    if (maxScore < targetPoints) {
      return {
        setIndex,
        valid: false,
        winner: null,
        error: `Set ${setIndex + 1}: Winner must reach at least ${targetPoints} points`,
      };
    }

    // At exactly target points, margin must be at least minMargin
    if (maxScore === targetPoints && (maxScore - minScore) < minMargin) {
      return {
        setIndex,
        valid: false,
        winner: null,
        error: `Set ${setIndex + 1}: At ${targetPoints} points, winner must have ${minMargin}-point margin`,
      };
    }

    // Above target points, margin must be exactly minMargin
    if (maxScore > targetPoints && (maxScore - minScore) !== minMargin) {
      return {
        setIndex,
        valid: false,
        winner: null,
        error: `Set ${setIndex + 1}: Above ${targetPoints} points, margin must be exactly ${minMargin}`,
      };
    }

    return {
      setIndex,
      valid: true,
      winner,
    };
  }

  /**
   * Validate score input values (just numbers, not volleyball rules)
   */
  validateScoreInputs(scores: SetScore[]): ValidationResult {
    const errors: string[] = [];

    for (let i = 0; i < scores.length; i++) {
      const { teamA, teamB } = scores[i];

      if (!Number.isInteger(teamA) || teamA < 0) {
        errors.push(`Set ${i + 1}: Team A - only non-negative integers allowed`);
      }
      if (!Number.isInteger(teamB) || teamB < 0) {
        errors.push(`Set ${i + 1}: Team B - only non-negative integers allowed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Get required number of sets based on current scores
   */
  getRequiredSetsCount(scores: SetScore[]): number {
    const { setsPerMatch } = this.format;

    if (setsPerMatch !== 3) {
      return setsPerMatch;
    }

    // For Best of 3: check if first two sets decide the match
    if (scores.length >= 2) {
      const set1Winner = scores[0].teamA > scores[0].teamB ? 'A' : 'B';
      const set2Winner = scores[1].teamA > scores[1].teamB ? 'A' : 'B';

      if (set1Winner === set2Winner) {
        return 2; // Same winner for both sets - no third needed
      }
    }

    return 3; // Third set required
  }

  /**
   * Check if a score is potentially valid (for UI feedback)
   */
  isPartiallyValid(score: SetScore, targetPoints: number): boolean {
    const { teamA, teamB } = score;

    // Empty is valid
    if (teamA === 0 && teamB === 0) return true;

    // Both must be non-negative integers
    if (!Number.isInteger(teamA) || teamA < 0) return false;
    if (!Number.isInteger(teamB) || teamB < 0) return false;

    // At least one should be making progress toward target
    return teamA <= targetPoints + 10 && teamB <= targetPoints + 10;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a score validator with default format
 */
export function createScoreValidator(format?: Partial<ScoreFormat>): ScoreValidator {
  return new ScoreValidator(format);
}

/**
 * Quick validation of match scores
 */
export function validateMatchScores(
  scores: SetScore[],
  format?: Partial<ScoreFormat>
): MatchValidationResult {
  const validator = new ScoreValidator(format);
  return validator.validateMatch(scores);
}

/**
 * Quick validation of single set
 */
export function validateSetScore(
  score: SetScore,
  targetPoints: number = 21,
  minMargin: number = 2
): SetValidationResult {
  const validator = new ScoreValidator();
  return validator.validateSet(score, 0, targetPoints, minMargin);
}

/**
 * Determine match winner from scores
 */
export function determineMatchWinner(
  scores: SetScore[],
  format?: Partial<ScoreFormat>
): 'A' | 'B' | null {
  const result = validateMatchScores(scores, format);
  return result.matchWinner;
}
