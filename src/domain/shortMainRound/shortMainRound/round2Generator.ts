import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../types/tournament';
import type { SeedMapping } from './types';

/**
 * Generate Round 2 matches: Quarterfinals, 9-12 semis, 13-16 finals
 */
export function generateRound2Matches(
  teamSeeds: SeedMapping,
  teamIdMap: Map<string, string>,
  numberOfCourts: number,
  qualificationMatches: Match[],
  bottomSemis: Match[],
  startMatchNumber: number,
  startBracketPosition: number
): { matches: Match[]; quarterfinalMatches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;

  // Helper to get new team ID
  const getTeamId = (originalId: string): string | null => {
    return teamIdMap.get(originalId) || null;
  };

  // Quarterfinals: 1A vs Winner(2B vs 3C), 1B vs Winner(2A vs 3D), etc.
  const aTeams = teamSeeds.A;
  const quarterfinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[0].teamId), // 1A
      teamBId: null, // Winner of 2B vs 3C (quali match 2)
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[1].teamId), // 1B
      teamBId: null, // Winner of 2A vs 3D (quali match 1)
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[0].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[2].teamId), // 1C
      teamBId: null, // Winner of 2D vs 3A (quali match 4)
      courtNumber: Math.min(3, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[3].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[3].teamId), // 1D
      teamBId: null, // Winner of 2C vs 3B (quali match 3)
      courtNumber: Math.min(4, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[2].id, result: 'winner' },
      },
    },
  ];
  matches.push(...quarterfinalMatches);

  // 9-12 Bracket Semifinals (Quali losers)
  const bracket912Semis: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Loser of quali 1 (2A vs 3D)
      teamBId: null, // Loser of quali 2 (2B vs 3C)
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[0].id, result: 'loser' },
        teamB: { matchId: qualificationMatches[1].id, result: 'loser' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Loser of quali 3 (2C vs 3B)
      teamBId: null, // Loser of quali 4 (2D vs 3A)
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[2].id, result: 'loser' },
        teamB: { matchId: qualificationMatches[3].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket912Semis);

  // 13-16 Finals (from bottom semis)
  const bracket1316Finals: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Winner of bottom semi 1
      teamBId: null, // Winner of bottom semi 2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 14 },
      playoffForPlace: 13,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'winner' },
        teamB: { matchId: bottomSemis[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Loser of bottom semi 1
      teamBId: null, // Loser of bottom semi 2
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 15, end: 16 },
      playoffForPlace: 15,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'loser' },
        teamB: { matchId: bottomSemis[1].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket1316Finals);

  return { matches, quarterfinalMatches };
}
