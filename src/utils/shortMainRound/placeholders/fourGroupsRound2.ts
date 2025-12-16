import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';
import { getGroupLetter, getRankLabel } from '../helpers';

export function generateRound2FourGroups(
  numberOfCourts: number,
  startMatchNumber: number,
  startBracketPosition: number,
  qualificationMatches: Match[],
  bottomSemis: Match[]
) {
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;
  const matches: Match[] = [];

  const qfPairings = [
    { groupWinner: 0, qualiMatchIndex: 1 },
    { groupWinner: 1, qualiMatchIndex: 0 },
    { groupWinner: 2, qualiMatchIndex: 3 },
    { groupWinner: 3, qualiMatchIndex: 2 },
  ];

  const quarterfinalMatches: Match[] = qfPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.groupWinner)}`,
    teamBPlaceholder: `Sieger Spiel ${qualificationMatches[pairing.qualiMatchIndex].matchNumber}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.groupWinner, rank: 1 },
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 1, end: 8 },
    dependsOn: {
      teamB: { matchId: qualificationMatches[pairing.qualiMatchIndex].id, result: 'winner' as const },
    },
  }));
  matches.push(...quarterfinalMatches);

  const bracket912Semis: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${qualificationMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${qualificationMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[0].id, result: 'loser' as const },
        teamB: { matchId: qualificationMatches[1].id, result: 'loser' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${qualificationMatches[2].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${qualificationMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[2].id, result: 'loser' as const },
        teamB: { matchId: qualificationMatches[3].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket912Semis);

  const bracket1316Finals: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${bottomSemis[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${bottomSemis[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 14 },
      playoffForPlace: 13,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'winner' as const },
        teamB: { matchId: bottomSemis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${bottomSemis[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${bottomSemis[1].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 15, end: 16 },
      playoffForPlace: 15,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'loser' as const },
        teamB: { matchId: bottomSemis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket1316Finals);

  return {
    matches,
    quarterfinalMatches,
    bracket912Semis,
    nextMatchNumber: matchNumber,
    nextBracketPosition: bracketPosition,
  };
}
