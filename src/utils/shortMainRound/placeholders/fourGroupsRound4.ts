import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';

export function generateRound4FourGroups(
  numberOfCourts: number,
  startMatchNumber: number,
  startBracketPosition: number,
  semifinalMatches: Match[],
  bracket58Semis: Match[]
) {
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;
  const matches: Match[] = [];

  const thirdPlaceMatch: Match = {
    id: uuidv4(),
    round: 4,
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
    placementInterval: { start: 3, end: 4 },
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
    },
  };
  matches.push(thirdPlaceMatch);

  const finalMatch: Match = {
    id: uuidv4(),
    round: 4,
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
    placementInterval: { start: 1, end: 2 },
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  const bracket58Finals: Match[] = [
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${bracket58Semis[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${bracket58Semis[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 6 },
      playoffForPlace: 5,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'winner' as const },
        teamB: { matchId: bracket58Semis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${bracket58Semis[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${bracket58Semis[1].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 7, end: 8 },
      playoffForPlace: 7,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'loser' as const },
        teamB: { matchId: bracket58Semis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket58Finals);

  return { matches, nextMatchNumber: matchNumber, nextBracketPosition: bracketPosition };
}
