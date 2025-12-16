import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';

export function generateRound3FourGroups(
  numberOfCourts: number,
  startMatchNumber: number,
  startBracketPosition: number,
  quarterfinalMatches: Match[],
  bracket912Semis: Match[]
) {
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;
  const matches: Match[] = [];

  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);

  const bracket58Semis: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'loser' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'loser' as const },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'loser' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket58Semis);

  const bracket912Finals: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${bracket912Semis[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${bracket912Semis[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 10 },
      playoffForPlace: 9,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'winner' as const },
        teamB: { matchId: bracket912Semis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${bracket912Semis[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${bracket912Semis[1].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 11, end: 12 },
      playoffForPlace: 11,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'loser' as const },
        teamB: { matchId: bracket912Semis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket912Finals);

  return {
    matches,
    semifinalMatches,
    bracket58Semis,
    nextMatchNumber: matchNumber,
    nextBracketPosition: bracketPosition,
  };
}
