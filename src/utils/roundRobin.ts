import { v4 as uuidv4 } from 'uuid';
import type { Team, Match } from '../types/tournament';

export function generateRoundRobinMatches(teams: Team[], numberOfCourts: number): Match[] {
  const matches: Match[] = [];
  const n = teams.length;

  // For odd number of teams, add a "bye" placeholder
  const teamList = [...teams];
  if (n % 2 !== 0) {
    teamList.push({ id: 'bye', name: 'Freilos', seedPosition: n + 1 });
  }

  const numTeams = teamList.length;
  const rounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  // Circle method for round-robin scheduling
  const fixed = teamList[0];
  const rotating = teamList.slice(1);

  let matchNumber = 1;

  for (let round = 0; round < rounds; round++) {
    const currentTeams = [fixed, ...rotating];
    let courtNumber = 1;

    for (let i = 0; i < matchesPerRound; i++) {
      const teamA = currentTeams[i];
      const teamB = currentTeams[numTeams - 1 - i];

      // Skip matches with "bye"
      if (teamA.id === 'bye' || teamB.id === 'bye') {
        continue;
      }

      matches.push({
        id: uuidv4(),
        round: round + 1,
        matchNumber: matchNumber++,
        teamAId: teamA.id,
        teamBId: teamB.id,
        courtNumber: courtNumber <= numberOfCourts ? courtNumber : null,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      });

      courtNumber++;
    }

    // Rotate teams (keep first fixed, rotate the rest)
    rotating.unshift(rotating.pop()!);
  }

  return matches;
}
