import type {
  Match,
  GroupStandingEntry,
  Group,
} from '../../types/tournament';
import type { TeamSeed, SeedMapping } from './types';
import { generateRound1Matches } from './round1Generator';
import { generateRound2Matches } from './round2Generator';
import { generateRound3And4Matches } from './round3And4Generator';

/**
 * Categorize teams into A (winners), B (2nd/3rd), C (4th)
 */
export function categorizeTeams(
  groupStandings: GroupStandingEntry[],
  groups: Group[]
): SeedMapping {
  const A: TeamSeed[] = [];
  const B: TeamSeed[] = [];
  const C: TeamSeed[] = [];

  // Sort groups by their natural order
  const sortedGroups = [...groups].sort((a, b) => {
    const indexA = groups.indexOf(a);
    const indexB = groups.indexOf(b);
    return indexA - indexB;
  });

  sortedGroups.forEach(group => {
    const groupTeams = groupStandings
      .filter(s => s.groupId === group.id)
      .sort((a, b) => a.groupRank - b.groupRank);

    groupTeams.forEach(team => {
      const seed: TeamSeed = {
        teamId: team.teamId,
        groupId: group.id,
        groupRank: team.groupRank,
        category: team.groupRank === 1 ? 'A' : team.groupRank === 4 ? 'C' : 'B',
      };

      if (team.groupRank === 1) {
        A.push(seed);
      } else if (team.groupRank === 4) {
        C.push(seed);
      } else {
        B.push(seed);
      }
    });
  });

  return { A, B, C };
}

/**
 * Generate all matches for the shortened main round
 */
export function generateShortMainRoundMatches(
  teamSeeds: SeedMapping,
  teamIdMap: Map<string, string>,
  numberOfCourts: number
): Match[] {
  const allMatches: Match[] = [];

  // Generate Round 1
  const { matches: round1Matches, qualificationMatches, bottomSemis } = generateRound1Matches(
    teamSeeds,
    teamIdMap,
    numberOfCourts
  );
  allMatches.push(...round1Matches);

  // Generate Round 2
  const { matches: round2Matches, quarterfinalMatches } = generateRound2Matches(
    teamSeeds,
    teamIdMap,
    numberOfCourts,
    qualificationMatches,
    bottomSemis,
    round1Matches.length + 1,
    round1Matches.length + 1
  );
  allMatches.push(...round2Matches);

  // Find 9-12 semis from round 2
  const bracket912Semis = round2Matches.filter(
    m => m.knockoutRound === 'placement-9-12' && m.round === 2
  );

  // Generate Rounds 3 and 4
  const bracket58Semis: Match[] = [];
  const laterRoundMatches = generateRound3And4Matches(
    numberOfCourts,
    quarterfinalMatches,
    bracket912Semis,
    bracket58Semis,
    allMatches.length + 1,
    allMatches.length + 1
  );
  allMatches.push(...laterRoundMatches);

  return allMatches;
}

// Re-export functions for compatibility
export { generateRound1Matches };
export { generateRound2Matches as generateSubsequentRoundMatches };
