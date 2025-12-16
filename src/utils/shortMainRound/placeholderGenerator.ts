import { v4 as uuidv4 } from 'uuid';
import type {
  Match,
  Tournament,
  KnockoutSettings,
  StandingEntry,
} from '../../types/tournament';
import {
  generateTwoGroupPlaceholder,
  generateThreeGroupPlaceholder,
  generateFourGroupPlaceholder,
  generateFiveToEightGroupPlaceholder,
} from './placeholders';

/**
 * Generate all matches for the shortened main round with placeholders
 * Adapts to different group counts (2-8 groups)
 */
export function generateShortMainRoundMatchesPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number
): Match[] {
  switch (numberOfGroups) {
    case 2:
      return generateTwoGroupPlaceholder(numberOfCourts);
    case 3:
      return generateThreeGroupPlaceholder(numberOfCourts);
    case 4:
      return generateFourGroupPlaceholder(numberOfCourts);
    default:
      // 5-8 groups
      return generateFiveToEightGroupPlaceholder(numberOfGroups, numberOfCourts);
  }
}

/**
 * Generates a placeholder shortened main round tournament (before group phase is complete)
 * Teams are not assigned yet, but placeholder text shows where they will come from
 */
export function generateShortMainRoundTournamentPlaceholder(
  parentTournament: Tournament,
  settings: KnockoutSettings
): { tournament: Tournament; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8) {
    throw new Error('BeachL-Kurze-Hauptrunde requires between 2 and 8 groups');
  }

  // Generate knockout matches with placeholders
  const matches = generateShortMainRoundMatchesPlaceholder(
    groups.length,
    parentTournament.numberOfCourts
  );

  // Initialize empty standings (will be populated later)
  const standings: StandingEntry[] = [];

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - Hauptrunde`,
    system: 'short-main-knockout',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    scheduling: parentTournament.scheduling,
    teams: [], // Will be populated when group phase completes
    matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig: {
      directQualification: 1,
      playoffQualification: 2,
      eliminated: 1,
      playThirdPlaceMatch: settings.playThirdPlaceMatch,
      useReferees: settings.useReferees,
    },
    knockoutSettings: settings,
    eliminatedTeamIds: [],
  };

  return { tournament, eliminatedTeamIds: [] };
}
