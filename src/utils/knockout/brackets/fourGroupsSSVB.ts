import { v4 as uuidv4 } from 'uuid';
import type { Match, Group, GroupStandingEntry } from '../../../types/tournament';
import type { KnockoutBracket } from '../types';

/**
 * Generates the SSVB bracket structure
 * Supports variable group sizes (3, 4, or 5 teams per group)
 *
 * Intermediate round pairings (higher seed vs lower seed from opposite end):
 * - 3er groups: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A
 * - 4er groups: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A (same, 4th eliminated)
 * - 5er groups: 3A vs 4D, 3B vs 4C, 3C vs 4B, 3D vs 4A (1st+2nd direct, 5th eliminated)
 */
export function generate4GroupSSVBKnockout(
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
