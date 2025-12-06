import type { SetScore } from '../types/tournament';

export function validateScores(scores: SetScore[], pointsLimit: number): string | null {
  for (let i = 0; i < scores.length; i++) {
    const { teamA, teamB } = scores[i];
    const maxScore = Math.max(teamA, teamB);
    const minScore = Math.min(teamA, teamB);

    if (maxScore < pointsLimit) {
      return `Satz ${i + 1}: Mindestens ein Team muss ${pointsLimit} Punkte erreichen.`;
    }

    if (maxScore === pointsLimit && minScore > pointsLimit - 2) {
      return `Satz ${i + 1}: Bei ${pointsLimit}:${minScore} muss mit 2 Punkten Vorsprung gewonnen werden.`;
    }

    if (maxScore > pointsLimit && (maxScore - minScore) !== 2) {
      return `Satz ${i + 1}: Nach ${pointsLimit} Punkten muss mit genau 2 Punkten Vorsprung gewonnen werden.`;
    }

    if (teamA === teamB) {
      return `Satz ${i + 1}: Unentschieden ist nicht erlaubt.`;
    }
  }

  return null;
}
