import { v4 as uuidv4 } from 'uuid';
import type { Match } from '../../../types/tournament';
import type { KnockoutBracket } from '../types';
import { getRankLabel } from './utils';

/**
 * Generate bracket for 2 groups (8 teams)
 * Intermediate: 2A vs 3B, 2B vs 3A
 * Semifinals: 1A vs Winner(2B vs 3A), 1B vs Winner(2A vs 3B)
 * Third place + Final
 */
export function generate2GroupKnockout(
  getTeam: (groupIndex: number, rank: number) => string | null,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): KnockoutBracket {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Intermediate round
  const intermediateMatches: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 2), // 2A
      teamBId: getTeam(1, 3), // 3B
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 2), // 2B
      teamBId: getTeam(0, 3), // 3A
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    },
  ];
  matches.push(...intermediateMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 1), // 1A
      teamBId: null,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 1), // 1B
      teamBId: null,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[0].id, result: 'winner' },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // Third place match
  if (playThirdPlaceMatch) {
    const thirdPlaceMatch: Match = {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'third-place',
      bracketPosition: bracketPosition++,
      playoffForPlace: 3,
      dependsOn: {
        teamA: { matchId: semifinalMatches[0].id, result: 'loser' },
        teamB: { matchId: semifinalMatches[1].id, result: 'loser' },
      },
    };
    matches.push(thirdPlaceMatch);
  }

  // Final
  const finalMatch: Match = {
    id: uuidv4(),
    round: 3,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    courtNumber: playThirdPlaceMatch ? Math.min(2, numberOfCourts) : 1,
    scores: [],
    winnerId: null,
    status: 'pending',
    knockoutRound: 'final',
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' },
    },
  };
  matches.push(finalMatch);

  return { matches, teams: [], eliminatedTeamIds: [] };
}

/**
 * Generate placeholder bracket for 2 groups (8 teams)
 */
export function generate2GroupKnockoutPlaceholder(
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): { matches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Intermediate round
  const intermediateMatches: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(2)} Gruppe A`,
      teamBPlaceholder: `${getRankLabel(3)} Gruppe B`,
      teamASource: { type: 'group' as const, groupIndex: 0, rank: 2 },
      teamBSource: { type: 'group' as const, groupIndex: 1, rank: 3 },
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'intermediate' as const,
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(2)} Gruppe B`,
      teamBPlaceholder: `${getRankLabel(3)} Gruppe A`,
      teamASource: { type: 'group' as const, groupIndex: 1, rank: 2 },
      teamBSource: { type: 'group' as const, groupIndex: 0, rank: 3 },
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'intermediate' as const,
      bracketPosition: bracketPosition++,
    },
  ];
  matches.push(...intermediateMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe A`,
      teamBPlaceholder: `Sieger Spiel ${intermediateMatches[1].matchNumber}`,
      teamASource: { type: 'group' as const, groupIndex: 0, rank: 1 },
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe B`,
      teamBPlaceholder: `Sieger Spiel ${intermediateMatches[0].matchNumber}`,
      teamASource: { type: 'group' as const, groupIndex: 1, rank: 1 },
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[0].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);


  // Third place match
  if (playThirdPlaceMatch) {
    const thirdPlaceMatch: Match = {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${semifinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${semifinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'third-place' as const,
      bracketPosition: bracketPosition++,
      playoffForPlace: 3,
      dependsOn: {
        teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
        teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
      },
    };
    matches.push(thirdPlaceMatch);
  }

  // Final
  const finalMatch: Match = {
    id: uuidv4(),
    round: 3,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Sieger Spiel ${semifinalMatches[0].matchNumber}`,
    teamBPlaceholder: `Sieger Spiel ${semifinalMatches[1].matchNumber}`,
    courtNumber: playThirdPlaceMatch ? Math.min(2, numberOfCourts) : 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'final' as const,
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  return { matches };
}
