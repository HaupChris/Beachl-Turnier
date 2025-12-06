import { v4 as uuidv4 } from 'uuid';
import type { Match, StandingEntry } from '../types/tournament';

/**
 * Generates playoff matches where adjacent teams in standings play each other
 * for final placement (1st vs 2nd for place 1, 3rd vs 4th for place 3, etc.)
 */
export function generatePlayoffMatches(
  standings: StandingEntry[],
  existingMatches: Match[],
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];

  // Find the next round number
  const maxRound = existingMatches.length > 0
    ? Math.max(...existingMatches.map(m => m.round))
    : 0;
  const playoffRound = maxRound + 1;

  // Pair adjacent teams: 1st vs 2nd, 3rd vs 4th, etc.
  for (let i = 0; i < standings.length - 1; i += 2) {
    const teamA = standings[i];
    const teamB = standings[i + 1];

    const matchNumber = matches.length + 1;
    const courtNumber = numberOfCourts > 0
      ? ((matchNumber - 1) % numberOfCourts) + 1
      : null;

    matches.push({
      id: uuidv4(),
      round: playoffRound,
      matchNumber,
      teamAId: teamA.teamId,
      teamBId: teamB.teamId,
      courtNumber,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      isPlayoff: true,
      playoffForPlace: i + 1, // 1st place match, 3rd place match, etc.
    });
  }

  return matches;
}

/**
 * Returns the label for a playoff match based on the place being contested
 */
export function getPlayoffMatchLabel(playoffForPlace: number): string {
  const place1 = playoffForPlace;
  const place2 = playoffForPlace + 1;
  return `Spiel um Platz ${place1}/${place2}`;
}
