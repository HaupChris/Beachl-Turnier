import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../types/tournament';

/**
 * Generate subsequent rounds (3 and 4): Semifinals, finals, and placement brackets
 */
export function generateRound3And4Matches(
  numberOfCourts: number,
  quarterfinalMatches: Match[],
  bracket912Semis: Match[],
  bracket58Semis: Match[],
  startMatchNumber: number,
  startBracketPosition: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;

  // Round 3: Top Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Winner QF1
      teamBId: null, // Winner QF2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Winner QF3
      teamBId: null, // Winner QF4
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // 5-8 Bracket Semifinals (QF losers)
  const bracket58SemisMatches: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Loser QF1
      teamBId: null, // Loser QF2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'loser' },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'loser' },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Loser QF3
      teamBId: null, // Loser QF4
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'loser' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket58SemisMatches);

  // Update the bracket58Semis array for use in later rounds
  bracket58Semis.push(...bracket58SemisMatches);

  // 9-12 Finals
  const bracket912Finals: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Winner 9-12 semi 1
      teamBId: null, // Winner 9-12 semi 2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 10 },
      playoffForPlace: 9,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'winner' },
        teamB: { matchId: bracket912Semis[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Loser 9-12 semi 1
      teamBId: null, // Loser 9-12 semi 2
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 11, end: 12 },
      playoffForPlace: 11,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'loser' },
        teamB: { matchId: bracket912Semis[1].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket912Finals);

  // Round 4: 3rd Place Match
  const thirdPlaceMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null, // Loser SF1
    teamBId: null, // Loser SF2
    courtNumber: 1,
    scores: [],
    winnerId: null,
    status: 'pending',
    knockoutRound: 'third-place' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 3, end: 4 },
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' },
    },
  };
  matches.push(thirdPlaceMatch);

  // Final
  const finalMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null, // Winner SF1
    teamBId: null, // Winner SF2
    courtNumber: Math.min(2, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending',
    knockoutRound: 'top-final' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 1, end: 2 },
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' },
    },
  };
  matches.push(finalMatch);

  // 5-8 Finals
  const bracket58Finals: Match[] = [
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null, // Winner 5-8 semi 1
      teamBId: null, // Winner 5-8 semi 2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 6 },
      playoffForPlace: 5,
      dependsOn: {
        teamA: { matchId: bracket58SemisMatches[0].id, result: 'winner' },
        teamB: { matchId: bracket58SemisMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null, // Loser 5-8 semi 1
      teamBId: null, // Loser 5-8 semi 2
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 7, end: 8 },
      playoffForPlace: 7,
      dependsOn: {
        teamA: { matchId: bracket58SemisMatches[0].id, result: 'loser' },
        teamB: { matchId: bracket58SemisMatches[1].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket58Finals);

  return matches;
}
