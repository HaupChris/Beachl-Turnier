import { v4 as uuidv4 } from 'uuid';
import type {
  Team,
  Tournament,
  GroupStandingEntry,
  KnockoutSettings,
  StandingEntry,
} from '../../types/tournament';
import { createSeedOrder } from './helpers';
import { generatePlacementTreeMatches } from './matchGenerator';

/**
 * Generates the placement tree knockout tournament from group phase results
 */
export function generatePlacementTreeTournament(
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[],
  settings: KnockoutSettings
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const groups = parentTournament.groupPhaseConfig?.groups || [];

  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];

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

  const matches = generatePlacementTreeMatches(
    teams,
    parentTournament.numberOfCourts
  );

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

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - Platzierungsbaum`,
    system: 'placement-tree',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    teams: [],
    matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig: {
      directQualification: 0,
      playoffQualification: 0,
      eliminated: 0,
      playThirdPlaceMatch: true,
      useReferees: settings.useReferees,
    },
    eliminatedTeamIds: [],
  };

  return { tournament, teams, eliminatedTeamIds: [] };
}
