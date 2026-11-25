import { v4 as uuidv4 } from 'uuid';
import type { Match, KnockoutRoundType } from '../../../types/tournament';
import { getGroupLetter, getRankLabel } from '../helpers';

export function generateRound1FourGroups(
  numberOfCourts: number,
  startMatchNumber: number,
  startBracketPosition: number,
  teamsPerGroup: number = 4
) {
  let matchNumber = startMatchNumber;
  let bracketPosition = startBracketPosition;

  const qualificationPairings = [
    { teamA: { group: 0, rank: 2 }, teamB: { group: 3, rank: 3 } },
    { teamA: { group: 1, rank: 2 }, teamB: { group: 2, rank: 3 } },
    { teamA: { group: 2, rank: 2 }, teamB: { group: 1, rank: 3 } },
    { teamA: { group: 3, rank: 2 }, teamB: { group: 0, rank: 3 } },
  ];

  const qualificationMatches: Match[] = qualificationPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(pairing.teamA.rank)} Gruppe ${getGroupLetter(pairing.teamA.group)}`,
    teamBPlaceholder: `${getRankLabel(pairing.teamB.rank)} Gruppe ${getGroupLetter(pairing.teamB.group)}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.teamA.group, rank: pairing.teamA.rank },
    teamBSource: { type: 'group' as const, groupIndex: pairing.teamB.group, rank: pairing.teamB.rank },
    courtNumber: (index % numberOfCourts) + 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'qualification' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 5, end: 12 },
    winnerInterval: { start: 5, end: 8 },
    loserInterval: { start: 9, end: 12 },
  }));

  // Only generate bottom semis (placement 13-16) if groups have 4+ teams
  let bottomSemis: Match[] = [];
  if (teamsPerGroup >= 4) {
    const bottomSemiPairings = [
      { teamA: { group: 0, rank: 4 }, teamB: { group: 1, rank: 4 } },
      { teamA: { group: 2, rank: 4 }, teamB: { group: 3, rank: 4 } },
    ];

    bottomSemis = bottomSemiPairings.map((pairing) => ({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(pairing.teamA.rank)} Gruppe ${getGroupLetter(pairing.teamA.group)}`,
      teamBPlaceholder: `${getRankLabel(pairing.teamB.rank)} Gruppe ${getGroupLetter(pairing.teamB.group)}`,
      teamASource: { type: 'group' as const, groupIndex: pairing.teamA.group, rank: pairing.teamA.rank },
      teamBSource: { type: 'group' as const, groupIndex: pairing.teamB.group, rank: pairing.teamB.rank },
      courtNumber: ((bracketPosition - 1) % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 16 },
    }));
  }

  return {
    qualificationMatches,
    bottomSemis,
    nextMatchNumber: matchNumber,
    nextBracketPosition: bracketPosition,
  };
}
