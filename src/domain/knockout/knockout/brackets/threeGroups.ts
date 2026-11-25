import { v4 as uuidv4 } from 'uuid';
import type { Match, Group, GroupStandingEntry } from '../../../types/tournament';
import type { KnockoutBracket } from '../types';
import { getRankLabel } from './utils';

/**
 * Generate bracket for 3 groups (12 teams)
 * 3 group winners + best 2nd place = 4 semifinalists
 */
export function generate3GroupKnockout(
  groups: Group[],
  groupStandings: GroupStandingEntry[],
  _teamIdMap: Map<string, string>,
  getTeam: (groupIndex: number, rank: number) => string | null,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): KnockoutBracket {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Find best 2nd place team
  const secondPlaceTeams = groupStandings.filter(s => s.groupRank === 2);
  // Sort by points, then by point difference
  secondPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.pointsWon - a.pointsLost;
    const bDiff = b.pointsWon - b.pointsLost;
    return bDiff - aDiff;
  });
  const best2ndPlaceGroupId = secondPlaceTeams[0]?.groupId;
  const best2ndGroupIndex = groups.findIndex(g => g.id === best2ndPlaceGroupId);

  // Semifinals: 1A vs best 2nd, 1B vs 1C (if best 2nd is from A)
  // Adjust pairings based on which group has the best 2nd place
  const semifinalMatches: Match[] = [];

  if (best2ndGroupIndex === 0) {
    // Best 2nd from A: 1A vs 2A, 1B vs 1C
    semifinalMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 1), // 1A
      teamBId: getTeam(0, 2), // 2A (best 2nd)
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    });
    semifinalMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 1), // 1B
      teamBId: getTeam(2, 1), // 1C
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    });
  } else if (best2ndGroupIndex === 1) {
    // Best 2nd from B: 1B vs 2B, 1A vs 1C
    semifinalMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 1), // 1A
      teamBId: getTeam(2, 1), // 1C
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    });
    semifinalMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 1), // 1B
      teamBId: getTeam(1, 2), // 2B (best 2nd)
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    });
  } else {
    // Best 2nd from C: 1C vs 2C, 1A vs 1B
    semifinalMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 1), // 1A
      teamBId: getTeam(1, 1), // 1B
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    });
    semifinalMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(2, 1), // 1C
      teamBId: getTeam(2, 2), // 2C (best 2nd)
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    });
  }
  matches.push(...semifinalMatches);

  // Third place match
  if (playThirdPlaceMatch) {
    const thirdPlaceMatch: Match = {
      id: uuidv4(),
      round: 2,
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
    round: 2,
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
 * Generate placeholder bracket for 3 groups (12 teams)
 * Uses best 2nd place placeholder (will be determined at runtime)
 */
export function generate3GroupKnockoutPlaceholder(
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): { matches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Semifinals - use generic placeholders since best 2nd place isn't known yet
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe A`,
      teamBPlaceholder: `Bester Zweitplatzierter`,
      teamASource: { type: 'group' as const, groupIndex: 0, rank: 1 },
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe B`,
      teamBPlaceholder: `${getRankLabel(1)} Gruppe C`,
      teamASource: { type: 'group' as const, groupIndex: 1, rank: 1 },
      teamBSource: { type: 'group' as const, groupIndex: 2, rank: 1 },
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
    },
  ];
  matches.push(...semifinalMatches);

  // Third place match
  if (playThirdPlaceMatch) {
    const thirdPlaceMatch: Match = {
      id: uuidv4(),
      round: 2,
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
    round: 2,
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
