import { v4 as uuidv4 } from 'uuid';
import type {
  Tournament,
  Team,
  GroupStandingEntry,
  StandingEntry,
} from '../../types/tournament';
import { handleByeMatches } from './byeHandler';

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
  let populatedMatches = knockoutTournament.matches.map(match => {
    const updatedMatch = { ...match };

    // Populate team from source (group standings)
    if (match.teamASource?.type === 'group') {
      updatedMatch.teamAId = getTeamId(match.teamASource.groupIndex, match.teamASource.rank);
    }
    if (match.teamBSource?.type === 'group') {
      updatedMatch.teamBId = getTeamId(match.teamBSource.groupIndex, match.teamBSource.rank);
    }

    return updatedMatch;
  });

  // Handle bye matches (when a group doesn't have enough teams for a rank)
  // This auto-advances teams when their opponent doesn't exist
  populatedMatches = handleByeMatches(populatedMatches);

  // Update match statuses after bye handling
  const updatedMatches = populatedMatches.map(match => {
    if (match.status === 'completed') return match; // Already handled by bye logic

    const updatedMatch = { ...match };
    if (updatedMatch.teamAId && updatedMatch.teamBId && !updatedMatch.dependsOn) {
      updatedMatch.status = 'scheduled';
    } else if (updatedMatch.teamAId && updatedMatch.dependsOn?.teamB && !updatedMatch.dependsOn?.teamA) {
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
