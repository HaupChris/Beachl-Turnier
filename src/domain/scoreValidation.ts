import type { SetScore } from '../types/tournament';

interface ValidationOptions {
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
}

function isValidScoreValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function validateScoreInputs(scores: SetScore[]): string | null {
  for (let i = 0; i < scores.length; i++) {
    const { teamA, teamB } = scores[i];

    if (!isValidScoreValue(teamA)) {
      return `Satz ${i + 1}: Team A - Nur positive ganze Zahlen oder 0 erlaubt.`;
    }
    if (!isValidScoreValue(teamB)) {
      return `Satz ${i + 1}: Team B - Nur positive ganze Zahlen oder 0 erlaubt.`;
    }
  }
  return null;
}

function validateSingleSet(
  score: SetScore,
  setIndex: number,
  pointsLimit: number
): string | null {
  const { teamA, teamB } = score;
  const maxScore = Math.max(teamA, teamB);
  const minScore = Math.min(teamA, teamB);

  if (maxScore < pointsLimit) {
    return `Satz ${setIndex + 1}: Mindestens ein Team muss ${pointsLimit} Punkte erreichen.`;
  }

  if (maxScore === pointsLimit && minScore > pointsLimit - 2) {
    return `Satz ${setIndex + 1}: Bei ${pointsLimit}:${minScore} muss mit 2 Punkten Vorsprung gewonnen werden.`;
  }

  if (maxScore > pointsLimit && (maxScore - minScore) !== 2) {
    return `Satz ${setIndex + 1}: Nach ${pointsLimit} Punkten muss mit genau 2 Punkten Vorsprung gewonnen werden.`;
  }

  if (teamA === teamB) {
    return `Satz ${setIndex + 1}: Unentschieden ist nicht erlaubt.`;
  }

  return null;
}

export function validateScores(scores: SetScore[], pointsLimit: number): string | null {
  for (let i = 0; i < scores.length; i++) {
    const error = validateSingleSet(scores[i], i, pointsLimit);
    if (error) return error;
  }
  return null;
}

export function validateBestOfThreeScores(
  scores: SetScore[],
  options: ValidationOptions
): string | null {
  const { pointsPerSet, pointsPerThirdSet = 15 } = options;

  // Count sets won by each team
  let setsWonA = 0;
  let setsWonB = 0;

  // Validate entered sets
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    // Skip empty sets (0:0)
    if (score.teamA === 0 && score.teamB === 0) {
      continue;
    }

    // Use different point limit for third set
    const pointsLimit = i === 2 ? pointsPerThirdSet : pointsPerSet;
    const error = validateSingleSet(score, i, pointsLimit);
    if (error) return error;

    // Count set wins
    if (score.teamA > score.teamB) {
      setsWonA++;
    } else if (score.teamB > score.teamA) {
      setsWonB++;
    }
  }

  // Check if match is decided
  if (setsWonA < 2 && setsWonB < 2) {
    return 'Ein Team muss 2 Sätze gewinnen um das Match zu beenden.';
  }

  // Check for unnecessary third set
  const thirdSet = scores[2];
  if (thirdSet && (thirdSet.teamA > 0 || thirdSet.teamB > 0)) {
    // Third set was played - check if it was necessary
    const firstTwoSetsWonA = (scores[0].teamA > scores[0].teamB ? 1 : 0) +
      (scores[1].teamA > scores[1].teamB ? 1 : 0);
    const firstTwoSetsWonB = 2 - firstTwoSetsWonA;

    if (firstTwoSetsWonA === 2 || firstTwoSetsWonB === 2) {
      return 'Der 3. Satz ist nur nötig wenn nach 2 Sätzen 1:1 steht.';
    }
  }

  return null;
}

export function getRequiredSetsCount(scores: SetScore[], setsPerMatch: number): number {
  if (setsPerMatch !== 3) {
    return setsPerMatch;
  }

  // For Best of 3: check if first two sets decide the match
  if (scores.length >= 2) {
    const setsWonA = (scores[0].teamA > scores[0].teamB ? 1 : 0) +
      (scores[1].teamA > scores[1].teamB ? 1 : 0);
    const setsWonB = 2 - setsWonA;

    // If one team has 2 sets after 2 sets, no third set needed
    if (setsWonA === 2 || setsWonB === 2) {
      return 2;
    }
  }

  return 3; // Third set required
}
