import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../types/tournament';
import type { SeedMapping } from './types';

/**
 * Generate Round 1 matches: Qualification and bottom bracket semifinals
 */
export function generateRound1Matches(
  teamSeeds: SeedMapping,
  teamIdMap: Map<string, string>,
  numberOfCourts: number
): { matches: Match[]; qualificationMatches: Match[]; bottomSemis: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Helper to get new team ID
  const getTeamId = (originalId: string): string | null => {
    return teamIdMap.get(originalId) || null;
  };

  // Qualification: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A
  const bTeams = teamSeeds.B;
  const qualificationPairings = [
    { teamA: bTeams[0], teamB: bTeams[7] }, // 2A vs 3D
    { teamA: bTeams[1], teamB: bTeams[6] }, // 2B vs 3C
    { teamA: bTeams[2], teamB: bTeams[5] }, // 2C vs 3B
    { teamA: bTeams[3], teamB: bTeams[4] }, // 2D vs 3A
  ];

  const qualificationMatches: Match[] = qualificationPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: getTeamId(pairing.teamA.teamId),
    teamBId: getTeamId(pairing.teamB.teamId),
    courtNumber: (index % numberOfCourts) + 1,
    scores: [],
    winnerId: null,
    status: 'scheduled',
    knockoutRound: 'qualification' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 5, end: 12 },
    winnerInterval: { start: 5, end: 8 },
    loserInterval: { start: 9, end: 12 },
  }));
  matches.push(...qualificationMatches);

  // Bottom Bracket Semifinals (C teams: 13-16)
  const cTeams = teamSeeds.C;
  const bottomSemis: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeamId(cTeams[0].teamId), // 4A
      teamBId: getTeamId(cTeams[1].teamId), // 4B
      courtNumber: ((bracketPosition - 1) % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 16 },
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeamId(cTeams[2].teamId), // 4C
      teamBId: getTeamId(cTeams[3].teamId), // 4D
      courtNumber: ((bracketPosition - 1) % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 16 },
    },
  ];
  matches.push(...bottomSemis);

  return { matches, qualificationMatches, bottomSemis };
}
