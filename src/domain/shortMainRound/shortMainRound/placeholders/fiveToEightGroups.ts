import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';
import { getGroupLetter, getRankLabel } from '../helpers';

/**
 * Generate placeholder matches for 5-8 group tournaments (even groups only)
 * - Top 8 bracket: Group winners + best 2nd places (if needed)
 * - Placement blocks for remaining teams (9-16, 17-24, 25-32)
 */
export function generateFiveToEightGroupPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number,
  teamsPerGroup: number = 4
): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  const topBracketResult = generateTopEightBracket(
    numberOfGroups,
    numberOfCourts,
    matchNumber,
    bracketPosition
  );
  matches.push(...topBracketResult.matches);
  matchNumber = topBracketResult.nextMatchNumber;
  bracketPosition = topBracketResult.nextBracketPosition;

  const totalTeams = numberOfGroups * teamsPerGroup;
  const remainingTeams = totalTeams - 8;
  const placementBlocks = Math.ceil(remainingTeams / 8);

  for (let block = 0; block < placementBlocks; block++) {
    const intervalStart = 9 + block * 8;
    const seedStart = 1 + block * 8;
    const blockResult = generatePlacementBlock(
      numberOfCourts,
      matchNumber,
      bracketPosition,
      intervalStart,
      seedStart,
      8,
      1
    );
    matches.push(...blockResult.matches);
    matchNumber = blockResult.nextMatchNumber;
    bracketPosition = blockResult.nextBracketPosition;
  }

  return matches;
}

function generateTopEightBracket(
  numberOfGroups: number,
  numberOfCourts: number,
  startMatchNumber: number,
  startBracketPosition: number
): { matches: Match[]; nextMatchNumber: number; nextBracketPosition: number } {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;

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
      placementInterval: { start: 1, end: 8 },
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
      placementInterval: { start: 1, end: 4 },
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
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: qfMatches[2].id, result: 'winner' as const },
        teamB: { matchId: qfMatches[3].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // 5-8 Semifinals (QF losers)
  const bracket58Semis: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: qfMatches[0].id, result: 'loser' as const },
        teamB: { matchId: qfMatches[1].id, result: 'loser' as const },
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
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: qfMatches[2].id, result: 'loser' as const },
        teamB: { matchId: qfMatches[3].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket58Semis);

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
    placementInterval: { start: 3, end: 4 },
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
    placementInterval: { start: 1, end: 2 },
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  const bracket58Finals: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
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
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
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

function generatePlacementBlock(
  numberOfCourts: number,
  startMatchNumber: number,
  startBracketPosition: number,
  intervalStart: number,
  seedStart: number,
  slotCount: number,
  roundOffset: number
): { matches: Match[]; nextMatchNumber: number; nextBracketPosition: number } {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;

  const seeds = Array.from({ length: slotCount }, (_, i) => seedStart + i);

  const qfMatches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    const seedA = seeds[i];
    const seedB = seeds[7 - i];
    qfMatches.push({
      id: uuidv4(),
      round: roundOffset,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Seed ${seedA}`,
      teamBPlaceholder: `Seed ${seedB}`,
      teamASource: { type: 'standing' as const, rank: seedA },
      teamBSource: { type: 'standing' as const, rank: seedB },
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart, end: intervalStart + 7 },
    });
  }
  matches.push(...qfMatches);

  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: roundOffset + 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${qfMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${qfMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart, end: intervalStart + 3 },
      dependsOn: {
        teamA: { matchId: qfMatches[0].id, result: 'winner' as const },
        teamB: { matchId: qfMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: roundOffset + 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${qfMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${qfMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart, end: intervalStart + 3 },
      dependsOn: {
        teamA: { matchId: qfMatches[2].id, result: 'winner' as const },
        teamB: { matchId: qfMatches[3].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);

  const bracket58Semis: Match[] = [
    {
      id: uuidv4(),
      round: roundOffset + 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart + 4, end: intervalStart + 7 },
      dependsOn: {
        teamA: { matchId: qfMatches[0].id, result: 'loser' as const },
        teamB: { matchId: qfMatches[1].id, result: 'loser' as const },
      },
    },
    {
      id: uuidv4(),
      round: roundOffset + 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart + 4, end: intervalStart + 7 },
      dependsOn: {
        teamA: { matchId: qfMatches[2].id, result: 'loser' as const },
        teamB: { matchId: qfMatches[3].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket58Semis);

  const thirdPlaceMatch: Match = {
    id: uuidv4(),
    round: roundOffset + 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    courtNumber: 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'placement-block' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: intervalStart + 2, end: intervalStart + 3 },
    playoffForPlace: intervalStart + 2,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
    },
  };
  matches.push(thirdPlaceMatch);

  const finalMatch: Match = {
    id: uuidv4(),
    round: roundOffset + 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    courtNumber: Math.min(2, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'placement-block' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: intervalStart, end: intervalStart + 1 },
    playoffForPlace: intervalStart,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  const placementFinals: Match[] = [
    {
      id: uuidv4(),
      round: roundOffset + 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart + 4, end: intervalStart + 5 },
      playoffForPlace: intervalStart + 4,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'winner' as const },
        teamB: { matchId: bracket58Semis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: roundOffset + 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-block' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: intervalStart + 6, end: intervalStart + 7 },
      playoffForPlace: intervalStart + 6,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'loser' as const },
        teamB: { matchId: bracket58Semis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...placementFinals);

  return { matches, nextMatchNumber: matchNumber, nextBracketPosition: bracketPosition };
}
