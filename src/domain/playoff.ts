import { v4 as uuidv4 } from 'uuid';
import type { Match, StandingEntry, Tournament, Team, PlayoffSettings, KnockoutSettings } from '../types/tournament';

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

/**
 * Generates a placeholder playoff tournament (before parent tournament is complete)
 * Teams are not assigned yet, but placeholder text shows where they will come from
 */
export function generatePlayoffTournamentPlaceholder(
  parentTournament: Tournament,
  settings: KnockoutSettings
): { tournament: Tournament; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const numberOfTeams = parentTournament.teams.length;

  // Generate matches with placeholders - pair adjacent teams based on rankings
  const matches: Match[] = [];
  for (let i = 0; i < numberOfTeams - 1; i += 2) {
    const matchNumber = matches.length + 1;
    const courtNumber = parentTournament.numberOfCourts > 0
      ? ((matchNumber - 1) % parentTournament.numberOfCourts) + 1
      : null;

    matches.push({
      id: uuidv4(),
      round: 1,
      matchNumber,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${i + 1}. Platz`,
      teamBPlaceholder: `${i + 2}. Platz`,
      teamASource: { type: 'standing' as const, rank: i + 1 },
      teamBSource: { type: 'standing' as const, rank: i + 2 },
      courtNumber,
      scores: [],
      winnerId: null,
      status: 'pending',
      isPlayoff: true,
      playoffForPlace: i + 1,
    });
  }

  // Initialize empty standings (will be populated later)
  const standings: StandingEntry[] = [];

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - Finale`,
    system: 'playoff',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    scheduling: parentTournament.scheduling,
    teams: [], // Will be populated when parent phase completes
    matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutSettings: settings,
    eliminatedTeamIds: [],
  };

  return { tournament, eliminatedTeamIds: [] };
}

/**
 * Populates playoff tournament with actual teams from parent tournament standings
 * Called when parent tournament (round-robin/swiss) completes
 */
export function populatePlayoffTeams(
  playoffTournament: Tournament,
  parentTournament: Tournament
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];
  const eliminatedTeamIds: string[] = [];

  // Copy all teams with new IDs based on standings order
  parentTournament.standings.forEach((standing, index) => {
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

  // Update matches with actual team IDs based on standings
  const updatedMatches = playoffTournament.matches.map(match => {
    const updatedMatch = { ...match };

    // Populate team from source (standings position)
    if (match.teamASource?.type === 'standing') {
      const standingIndex = match.teamASource.rank - 1;
      if (standingIndex < parentTournament.standings.length) {
        const standing = parentTournament.standings[standingIndex];
        updatedMatch.teamAId = teamIdMap.get(standing.teamId) || null;
      }
    }
    if (match.teamBSource?.type === 'standing') {
      const standingIndex = match.teamBSource.rank - 1;
      if (standingIndex < parentTournament.standings.length) {
        const standing = parentTournament.standings[standingIndex];
        updatedMatch.teamBId = teamIdMap.get(standing.teamId) || null;
      }
    }

    // Update status: if both teams are assigned, mark as scheduled
    if (updatedMatch.teamAId && updatedMatch.teamBId) {
      updatedMatch.status = 'scheduled';
    }

    return updatedMatch;
  });

  // Initialize standings for playoff phase
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
      ...playoffTournament,
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
