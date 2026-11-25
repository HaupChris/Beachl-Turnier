import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';
import { getRankLabel } from '../helpers';

/**
 * Generate placeholder matches for 2-group tournaments (short main round)
 * Qualification round (2nd vs 3rd), semifinals with group winners, plus 5th/7th placement
 */
export function generateTwoGroupPlaceholder(numberOfCourts: number): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Qualification (2nd vs 3rd)
  const qualificationMatches: Match[] = [
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
      knockoutRound: 'qualification' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
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
      knockoutRound: 'qualification' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
    },
  ];
  matches.push(...qualificationMatches);

  // Semifinals (group winners wait)
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe A`,
      teamBPlaceholder: `Sieger Spiel ${qualificationMatches[1].matchNumber}`,
      teamASource: { type: 'group' as const, groupIndex: 0, rank: 1 },
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe B`,
      teamBPlaceholder: `Sieger Spiel ${qualificationMatches[0].matchNumber}`,
      teamASource: { type: 'group' as const, groupIndex: 1, rank: 1 },
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[0].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // Match for 5th/6th (qualification losers)
  const place56Match: Match = {
    id: uuidv4(),
    round: 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Verlierer Spiel ${qualificationMatches[0].matchNumber}`,
    teamBPlaceholder: `Verlierer Spiel ${qualificationMatches[1].matchNumber}`,
    courtNumber: Math.min(3, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'placement-5-8' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 5, end: 6 },
    playoffForPlace: 5,
    dependsOn: {
      teamA: { matchId: qualificationMatches[0].id, result: 'loser' as const },
      teamB: { matchId: qualificationMatches[1].id, result: 'loser' as const },
    },
  };
  matches.push(place56Match);

  // Match for 7th/8th (bottom bracket)
  const place78Match: Match = {
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(4)} Gruppe A`,
    teamBPlaceholder: `${getRankLabel(4)} Gruppe B`,
    teamASource: { type: 'group' as const, groupIndex: 0, rank: 4 },
    teamBSource: { type: 'group' as const, groupIndex: 1, rank: 4 },
    courtNumber: Math.min(4, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'placement-5-8' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 7, end: 8 },
    playoffForPlace: 7,
  };
  matches.push(place78Match);

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
    placementInterval: { start: 3, end: 4 },
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
    },
  };
  matches.push(thirdPlaceMatch);

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
    placementInterval: { start: 1, end: 2 },
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  return matches;
}
