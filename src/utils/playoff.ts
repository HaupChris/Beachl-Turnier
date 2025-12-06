import { v4 as uuidv4 } from 'uuid';
import type { Match, StandingEntry, Tournament, Team, PlayoffSettings } from '../types/tournament';

/**
 * Generates a new playoff tournament based on a parent tournament's standings.
 * Teams are copied with new IDs but maintain their seeding from the parent standings.
 * Each adjacent pair plays for placement (1st vs 2nd, 3rd vs 4th, etc.)
 */
export function generatePlayoffTournament(
  parentTournament: Tournament,
  settings: PlayoffSettings
): { tournament: Tournament; teams: Team[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  // Create new team IDs but keep original names and seed based on standings
  const teamIdMap = new Map<string, string>(); // old ID -> new ID
  const teams: Team[] = parentTournament.standings.map((standing, index) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    const newId = uuidv4();
    teamIdMap.set(standing.teamId, newId);
    return {
      id: newId,
      name: originalTeam?.name ?? `Team ${index + 1}`,
      seedPosition: index + 1, // Seeding based on standings position
    };
  });

  // Generate matches - pair adjacent teams
  const matches: Match[] = [];
  for (let i = 0; i < teams.length - 1; i += 2) {
    const teamA = teams[i];
    const teamB = teams[i + 1];

    const matchNumber = matches.length + 1;
    const courtNumber = parentTournament.numberOfCourts > 0
      ? ((matchNumber - 1) % parentTournament.numberOfCourts) + 1
      : null;

    matches.push({
      id: uuidv4(),
      round: 1, // Playoff tournament has only 1 round
      matchNumber,
      teamAId: teamA.id,
      teamBId: teamB.id,
      courtNumber,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      isPlayoff: true,
      playoffForPlace: i + 1, // 1st place match, 3rd place match, etc.
    });
  }

  // Initialize standings for the playoff tournament
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
    name: `${parentTournament.name} - Finale`,
    system: 'playoff',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    teams: [], // Will be set in reducer
    matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
  };

  return { tournament, teams };
}

/**
 * Returns the label for a playoff match based on the place being contested
 */
export function getPlayoffMatchLabel(playoffForPlace: number): string {
  const place1 = playoffForPlace;
  const place2 = playoffForPlace + 1;
  return `Spiel um Platz ${place1}/${place2}`;
}
