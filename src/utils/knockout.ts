import { v4 as uuidv4 } from 'uuid';
import type {
  Match,
  Team,
  Tournament,
  GroupStandingEntry,
  KnockoutConfig,
  KnockoutSettings,
  KnockoutRoundType,
  StandingEntry,
  Group,
} from '../types/tournament';

/**
 * Flexible SSVB Knockout Format:
 * Supports 2-8 groups (8-32 teams with 4 teams per group)
 *
 * For 4 groups (16 teams) - Classic SSVB:
 * - Group winners (1st) go directly to quarterfinals
 * - 2nd and 3rd place play intermediate round (Zwischenrunde)
 * - 4th place (Gruppenletzte) are eliminated
 *
 * For 2 groups (8 teams):
 * - 1st and 2nd place go to semifinals
 * - 3rd and 4th place are eliminated or play placement matches
 *
 * For 3 groups (12 teams):
 * - 3 group winners + best 2nd place = 4 semifinalists
 * - Other teams play placement matches
 *
 * For 5-8 groups (20-32 teams):
 * - Group winners + best 2nd places fill 8-team bracket
 * - Remaining teams play placement matches
 */

interface KnockoutBracket {
  matches: Match[];
  teams: Team[];
  eliminatedTeamIds: string[];
}

/**
 * Determines which group ranks are eliminated based on number of groups and teams per group
 * For SSVB format, we want to fill knockout brackets efficiently
 */
function getEliminatedRanks(_numberOfGroups: number, teamsPerGroup: number = 4): number[] {
  // Based on group size, different ranks are eliminated:
  // - 3er groups: No one eliminated (all advance)
  // - 4er groups: 4th place eliminated
  // - 5er groups: 5th place eliminated
  if (teamsPerGroup === 3) {
    return []; // All advance
  } else if (teamsPerGroup === 4) {
    return [4]; // 4th place eliminated
  } else if (teamsPerGroup === 5) {
    return [5]; // 5th place eliminated
  }
  // Default: last place eliminated
  return [teamsPerGroup];
}

/**
 * Generates flexible knockout bracket based on number of groups
 */
function generateFlexibleBracket(
  groups: Group[],
  groupStandings: GroupStandingEntry[],
  teamIdMap: Map<string, string>,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean,
  teamsPerGroup: number = 4
): KnockoutBracket {
  const numberOfGroups = groups.length;

  // Helper to get team by group and rank
  const getTeam = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  switch (numberOfGroups) {
    case 2:
      return generate2GroupBracket(getTeam, numberOfCourts, playThirdPlaceMatch);
    case 3:
      return generate3GroupBracket(groups, groupStandings, teamIdMap, getTeam, numberOfCourts, playThirdPlaceMatch);
    case 4:
      return generateSSVBBracket(groups, groupStandings, teamIdMap, numberOfCourts, teamsPerGroup);
    case 5:
    case 6:
    case 7:
    case 8:
      return generateLargeBracket(numberOfGroups, groups, groupStandings, teamIdMap, getTeam, numberOfCourts, playThirdPlaceMatch);
    default:
      throw new Error(`Unsupported number of groups: ${numberOfGroups}`);
  }
}

/**
 * Generate bracket for 2 groups (8 teams)
 * Semifinals: 1A vs 2B, 1B vs 2A
 * Third place + Final
 */
function generate2GroupBracket(
  getTeam: (groupIndex: number, rank: number) => string | null,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): KnockoutBracket {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 1), // 1A
      teamBId: getTeam(1, 2), // 2B
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 1), // 1B
      teamBId: getTeam(0, 2), // 2A
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'semifinal',
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
 * Generate bracket for 3 groups (12 teams)
 * 3 group winners + best 2nd place = 4 semifinalists
 */
function generate3GroupBracket(
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
 * Generate bracket for 5-8 groups (20-32 teams)
 * Group winners + best 2nd places fill 8-team quarterfinal bracket
 */
function generateLargeBracket(
  numberOfGroups: number,
  _groups: Group[],
  groupStandings: GroupStandingEntry[],
  teamIdMap: Map<string, string>,
  getTeam: (groupIndex: number, rank: number) => string | null,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): KnockoutBracket {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Get all group winners
  const quarterfinalists: { teamId: string | null; seed: number }[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    quarterfinalists.push({ teamId: getTeam(i, 1), seed: i + 1 });
  }

  // Fill remaining spots with best 2nd place teams
  const secondPlaceTeams = groupStandings.filter(s => s.groupRank === 2);
  secondPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.pointsWon - a.pointsLost;
    const bDiff = b.pointsWon - b.pointsLost;
    return bDiff - aDiff;
  });

  const spotsToFill = 8 - numberOfGroups;
  for (let i = 0; i < spotsToFill && i < secondPlaceTeams.length; i++) {
    const teamId = teamIdMap.get(secondPlaceTeams[i].teamId) || null;
    quarterfinalists.push({ teamId, seed: numberOfGroups + i + 1 });
  }

  // Create quarterfinal pairings (1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5)
  const qfPairings = [
    [0, 7], [1, 6], [2, 5], [3, 4]
  ];

  const quarterfinalMatches: Match[] = qfPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: quarterfinalists[pairing[0]]?.teamId || null,
    teamBId: quarterfinalists[pairing[1]]?.teamId || null,
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: quarterfinalists[pairing[0]]?.teamId && quarterfinalists[pairing[1]]?.teamId ? 'scheduled' : 'pending',
    knockoutRound: 'quarterfinal',
    bracketPosition: bracketPosition++,
  }));
  matches.push(...quarterfinalMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
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
      round: 2,
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
    const thirdPlaceMatch: Match = {
      id: uuidv4(),
      round: 3,
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
    round: 3,
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
 * Generates the knockout phase tournament from group phase results
 */
export function generateKnockoutTournament(
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[],
  settings: KnockoutSettings
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  // Get groups from parent tournament
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8) {
    throw new Error('SSVB knockout requires between 2 and 8 groups');
  }

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];
  const eliminatedTeamIds: string[] = [];

  // Determine which ranks get eliminated based on number of groups
  const eliminatedRanks = getEliminatedRanks(groups.length);

  // Copy all non-eliminated teams with new IDs
  groupStandings.forEach((standing) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    if (eliminatedRanks.includes(standing.groupRank)) {
      eliminatedTeamIds.push(standing.teamId);
    } else {
      const newId = uuidv4();
      teamIdMap.set(standing.teamId, newId);
      teams.push({
        id: newId,
        name: originalTeam.name,
        seedPosition: teams.length + 1,
      });
    }
  });

  // Generate knockout matches based on number of groups
  const bracket = generateFlexibleBracket(groups, groupStandings, teamIdMap, parentTournament.numberOfCourts, settings.playThirdPlaceMatch);

  // Initialize standings for knockout phase
  const standings: StandingEntry[] = teams.map(t => ({
    teamId: t.id,
    played: 0,
    won: 0,
    lost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  }));

  const knockoutConfig: KnockoutConfig = {
    directQualification: 1,
    playoffQualification: 2,
    eliminated: 1,
    playThirdPlaceMatch: settings.playThirdPlaceMatch,
    useReferees: settings.useReferees,
  };

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - K.O.-Phase`,
    system: 'knockout',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    teams: [],
    matches: bracket.matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig,
    eliminatedTeamIds: eliminatedTeamIds,
  };

  return { tournament, teams, eliminatedTeamIds };
}

/**
 * Generates the SSVB bracket structure
 * Supports variable group sizes (3, 4, or 5 teams per group)
 *
 * Intermediate round pairings (higher seed vs lower seed from opposite end):
 * - 3er groups: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A
 * - 4er groups: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A (same, 4th eliminated)
 * - 5er groups: 3A vs 4D, 3B vs 4C, 3C vs 4B, 3D vs 4A (1st+2nd direct, 5th eliminated)
 */
function generateSSVBBracket(
  groups: Group[],
  groupStandings: GroupStandingEntry[],
  teamIdMap: Map<string, string>,
  numberOfCourts: number,
  teamsPerGroup: number = 4
): KnockoutBracket {
  const matches: Match[] = [];
  const numberOfGroups = groups.length;

  // Helper to get team by group and rank
  const getTeam = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  // Determine intermediate round participants based on group size
  // - 3er groups: 2nd vs 3rd (1st direct to QF)
  // - 4er groups: 2nd vs 3rd (1st direct, 4th out)
  // - 5er groups: 3rd vs 4th (1st+2nd direct, 5th out)
  let intermediateRankA: number;
  let intermediateRankB: number;
  if (teamsPerGroup === 3) {
    intermediateRankA = 2;
    intermediateRankB = 3;
  } else if (teamsPerGroup === 4) {
    intermediateRankA = 2;
    intermediateRankB = 3;
  } else {
    // 5er groups
    intermediateRankA = 3;
    intermediateRankB = 4;
  }

  let matchNumber = 1;
  let bracketPosition = 1;

  // ============================================
  // ROUND 1: Intermediate Round (Zwischenrunde)
  // ============================================
  // Pattern: [rankA]A vs [rankB]D, [rankA]B vs [rankB]C, etc.
  // This ensures higher seeded teams (from first groups) play lower seeded opponents

  const intermediateMatches: Match[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    const oppositeIndex = numberOfGroups - 1 - i;
    intermediateMatches.push({
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(i, intermediateRankA),
      teamBId: getTeam(oppositeIndex, intermediateRankB),
      courtNumber: Math.min(i + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    });
  }

  matches.push(...intermediateMatches);

  // ============================================
  // ROUND 2: Quarterfinals (Viertelfinale)
  // ============================================
  // Pattern: 1A vs Winner of intermediate from opposite side of bracket
  // 1[i] vs Winner(intermediate[opposite]) where opposite ensures seeding balance
  // For 4 groups: 1A vs W(2B vs 3C), 1B vs W(2A vs 3D), 1C vs W(2D vs 3A), 1D vs W(2C vs 3B)

  // For 5er groups, 1st AND 2nd are direct qualifiers
  // We need 8 spots: 4 × 1st place + 4 intermediate winners (for 3er/4er groups)
  // or: 4 × 1st place + 4 × 2nd place (for 5er groups, but then intermediate is different)

  const quarterfinalMatches: Match[] = [];

  if (teamsPerGroup === 5) {
    // 5er groups: 1st and 2nd are direct, 3rd and 4th play intermediate
    // QF1: 1A vs Winner(3B vs 4C)
    // QF2: 2D vs Winner(3A vs 4D)
    // QF3: 1C vs Winner(3D vs 4A)
    // QF4: 2B vs Winner(3C vs 4B)
    // This is complex - for now use similar pattern
    for (let i = 0; i < numberOfGroups; i++) {
      const directRank = i % 2 === 0 ? 1 : 2; // Alternate between 1st and 2nd
      const intermediateIndex = (i + 1) % numberOfGroups;
      quarterfinalMatches.push({
        id: uuidv4(),
        round: 2,
        matchNumber: matchNumber++,
        teamAId: getTeam(i, directRank),
        teamBId: null,
        courtNumber: Math.min(i + 1, numberOfCourts),
        scores: [],
        winnerId: null,
        status: 'pending',
        knockoutRound: 'quarterfinal',
        bracketPosition: bracketPosition++,
        dependsOn: {
          teamB: { matchId: intermediateMatches[intermediateIndex].id, result: 'winner' },
        },
      });
    }
  } else {
    // 3er and 4er groups: Only 1st is direct qualifier
    // Pattern: 1[i] vs Winner of intermediate[(i+1) % N]
    // This ensures 1A plays winner from bracket section B, etc.
    for (let i = 0; i < numberOfGroups; i++) {
      const intermediateIndex = (i + 1) % numberOfGroups;
      quarterfinalMatches.push({
        id: uuidv4(),
        round: 2,
        matchNumber: matchNumber++,
        teamAId: getTeam(i, 1), // 1st place from group i
        teamBId: null,
        courtNumber: Math.min(i + 1, numberOfCourts),
        scores: [],
        winnerId: null,
        status: 'pending',
        knockoutRound: 'quarterfinal',
        bracketPosition: bracketPosition++,
        dependsOn: {
          teamB: { matchId: intermediateMatches[intermediateIndex].id, result: 'winner' },
        },
      });
    }
  }

  matches.push(...quarterfinalMatches);

  // ============================================
  // ROUND 3: Semifinals (Halbfinale)
  // ============================================

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
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
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
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' },
      },
    },
  ];

  matches.push(...semifinalMatches);

  // ============================================
  // ROUND 4: Third Place Match + Final
  // ============================================

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
    knockoutRound: 'third-place',
    bracketPosition: bracketPosition++,
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' },
    },
  };

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
    knockoutRound: 'final',
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' },
    },
  };

  matches.push(thirdPlaceMatch, finalMatch);

  return {
    matches,
    teams: [],
    eliminatedTeamIds: [],
  };
}

/**
 * Updates knockout bracket after a match is completed
 * Propagates winners/losers to dependent matches
 */
export function updateKnockoutBracket(
  matches: Match[],
  completedMatchId: string
): Match[] {
  const completedMatch = matches.find(m => m.id === completedMatchId);
  if (!completedMatch || !completedMatch.winnerId) return matches;

  const loserId = completedMatch.teamAId === completedMatch.winnerId
    ? completedMatch.teamBId
    : completedMatch.teamAId;

  return matches.map(match => {
    if (!match.dependsOn) return match;

    let updated = { ...match };
    let shouldActivate = false;

    // Check if teamA depends on this match
    if (match.dependsOn.teamA?.matchId === completedMatchId) {
      const teamId = match.dependsOn.teamA.result === 'winner'
        ? completedMatch.winnerId
        : loserId;
      updated = { ...updated, teamAId: teamId };
      shouldActivate = true;
    }

    // Check if teamB depends on this match
    if (match.dependsOn.teamB?.matchId === completedMatchId) {
      const teamId = match.dependsOn.teamB.result === 'winner'
        ? completedMatch.winnerId
        : loserId;
      updated = { ...updated, teamBId: teamId };
      shouldActivate = true;
    }

    // If both teams are now assigned, change status from pending to scheduled
    if (shouldActivate && updated.teamAId && updated.teamBId && updated.status === 'pending') {
      updated = { ...updated, status: 'scheduled' };
    }

    return updated;
  });
}

/**
 * Gets the knockout round label in German
 */
export function getKnockoutRoundLabel(round: KnockoutRoundType): string {
  switch (round) {
    case 'intermediate':
      return 'Zwischenrunde';
    case 'quarterfinal':
      return 'Viertelfinale';
    case 'semifinal':
      return 'Halbfinale';
    case 'third-place':
      return 'Spiel um Platz 3';
    case 'final':
      return 'Finale';
    default:
      return 'K.O.-Runde';
  }
}

/**
 * Calculates final placements for knockout phase
 */
export function calculateKnockoutPlacements(
  matches: Match[],
  _teams: Team[],
  eliminatedTeamIds: string[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  // Find final match
  const finalMatch = matches.find(m => m.knockoutRound === 'final');
  const thirdPlaceMatch = matches.find(m => m.knockoutRound === 'third-place');
  const quarterfinalMatches = matches.filter(m => m.knockoutRound === 'quarterfinal');
  const intermediateMatches = matches.filter(m => m.knockoutRound === 'intermediate');

  // 1st & 2nd place
  if (finalMatch?.status === 'completed' && finalMatch.winnerId) {
    placements.push({ teamId: finalMatch.winnerId, placement: '1.' });
    const loserId = finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId;
    if (loserId) placements.push({ teamId: loserId, placement: '2.' });
  }

  // 3rd & 4th place
  if (thirdPlaceMatch?.status === 'completed' && thirdPlaceMatch.winnerId) {
    placements.push({ teamId: thirdPlaceMatch.winnerId, placement: '3.' });
    const loserId = thirdPlaceMatch.teamAId === thirdPlaceMatch.winnerId
      ? thirdPlaceMatch.teamBId
      : thirdPlaceMatch.teamAId;
    if (loserId) placements.push({ teamId: loserId, placement: '4.' });
  }

  // 5th-8th place (quarterfinal losers)
  const qfLosers = quarterfinalMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  if (qfLosers.length > 0) {
    qfLosers.forEach(id => {
      placements.push({ teamId: id, placement: '5.-8.' });
    });
  }

  // 9th-12th place (intermediate round losers)
  const intermediateLosers = intermediateMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  if (intermediateLosers.length > 0) {
    intermediateLosers.forEach(id => {
      placements.push({ teamId: id, placement: '9.-12.' });
    });
  }

  // 13th-16th place (group phase eliminated - 4th place in groups)
  eliminatedTeamIds.forEach(id => {
    placements.push({ teamId: id, placement: '13.-16.' });
  });

  return placements;
}

/**
 * Returns the total number of matches in SSVB knockout format
 */
export function getSSVBKnockoutMatchCount(playThirdPlaceMatch: boolean): number {
  // 4 intermediate + 4 quarterfinal + 2 semifinal + final + optional 3rd place
  return playThirdPlaceMatch ? 12 : 11;
}

/**
 * Get group letter from index (0 -> A, 1 -> B, etc.)
 */
function getGroupLetter(index: number): string {
  return String.fromCharCode(65 + index); // 65 = 'A'
}

/**
 * Get rank suffix in German (1. Platz, 2. Platz, etc.)
 */
function getRankLabel(rank: number): string {
  return `${rank}. Platz`;
}

/**
 * Generates a placeholder knockout tournament (before group phase is complete)
 * Teams are not assigned yet, but placeholder text shows where they will come from
 */
export function generateKnockoutTournamentPlaceholder(
  parentTournament: Tournament,
  settings: KnockoutSettings
): { tournament: Tournament; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8) {
    throw new Error('SSVB knockout requires between 2 and 8 groups');
  }

  // Generate knockout matches with placeholders based on number of groups
  const bracket = generateFlexibleBracketPlaceholder(
    groups.length,
    parentTournament.numberOfCourts,
    settings.playThirdPlaceMatch,
    settings.useReferees
  );

  // Initialize empty standings (will be populated later)
  const standings: StandingEntry[] = [];

  const knockoutConfig: KnockoutConfig = {
    directQualification: 1,
    playoffQualification: 2,
    eliminated: 1,
    playThirdPlaceMatch: settings.playThirdPlaceMatch,
    useReferees: settings.useReferees,
  };

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - K.O.-Phase`,
    system: 'knockout',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    // Copy scheduling from parent tournament
    scheduling: parentTournament.scheduling,
    teams: [], // Will be populated when group phase completes
    matches: bracket.matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig,
    knockoutSettings: settings,
    eliminatedTeamIds: [],
  };

  return { tournament, eliminatedTeamIds: [] };
}

/**
 * Generates flexible bracket placeholder based on number of groups
 */
function generateFlexibleBracketPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean,
  useReferees: boolean
): { matches: Match[] } {
  switch (numberOfGroups) {
    case 2:
      return generate2GroupBracketPlaceholder(numberOfCourts, playThirdPlaceMatch);
    case 3:
      return generate3GroupBracketPlaceholder(numberOfCourts, playThirdPlaceMatch);
    case 4:
      return generateSSVBBracketPlaceholder(numberOfGroups, numberOfCourts, playThirdPlaceMatch, useReferees);
    case 5:
    case 6:
    case 7:
    case 8:
      return generateLargeBracketPlaceholder(numberOfGroups, numberOfCourts, playThirdPlaceMatch);
    default:
      throw new Error(`Unsupported number of groups: ${numberOfGroups}`);
  }
}

/**
 * Generate placeholder bracket for 2 groups (8 teams)
 */
function generate2GroupBracketPlaceholder(
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): { matches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(1)} Gruppe A`,
      teamBPlaceholder: `${getRankLabel(2)} Gruppe B`,
      teamASource: { type: 'group' as const, groupIndex: 0, rank: 1 },
      teamBSource: { type: 'group' as const, groupIndex: 1, rank: 2 },
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
      teamBPlaceholder: `${getRankLabel(2)} Gruppe A`,
      teamASource: { type: 'group' as const, groupIndex: 1, rank: 1 },
      teamBSource: { type: 'group' as const, groupIndex: 0, rank: 2 },
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

/**
 * Generate placeholder bracket for 3 groups (12 teams)
 * Uses best 2nd place placeholder (will be determined at runtime)
 */
function generate3GroupBracketPlaceholder(
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

/**
 * Generate placeholder bracket for 5-8 groups (20-32 teams)
 */
function generateLargeBracketPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean
): { matches: Match[] } {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Quarterfinal placeholders (1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5)
  const qfPairings: { seedA: number; seedB: number }[] = [
    { seedA: 1, seedB: 8 },
    { seedA: 2, seedB: 7 },
    { seedA: 3, seedB: 6 },
    { seedA: 4, seedB: 5 },
  ];

  const quarterfinalMatches: Match[] = qfPairings.map((pairing, index) => {
    const teamALabel = pairing.seedA <= numberOfGroups
      ? `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.seedA - 1)}`
      : `${pairing.seedA - numberOfGroups}. bester Zweitplatzierter`;
    const teamBLabel = pairing.seedB <= numberOfGroups
      ? `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.seedB - 1)}`
      : `${pairing.seedB - numberOfGroups}. bester Zweitplatzierter`;

    return {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: teamALabel,
      teamBPlaceholder: teamBLabel,
      teamASource: pairing.seedA <= numberOfGroups
        ? { type: 'group' as const, groupIndex: pairing.seedA - 1, rank: 1 }
        : undefined,
      teamBSource: pairing.seedB <= numberOfGroups
        ? { type: 'group' as const, groupIndex: pairing.seedB - 1, rank: 1 }
        : undefined,
      courtNumber: Math.min(index + 1, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'quarterfinal' as const,
      bracketPosition: bracketPosition++,
    };
  });
  matches.push(...quarterfinalMatches);

  // Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
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
    round: 3,
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

/**
 * Generates the SSVB bracket structure with placeholder text (no teams assigned)
 */
function generateSSVBBracketPlaceholder(
  _numberOfGroups: number,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean,
  useReferees: boolean
): { matches: Match[] } {
  const matches: Match[] = [];

  let matchNumber = 1;
  let bracketPosition = 1;

  // Referee assignment for placeholders:
  // - Intermediate & Quarterfinal: 4th place teams (one from each group)
  // - Semifinal: Losers from intermediate round
  // - Finals: Losers from quarterfinal
  const groupLettersForReferees = ['A', 'B', 'C', 'D'];

  // ============================================
  // ROUND 1: Intermediate Round (Zwischenrunde)
  // ============================================
  // 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A

  const intermediatePairings: Array<{teamA: {group: number; rank: number}; teamB: {group: number; rank: number}}> = [
    { teamA: { group: 0, rank: 2 }, teamB: { group: 3, rank: 3 } }, // 2A vs 3D
    { teamA: { group: 1, rank: 2 }, teamB: { group: 2, rank: 3 } }, // 2B vs 3C
    { teamA: { group: 2, rank: 2 }, teamB: { group: 1, rank: 3 } }, // 2C vs 3B
    { teamA: { group: 3, rank: 2 }, teamB: { group: 0, rank: 3 } }, // 2D vs 3A
  ];

  const intermediateMatches: Match[] = intermediatePairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(pairing.teamA.rank)} Gruppe ${getGroupLetter(pairing.teamA.group)}`,
    teamBPlaceholder: `${getRankLabel(pairing.teamB.rank)} Gruppe ${getGroupLetter(pairing.teamB.group)}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.teamA.group, rank: pairing.teamA.rank },
    teamBSource: { type: 'group' as const, groupIndex: pairing.teamB.group, rank: pairing.teamB.rank },
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'intermediate' as const,
    bracketPosition: bracketPosition++,
    // Referee: 4th place from one of the groups
    refereePlaceholder: useReferees ? `4. Platz Gruppe ${groupLettersForReferees[index]}` : undefined,
  }));

  matches.push(...intermediateMatches);

  // ============================================
  // ROUND 2: Quarterfinals (Viertelfinale)
  // ============================================
  // 1A vs Winner(2B vs 3C), 1B vs Winner(2A vs 3D), 1C vs Winner(2D vs 3A), 1D vs Winner(2C vs 3B)

  const quarterfinalPairings = [
    { groupWinner: 0, intermediateMatchIndex: 1 }, // 1A vs Winner of intermediate match 2
    { groupWinner: 1, intermediateMatchIndex: 0 }, // 1B vs Winner of intermediate match 1
    { groupWinner: 2, intermediateMatchIndex: 3 }, // 1C vs Winner of intermediate match 4
    { groupWinner: 3, intermediateMatchIndex: 2 }, // 1D vs Winner of intermediate match 3
  ];

  const quarterfinalMatches: Match[] = quarterfinalPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.groupWinner)}`,
    teamBPlaceholder: `Sieger Spiel ${intermediateMatches[pairing.intermediateMatchIndex].matchNumber}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.groupWinner, rank: 1 },
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'quarterfinal' as const,
    bracketPosition: bracketPosition++,
    dependsOn: {
      teamB: { matchId: intermediateMatches[pairing.intermediateMatchIndex].id, result: 'winner' as const },
    },
    // Referee: 4th place from one of the groups (cycling through)
    refereePlaceholder: useReferees ? `4. Platz Gruppe ${groupLettersForReferees[index]}` : undefined,
  }));

  matches.push(...quarterfinalMatches);

  // ============================================
  // ROUND 3: Semifinals (Halbfinale)
  // ============================================

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
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
      // Referee: Loser from intermediate round
      refereePlaceholder: useReferees ? `Verlierer Spiel ${intermediateMatches[0].matchNumber}` : undefined,
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
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' as const },
      },
      // Referee: Loser from intermediate round
      refereePlaceholder: useReferees ? `Verlierer Spiel ${intermediateMatches[1].matchNumber}` : undefined,
    },
  ];

  matches.push(...semifinalMatches);

  // ============================================
  // ROUND 4: Third Place Match + Final
  // ============================================

  if (playThirdPlaceMatch) {
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
      knockoutRound: 'third-place' as const,
      bracketPosition: bracketPosition++,
      playoffForPlace: 3,
      dependsOn: {
        teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
        teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
      },
      // Referee: Loser from quarterfinal
      refereePlaceholder: useReferees ? `Verlierer Spiel ${quarterfinalMatches[0].matchNumber}` : undefined,
    };
    matches.push(thirdPlaceMatch);
  }

  const finalMatch: Match = {
    id: uuidv4(),
    round: 4,
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
    // Referee: Loser from quarterfinal
    refereePlaceholder: useReferees ? `Verlierer Spiel ${quarterfinalMatches[1].matchNumber}` : undefined,
  };

  matches.push(finalMatch);

  return { matches };
}

/**
 * Populates knockout tournament with actual teams from group phase standings
 * Called when group phase completes
 */
export function populateKnockoutTeams(
  knockoutTournament: Tournament,
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[]
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8) {
    throw new Error('SSVB knockout requires between 2 and 8 groups');
  }

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];
  const eliminatedTeamIds: string[] = [];

  // Determine which ranks get eliminated based on number of groups
  const eliminatedRanks = getEliminatedRanks(groups.length);

  // Copy all non-eliminated teams with new IDs
  groupStandings.forEach((standing) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    if (eliminatedRanks.includes(standing.groupRank)) {
      eliminatedTeamIds.push(standing.teamId);
    } else {
      const newId = uuidv4();
      teamIdMap.set(standing.teamId, newId);
      teams.push({
        id: newId,
        name: originalTeam.name,
        seedPosition: teams.length + 1,
      });
    }
  });

  // For large brackets (5-8 groups), we need to handle best 2nd place teams
  // that don't have a teamSource in the match
  const numberOfGroups = groups.length;
  if (numberOfGroups >= 5) {
    // Sort 2nd place teams by performance
    const secondPlaceTeams = groupStandings.filter(s => s.groupRank === 2);
    secondPlaceTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aDiff = a.pointsWon - a.pointsLost;
      const bDiff = b.pointsWon - b.pointsLost;
      return bDiff - aDiff;
    });

    // Map seed positions (numberOfGroups+1 through 8) to actual teams
    const spotsToFill = 8 - numberOfGroups;
    const best2ndPlaceMapping = new Map<number, string>();
    for (let i = 0; i < spotsToFill && i < secondPlaceTeams.length; i++) {
      const teamId = teamIdMap.get(secondPlaceTeams[i].teamId);
      if (teamId) {
        best2ndPlaceMapping.set(numberOfGroups + i + 1, teamId);
      }
    }
  }

  // Helper to get team by group and rank
  const getTeamId = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  // Update matches with actual team IDs
  const updatedMatches = knockoutTournament.matches.map(match => {
    const updatedMatch = { ...match };

    // Populate team from source (group standings)
    if (match.teamASource?.type === 'group') {
      updatedMatch.teamAId = getTeamId(match.teamASource.groupIndex, match.teamASource.rank);
    }
    if (match.teamBSource?.type === 'group') {
      updatedMatch.teamBId = getTeamId(match.teamBSource.groupIndex, match.teamBSource.rank);
    }

    // Update status: if both teams are assigned and no dependencies, mark as scheduled
    if (updatedMatch.teamAId && updatedMatch.teamBId && !updatedMatch.dependsOn) {
      updatedMatch.status = 'scheduled';
    } else if (updatedMatch.teamAId && updatedMatch.dependsOn?.teamB && !updatedMatch.dependsOn?.teamA) {
      // Team A is assigned (group winner), team B depends on intermediate match - still pending
      updatedMatch.status = 'pending';
    }

    return updatedMatch;
  });

  // Initialize standings for knockout phase
  const standings: StandingEntry[] = teams.map(t => ({
    teamId: t.id,
    played: 0,
    won: 0,
    lost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  }));

  return {
    tournament: {
      ...knockoutTournament,
      teams,
      matches: updatedMatches,
      standings,
      eliminatedTeamIds,
      updatedAt: new Date().toISOString(),
    },
    teams,
    eliminatedTeamIds,
  };
}
