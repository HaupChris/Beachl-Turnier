import { v4 as uuidv4 } from 'uuid';
import type { Team, Match, StandingEntry } from '../types/tournament';
import {
  SwissGenerator,
  type SwissTeamState,
  type MatchRecord,
} from '../domain/generators/SwissGenerator';
import { assignCourts } from '../domain/generators/MatchGenerator';

/**
 * Generate Swiss round matches using the new domain generator.
 *
 * This function maintains backward compatibility with the existing API
 * while using the new SwissGenerator internally.
 */
export function generateSwissRoundMatches(
  teams: Team[],
  standings: StandingEntry[],
  previousMatches: Match[],
  roundNumber: number,
  numberOfCourts: number
): Match[] {
  if (teams.length < 2) {
    return [];
  }

  const generator = new SwissGenerator();

  // Convert standings to SwissTeamState
  const swissStandings: SwissTeamState[] = teams.map((team, index) => {
    const standing = standings.find(s => s.teamId === team.id);
    return {
      id: team.id,
      index,
      matchPoints: standing?.points ?? 0,
      buchholz: 0, // Will be calculated if needed
      fineBuchholz: 0,
      setsWon: standing?.setsWon ?? 0,
      setsLost: standing?.setsLost ?? 0,
      pointsWon: standing?.pointsWon ?? 0,
      pointsLost: standing?.pointsLost ?? 0,
      hasBye: false,
    };
  });

  // Convert previous matches to MatchRecord
  const history: MatchRecord[] = previousMatches
    .filter(m => m.teamAId && m.teamBId)
    .map(m => ({
      teamAId: m.teamAId!,
      teamBId: m.teamBId!,
      winnerId: m.winnerId,
    }));

  // Generate pairings
  let pairings;
  if (roundNumber === 1 || previousMatches.length === 0) {
    pairings = generator.generateRound1Pairings(teams.length);
  } else {
    pairings = generator.generateSubsequentRoundPairings(swissStandings, history);
  }

  // Convert pairings to matches
  const matches: Match[] = [];
  const validPairings = pairings.filter(p => !p.isBye);
  const courtAssignments = assignCourts(validPairings.length, numberOfCourts);
  const startMatchNumber = previousMatches.length + 1;

  validPairings.forEach((pairing, index) => {
    const teamA = teams[pairing.teamAIndex];
    const teamB = teams[pairing.teamBIndex];

    if (!teamA || !teamB) return;

    matches.push({
      id: uuidv4(),
      round: roundNumber,
      matchNumber: startMatchNumber + index,
      teamAId: teamA.id,
      teamBId: teamB.id,
      courtNumber: courtAssignments[index],
      scores: [],
      winnerId: null,
      status: 'scheduled',
    });
  });

  return matches;
}
