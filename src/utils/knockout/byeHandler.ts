import type { Match } from '../../types/tournament';

/**
 * Handles matches where one side has a bye (missing team due to uneven groups)
 * Returns updated matches with auto-advances applied
 */
export function handleByeMatches(matches: Match[]): Match[] {
  const updatedMatches = [...matches];
  let changed = true;

  // Keep iterating until no more changes (for cascading byes)
  while (changed) {
    changed = false;
    for (let i = 0; i < updatedMatches.length; i++) {
      const match = updatedMatches[i];

      // Skip already completed matches
      if (match.status === 'completed') continue;

      // Check for bye situation: one team exists, other doesn't (and no dependency for missing team)
      const teamAIsBye = !match.teamAId && !match.dependsOn?.teamA;
      const teamBIsBye = !match.teamBId && !match.dependsOn?.teamB;

      if (teamAIsBye && match.teamBId) {
        // Team A is a bye, Team B auto-advances
        updatedMatches[i] = {
          ...match,
          winnerId: match.teamBId,
          status: 'completed',
          scores: [], // No actual match played
        };
        propagateWinner(updatedMatches, match.id, match.teamBId);
        changed = true;
      } else if (teamBIsBye && match.teamAId) {
        // Team B is a bye, Team A auto-advances
        updatedMatches[i] = {
          ...match,
          winnerId: match.teamAId,
          status: 'completed',
          scores: [], // No actual match played
        };
        propagateWinner(updatedMatches, match.id, match.teamAId);
        changed = true;
      }
    }
  }

  return updatedMatches;
}

/**
 * Propagates winner to dependent matches
 */
function propagateWinner(matches: Match[], matchId: string, winnerId: string): void {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match.dependsOn?.teamA?.matchId === matchId && match.dependsOn.teamA.result === 'winner') {
      matches[i] = { ...match, teamAId: winnerId };
    }
    if (match.dependsOn?.teamB?.matchId === matchId && match.dependsOn.teamB.result === 'winner') {
      matches[i] = { ...match, teamBId: winnerId };
    }
  }
}
