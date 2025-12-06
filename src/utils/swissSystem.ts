import { v4 as uuidv4 } from 'uuid';
import type { Team, Match, StandingEntry } from '../types/tournament';

export function generateSwissRoundMatches(
  teams: Team[],
  standings: StandingEntry[],
  previousMatches: Match[],
  roundNumber: number,
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];

  // Sort teams by current standings (points, then tiebreakers)
  const sortedTeams = [...teams].sort((a, b) => {
    const standingA = standings.find(s => s.teamId === a.id);
    const standingB = standings.find(s => s.teamId === b.id);
    if (!standingA || !standingB) return 0;

    if (standingB.points !== standingA.points) return standingB.points - standingA.points;
    const setDiffA = standingA.setsWon - standingA.setsLost;
    const setDiffB = standingB.setsWon - standingB.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    return (standingB.pointsWon - standingB.pointsLost) - (standingA.pointsWon - standingA.pointsLost);
  });

  // Track which teams have already played each other
  const playedPairs = new Set<string>();
  previousMatches.forEach(m => {
    if (m.teamAId && m.teamBId) {
      playedPairs.add(`${m.teamAId}-${m.teamBId}`);
      playedPairs.add(`${m.teamBId}-${m.teamAId}`);
    }
  });

  // Greedy pairing: pair teams with similar standings who haven't played yet
  const paired = new Set<string>();
  const matchPairs: [Team, Team][] = [];

  for (let i = 0; i < sortedTeams.length; i++) {
    const teamA = sortedTeams[i];
    if (paired.has(teamA.id)) continue;

    for (let j = i + 1; j < sortedTeams.length; j++) {
      const teamB = sortedTeams[j];
      if (paired.has(teamB.id)) continue;

      const pairKey = `${teamA.id}-${teamB.id}`;
      if (!playedPairs.has(pairKey)) {
        matchPairs.push([teamA, teamB]);
        paired.add(teamA.id);
        paired.add(teamB.id);
        break;
      }
    }
  }

  // If odd number of teams, one gets a bye
  // Handle unpaired teams (they already played everyone available at their level)
  const unpaired = sortedTeams.filter(t => !paired.has(t.id));
  for (let i = 0; i < unpaired.length - 1; i += 2) {
    matchPairs.push([unpaired[i], unpaired[i + 1]]);
  }

  // Create matches
  const startMatchNumber = previousMatches.length + 1;
  matchPairs.forEach((pair, index) => {
    matches.push({
      id: uuidv4(),
      round: roundNumber,
      matchNumber: startMatchNumber + index,
      teamAId: pair[0].id,
      teamBId: pair[1].id,
      courtNumber: index < numberOfCourts ? index + 1 : null,
      scores: [],
      winnerId: null,
      status: 'scheduled',
    });
  });

  return matches;
}
