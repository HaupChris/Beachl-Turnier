import { v4 as uuidv4 } from 'uuid';
import type { Match, Group, GroupStandingEntry } from '../../../types/tournament';
import type { KnockoutBracket } from '../types';
import { getGroupLetter, getRankLabel } from './utils';

/**
 * Generates the SSVB bracket structure for 8 groups (24–32 teams)
 * Structure:
 * - Intermediate round: 2nd vs 3rd (snake)
 * - Round of 16: group winners vs intermediate winners
 * - Quarterfinals, Semifinals, Final (+ optional 3rd place)
 */
export function generate8GroupSSVBKnockout(
  groups: Group[],
  groupStandings: GroupStandingEntry[],
  teamIdMap: Map<string, string>,
  getTeam: (groupIndex: number, rank: number) => string | null,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): KnockoutBracket {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;
  const numberOfGroups = groups.length;

  // Intermediate round (snake pairing)
  const intermediateMatches: Match[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    const opp = numberOfGroups - 1 - i;
    intermediateMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(i, 2),
      teamBId: getTeam(opp, 3),
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    });
  }
  matches.push(...intermediateMatches);

  // Round of 16: group winners vs intermediate winners
  const roundOf16Matches: Match[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    const intermediateIndex = (i + 1) % numberOfGroups;
    roundOf16Matches.push({
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(i, 1),
      teamBId: null,
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'round-of-16',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[intermediateIndex].id, result: 'winner' },
      },
    });
  }
  matches.push(...roundOf16Matches);

  // Quarterfinals
  const quarterfinalMatches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    const a = roundOf16Matches[i * 2];
    const b = roundOf16Matches[i * 2 + 1];
    quarterfinalMatches.push({
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'quarterfinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: a.id, result: 'winner' },
        teamB: { matchId: b.id, result: 'winner' },
      },
    });
  }
  matches.push(...quarterfinalMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 4,
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
      round: 4,
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
    matches.push({
      id: uuidv4(),
      round: 5,
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
    });
  }

  // Final
  matches.push({
    id: uuidv4(),
    round: 5,
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
  });

  return { matches, teams: [], eliminatedTeamIds: [] };
}

/**
 * Placeholder bracket for 8 groups (24–32 teams)
 */
export function generate8GroupSSVBKnockoutPlaceholder(
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): { matches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  const groupCount = 8;

  // Intermediate round (snake pairing)
  const intermediateMatches: Match[] = [];
  for (let i = 0; i < groupCount; i++) {
    const opp = groupCount - 1 - i;
    intermediateMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(2)} Gruppe ${getGroupLetter(i)}`,
      teamBPlaceholder: `${getRankLabel(3)} Gruppe ${getGroupLetter(opp)}`,
      teamASource: { type: 'group' as const, groupIndex: i, rank: 2 },
      teamBSource: { type: 'group' as const, groupIndex: opp, rank: 3 },
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    });
  }
  matches.push(...intermediateMatches);

  // Round of 16
  const roundOf16Matches: Match[] = [];
  for (let i = 0; i < groupCount; i++) {
    const intermediateIndex = (i + 1) % groupCount;
    roundOf16Matches.push({
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe ${getGroupLetter(i)}`,
      teamBPlaceholder: `Sieger Spiel ${intermediateMatches[intermediateIndex].matchNumber}`,
      teamASource: { type: 'group' as const, groupIndex: i, rank: 1 },
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'round-of-16',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[intermediateIndex].id, result: 'winner' as const },
      },
    });
  }
  matches.push(...roundOf16Matches);

  // Quarterfinals
  const quarterfinalMatches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    const a = roundOf16Matches[i * 2];
    const b = roundOf16Matches[i * 2 + 1];
    quarterfinalMatches.push({
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${a.matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${b.matchNumber}`,
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'quarterfinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: a.id, result: 'winner' as const },
        teamB: { matchId: b.id, result: 'winner' as const },
      },
    });
  }
  matches.push(...quarterfinalMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal',
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
    matches.push({
      id: uuidv4(),
      round: 5,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${semifinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${semifinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'third-place',
      bracketPosition: bracketPosition++,
      playoffForPlace: 3,
      dependsOn: {
        teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
        teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
      },
    });
  }

  // Final
  matches.push({
    id: uuidv4(),
    round: 5,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Sieger Spiel ${semifinalMatches[0].matchNumber}`,
    teamBPlaceholder: `Sieger Spiel ${semifinalMatches[1].matchNumber}`,
    courtNumber: playThirdPlaceMatch ? Math.min(2, numberOfCourts) : 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'final',
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  });

  return { matches };
}
