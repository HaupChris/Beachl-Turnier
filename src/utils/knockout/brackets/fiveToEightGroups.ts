import { v4 as uuidv4 } from 'uuid';
import type { Match, Group, GroupStandingEntry } from '../../../types/tournament';
import type { KnockoutBracket } from '../types';
import { getGroupLetter, getRankLabel } from './utils';

/**
 * Generate bracket for 5-8 groups (20-32 teams)
 * Group winners + best 2nd places fill 8-team quarterfinal bracket
 */
export function generate5to8GroupKnockout(
  numberOfGroups: number,
  _groups: Group[],
  groupStandings: GroupStandingEntry[],
  teamIdMap: Map<string, string>,
  getTeam: (groupIndex: number, rank: number) => string | null,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): KnockoutBracket {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Get all group winners
  const quarterfinalists: { teamId: string | null; seed: number }[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    quarterfinalists.push({ teamId: getTeam(i, 1), seed: i + 1 });
  }

  // Fill remaining spots with best 2nd place teams
  const secondPlaceTeams = groupStandings.filter(s => s.groupRank === 2);
  secondPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.pointsWon - a.pointsLost;
    const bDiff = b.pointsWon - b.pointsLost;
    return bDiff - aDiff;
  });

  const spotsToFill = 8 - numberOfGroups;
  for (let i = 0; i < spotsToFill && i < secondPlaceTeams.length; i++) {
    const teamId = teamIdMap.get(secondPlaceTeams[i].teamId) || null;
    quarterfinalists.push({ teamId, seed: numberOfGroups + i + 1 });
  }

  // Create quarterfinal pairings (1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5)
  const qfPairings = [
    [0, 7], [1, 6], [2, 5], [3, 4]
  ];

  const quarterfinalMatches: Match[] = qfPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: quarterfinalists[pairing[0]]?.teamId || null,
    teamBId: quarterfinalists[pairing[1]]?.teamId || null,
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: quarterfinalists[pairing[0]]?.teamId && quarterfinalists[pairing[1]]?.teamId ? 'scheduled' : 'pending',
    knockoutRound: 'quarterfinal',
    bracketPosition: bracketPosition++,
  }));
  matches.push(...quarterfinalMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' },
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
 * Generate placeholder bracket for 5-8 groups (20-32 teams)
 */
export function generate5to8GroupKnockoutPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): { matches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Quarterfinal placeholders (1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5)
  const qfPairings: { seedA: number; seedB: number }[] = [
    { seedA: 1, seedB: 8 },
    { seedA: 2, seedB: 7 },
    { seedA: 3, seedB: 6 },
    { seedA: 4, seedB: 5 },
  ];

  const quarterfinalMatches: Match[] = qfPairings.map((pairing, index) => {
    const teamALabel = pairing.seedA <= numberOfGroups
      ? `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.seedA - 1)}`
      : `${pairing.seedA - numberOfGroups}. bester Zweitplatzierter`;
    const teamBLabel = pairing.seedB <= numberOfGroups
      ? `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.seedB - 1)}`
      : `${pairing.seedB - numberOfGroups}. bester Zweitplatzierter`;

    return {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: teamALabel,
      teamBPlaceholder: teamBLabel,
      teamASource: pairing.seedA <= numberOfGroups
        ? { type: 'group' as const, groupIndex: pairing.seedA - 1, rank: 1 }
        : undefined,
      teamBSource: pairing.seedB <= numberOfGroups
        ? { type: 'group' as const, groupIndex: pairing.seedB - 1, rank: 1 }
        : undefined,
      courtNumber: Math.min(index + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'quarterfinal' as const,
      bracketPosition: bracketPosition++,
    };
  });
  matches.push(...quarterfinalMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' as const },
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
