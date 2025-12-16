import { v4 as uuidv4 } from 'uuid';
import type {
  Tournament,
  KnockoutSettings,
  KnockoutConfig,
  StandingEntry,
  Match,
} from '../../types/tournament';
import {
  generate2GroupKnockoutPlaceholder,
  generate3GroupKnockoutPlaceholder,
  generate4GroupSSVBKnockoutPlaceholder,
  generate5to8GroupKnockoutPlaceholder,
} from './brackets';

/**
 * Generates flexible bracket placeholder based on number of groups
 */
function generateFlexibleBracketPlaceholder(
  numberOfGroups: number,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean,
  useReferees: boolean
): { matches: Match[] } {
  switch (numberOfGroups) {
    case 2:
      return generate2GroupKnockoutPlaceholder(numberOfCourts, playThirdPlaceMatch);
    case 3:
      return generate3GroupKnockoutPlaceholder(numberOfCourts, playThirdPlaceMatch);
    case 4:
      return generate4GroupSSVBKnockoutPlaceholder(numberOfGroups, numberOfCourts, playThirdPlaceMatch, useReferees);
    case 5:
    case 6:
    case 7:
    case 8:
      return generate5to8GroupKnockoutPlaceholder(numberOfGroups, numberOfCourts, playThirdPlaceMatch);
    default:
      throw new Error(`Unsupported number of groups: ${numberOfGroups}`);
  }
}

/**
 * Generates a placeholder knockout tournament (before group phase is complete)
 * Teams are not assigned yet, but placeholder text shows where they will come from
 */
export function generateKnockoutTournamentPlaceholder(
  parentTournament: Tournament,
  settings: KnockoutSettings
): { tournament: Tournament; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8) {
    throw new Error('SSVB knockout requires between 2 and 8 groups');
  }

  // Generate knockout matches with placeholders based on number of groups
  const bracket = generateFlexibleBracketPlaceholder(
    groups.length,
    parentTournament.numberOfCourts,
    settings.playThirdPlaceMatch,
    settings.useReferees
  );

  // Initialize empty standings (will be populated later)
  const standings: StandingEntry[] = [];

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
    // Copy scheduling from parent tournament
    scheduling: parentTournament.scheduling,
    teams: [], // Will be populated when group phase completes
    matches: bracket.matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig,
    knockoutSettings: settings,
    eliminatedTeamIds: [],
  };

  return { tournament, eliminatedTeamIds: [] };
}
