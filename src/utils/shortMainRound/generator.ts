import { v4 as uuidv4 } from 'uuid';
import type {
  Team,
  Tournament,
  GroupStandingEntry,
  KnockoutSettings,
  StandingEntry,
} from '../../types/tournament';
import { categorizeTeams, generateShortMainRoundMatches } from './matchGenerator';

/**
 * BeachL-Kurze-Hauptrunde: Shortened Main Round with Byes
 *
 * Flexible structure supporting 2-8 groups (8-32 teams)
 *
 * Standard format for 16 teams (4 groups of 4):
 * - A = Group winners (4 teams) → Direct to Quarterfinals (bye in Quali round)
 * - B = Group 2nd + 3rd (8 teams) → Play Qualification round
 * - C = Group 4th (4 teams) → Bottom bracket for places 13-16
 *
 * Match structure:
 * 1. Qualification Round: B teams play (8→4), losers → 9-12 bracket
 * 2. Quarterfinals: A teams vs Qualification winners
 * 3. Semifinals + Finals for Top-4
 * 4. 5-8 Bracket: QF losers play for places 5-8
 * 5. 9-12 Bracket: Quali losers play for places 9-12
 * 6. 13-16 Bracket: C teams play for places 13-16
 *
 * For other team counts, the bracket adapts accordingly.
 */

/**
 * Generates the shortened main round knockout tournament from group phase results
 */
export function generateShortMainRoundTournament(
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[],
  settings: KnockoutSettings
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  // Get groups from parent tournament
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8) {
    throw new Error('BeachL-Kurze-Hauptrunde requires between 2 and 8 groups');
  }

  // Categorize teams
  const teamSeeds = categorizeTeams(groupStandings, groups);

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];

  // Create teams in seed order
  let seedPosition = 1;
  [...teamSeeds.A, ...teamSeeds.B, ...teamSeeds.C].forEach((seed) => {
    const originalTeam = parentTournament.teams.find(t => t.id === seed.teamId);
    if (!originalTeam) return;

    const newId = uuidv4();
    teamIdMap.set(seed.teamId, newId);
    teams.push({
      id: newId,
      name: originalTeam.name,
      seedPosition: seedPosition++,
    });
  });

  // Generate all matches
  const matches = generateShortMainRoundMatches(
    teamSeeds,
    teamIdMap,
    parentTournament.numberOfCourts
  );

  // Initialize standings
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
    name: `${parentTournament.name} - Hauptrunde`,
    system: 'short-main-knockout',
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
      directQualification: 1, // Group winners direct to QF
      playoffQualification: 2, // 2nd and 3rd play qualification
      eliminated: 1, // 4th place to bottom bracket
      playThirdPlaceMatch: settings.playThirdPlaceMatch,
      useReferees: settings.useReferees,
    },
    eliminatedTeamIds: [],
  };

  return { tournament, teams, eliminatedTeamIds: [] };
}
