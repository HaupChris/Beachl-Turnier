import { v4 as uuidv4 } from 'uuid';
import type {
  Team,
  Tournament,
  GroupStandingEntry,
  StandingEntry,
} from '../../types/tournament';
import { createSeedOrder } from './helpers';

/**
 * Populates placement tree tournament with actual teams from group phase standings
 * Called when group phase completes
 */
export function populatePlacementTreeTeams(
  knockoutTournament: Tournament,
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[]
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const groups = parentTournament.groupPhaseConfig?.groups || [];

  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];
  const eliminatedTeamIds: string[] = [];

  const seedOrder = createSeedOrder(groupStandings, groups);

  seedOrder.forEach((standing, index) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    const newId = uuidv4();
    teamIdMap.set(standing.teamId, newId);
    teams.push({
      id: newId,
      name: originalTeam.name,
      seedPosition: index + 1,
    });
  });

  const getTeamId = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  const updatedMatches = knockoutTournament.matches.map(match => {
    const updatedMatch = { ...match };

    if (match.teamASource?.type === 'group') {
      updatedMatch.teamAId = getTeamId(match.teamASource.groupIndex, match.teamASource.rank);
    }
    if (match.teamBSource?.type === 'group') {
      updatedMatch.teamBId = getTeamId(match.teamBSource.groupIndex, match.teamBSource.rank);
    }

    if (updatedMatch.teamAId && updatedMatch.teamBId && !updatedMatch.dependsOn) {
      updatedMatch.status = 'scheduled';
    }

    return updatedMatch;
  });

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
