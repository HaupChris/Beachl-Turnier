import { v4 as uuidv4 } from 'uuid';
import type {
  Team,
  Tournament,
  GroupStandingEntry,
  KnockoutSettings,
  StandingEntry,
} from '../../types/tournament';
import { generateShortMainRoundMatchesPlaceholder } from './placeholderGenerator';
import { populateShortMainRoundTeams } from './populateTeams';

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
  if (groups.length < 2 || groups.length > 8 || groups.length % 2 !== 0) {
    throw new Error('BeachL-Kurze-Hauptrunde requires between 2 and 8 groups');
  }

  const teamsPerGroup = parentTournament.groupPhaseConfig?.teamsPerGroup ?? 4;
  const matches = generateShortMainRoundMatchesPlaceholder(
    groups.length,
    parentTournament.numberOfCourts,
    teamsPerGroup
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
  const populated = populateShortMainRoundTeams(tournament, parentTournament, groupStandings);
  return populated;
}
