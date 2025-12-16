import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';
import { getGroupLetter, getRankLabel } from '../helpers';

/**
 * Generate placeholder matches for 5-8 group tournaments
 * Full quarterfinal bracket with 8 teams
 */
export function generateFiveToEightGroupPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Quarterfinals
  const qfMatches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    const seedA = i + 1;
    const seedB = 8 - i;
    const teamALabel = seedA <= numberOfGroups
      ? `${getRankLabel(1)} Gruppe ${getGroupLetter(seedA - 1)}`
      : `${seedA - numberOfGroups}. bester Zweitplatzierter`;
    const teamBLabel = seedB <= numberOfGroups
      ? `${getRankLabel(1)} Gruppe ${getGroupLetter(seedB - 1)}`
      : `${seedB - numberOfGroups}. bester Zweitplatzierter`;

    qfMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: teamALabel,
      teamBPlaceholder: teamBLabel,
      teamASource: seedA <= numberOfGroups
        ? { type: 'group' as const, groupIndex: seedA - 1, rank: 1 }
        : undefined,
      teamBSource: seedB <= numberOfGroups
        ? { type: 'group' as const, groupIndex: seedB - 1, rank: 1 }
        : undefined,
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
    });
  }
  matches.push(...qfMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${qfMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${qfMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: qfMatches[0].id, result: 'winner' as const },
        teamB: { matchId: qfMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${qfMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${qfMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: qfMatches[2].id, result: 'winner' as const },
        teamB: { matchId: qfMatches[3].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // Third place match
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
    knockoutRound: 'third-place' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
    },
  };
  matches.push(thirdPlaceMatch);

  // Final
  const finalMatch: Match = {
    id: uuidv4(),
    round: 3,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Sieger Spiel ${semifinalMatches[0].matchNumber}`,
    teamBPlaceholder: `Sieger Spiel ${semifinalMatches[1].matchNumber}`,
    courtNumber: Math.min(2, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'top-final' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  return matches;
}
