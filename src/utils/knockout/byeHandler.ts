import type { Match, SetScore } from '../../types/tournament';

/** Configuration for bye match scoring */
export interface ByeMatchConfig {
  setsPerMatch?: number;
  pointsPerSet?: number;
}

/** Default bye placeholder text */
const BYE_PLACEHOLDER = 'Freilos';

/**
 * Creates scores for a bye match where the real team wins by default
 * The bye (Freilos) gets 0 points in all sets
 */
function createByeScores(config: ByeMatchConfig, winnerIsTeamA: boolean): SetScore[] {
  const setsPerMatch = config.setsPerMatch || 1;
  const pointsPerSet = config.pointsPerSet || 21;

  // For best of 3, winner needs 2 sets
  const setsNeeded = setsPerMatch === 3 ? 2 : setsPerMatch;

  const scores: SetScore[] = [];
  for (let i = 0; i < setsNeeded; i++) {
    scores.push({
      teamA: winnerIsTeamA ? pointsPerSet : 0,
      teamB: winnerIsTeamA ? 0 : pointsPerSet,
    });
  }
  return scores;
}

/**
 * Handles matches where one side has a bye (missing team due to uneven groups)
 * Returns updated matches with auto-advances applied
 * Bye matches are marked with "Freilos" placeholder and scored appropriately
 */
export function handleByeMatches(matches: Match[], config: ByeMatchConfig = {}): Match[] {
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
          teamAPlaceholder: BYE_PLACEHOLDER,
          winnerId: match.teamBId,
          status: 'completed',
          scores: createByeScores(config, false), // Team B wins
        };
        propagateWinner(updatedMatches, match.id, match.teamBId);
        changed = true;
      } else if (teamBIsBye && match.teamAId) {
        // Team B is a bye, Team A auto-advances
        updatedMatches[i] = {
          ...match,
          teamBPlaceholder: BYE_PLACEHOLDER,
          winnerId: match.teamAId,
          status: 'completed',
          scores: createByeScores(config, true), // Team A wins
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
