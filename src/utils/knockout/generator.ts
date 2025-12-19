import { v4 as uuidv4 } from 'uuid';
import type {
  Tournament,
  Team,
  GroupStandingEntry,
  KnockoutSettings,
  KnockoutConfig,
  StandingEntry,
  Group,
} from '../../types/tournament';
import type { KnockoutBracket } from './types';
import {
  generate2GroupKnockout,
  generate3GroupKnockout,
  generate4GroupSSVBKnockout,
  generate5to8GroupKnockout,
} from './brackets';
import { handleByeMatches } from './byeHandler';

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
      return generate2GroupKnockout(getTeam, numberOfCourts, playThirdPlaceMatch);
    case 3:
      return generate3GroupKnockout(groups, groupStandings, teamIdMap, getTeam, numberOfCourts, playThirdPlaceMatch);
    case 4:
      return generate4GroupSSVBKnockout(groups, groupStandings, teamIdMap, numberOfCourts, teamsPerGroup);
    case 5:
    case 6:
    case 7:
    case 8:
      return generate5to8GroupKnockout(numberOfGroups, groups, groupStandings, teamIdMap, getTeam, numberOfCourts, playThirdPlaceMatch);
    default:
      throw new Error(`Unsupported number of groups: ${numberOfGroups}`);
  }
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

  // Handle bye matches (when groups have fewer teams due to byes)
  const processedMatches = handleByeMatches(bracket.matches);

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
    matches: processedMatches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig,
    eliminatedTeamIds: eliminatedTeamIds,
  };

  return { tournament, teams, eliminatedTeamIds };
}
