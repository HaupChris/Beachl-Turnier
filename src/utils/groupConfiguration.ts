/**
 * Utility functions for calculating group configurations with bye support
 */

export interface GroupConfigurationResult {
  isValid: boolean;
  numberOfGroups: number;
  byesNeeded: number;
  totalSlots: number;
  errorMessage?: string;
}

/**
 * Calculates the optimal group configuration for a given number of teams
 * Supports configurations with byes (Freilose) when teams don't divide evenly
 *
 * Rules:
 * - Minimum 2 groups, maximum 8 groups
 * - Byes are distributed as evenly as possible across groups
 * - Maximum (teamsPerGroup - 1) byes allowed (otherwise we'd have an empty group)
 */
export function calculateGroupConfiguration(
  teamCount: number,
  teamsPerGroup: 3 | 4 | 5
): GroupConfigurationResult {
  const minGroups = 2;
  const maxGroups = 8;
  const minTeams = teamsPerGroup * minGroups;
  const maxTeams = teamsPerGroup * maxGroups;

  // Not enough teams for minimum groups
  if (teamCount < minTeams) {
    return {
      isValid: false,
      numberOfGroups: 0,
      byesNeeded: 0,
      totalSlots: 0,
      errorMessage: `Mindestens ${minTeams} Teams für ${teamsPerGroup}er-Gruppen erforderlich`,
    };
  }

  // Too many teams for maximum groups
  if (teamCount > maxTeams) {
    return {
      isValid: false,
      numberOfGroups: 0,
      byesNeeded: 0,
      totalSlots: 0,
      errorMessage: `Maximal ${maxTeams} Teams (8 Gruppen à ${teamsPerGroup}) unterstützt`,
    };
  }

  // Calculate number of groups needed (round up to include all teams)
  const numberOfGroups = Math.ceil(teamCount / teamsPerGroup);
  const totalSlots = numberOfGroups * teamsPerGroup;
  const byesNeeded = totalSlots - teamCount;

  // Byes must be less than teamsPerGroup (otherwise we'd have an entire group of byes)
  // This should always be true with ceiling division, but let's verify
  if (byesNeeded >= teamsPerGroup) {
    return {
      isValid: false,
      numberOfGroups: 0,
      byesNeeded: 0,
      totalSlots: 0,
      errorMessage: `Ungültige Konfiguration für ${teamCount} Teams`,
    };
  }

  return {
    isValid: true,
    numberOfGroups,
    byesNeeded,
    totalSlots,
  };
}

/**
 * Returns a human-readable description of the group configuration
 */
export function getGroupConfigurationDescription(
  config: GroupConfigurationResult,
  teamsPerGroup: 3 | 4 | 5
): string {
  if (!config.isValid) {
    return config.errorMessage || 'Ungültige Konfiguration';
  }

  const matchesPerGroup = getMatchesPerGroup(teamsPerGroup);

  if (config.byesNeeded === 0) {
    return `${config.numberOfGroups} Gruppen à ${teamsPerGroup} Teams (${matchesPerGroup} Spiele/Gruppe)`;
  }

  return `${config.numberOfGroups} Gruppen à ${teamsPerGroup} Teams mit ${config.byesNeeded} Freilos${config.byesNeeded > 1 ? 'en' : ''} (${matchesPerGroup} Spiele/Gruppe)`;
}

/**
 * Returns the number of matches per group based on teams per group
 */
function getMatchesPerGroup(teamsPerGroup: 3 | 4 | 5): number {
  // Round robin: n*(n-1)/2
  return (teamsPerGroup * (teamsPerGroup - 1)) / 2;
}

/**
 * Distributes byes across groups as evenly as possible
 * Returns an array indicating how many byes each group should have
 */
export function distributeByesAcrossGroups(
  numberOfGroups: number,
  byesNeeded: number
): number[] {
  const byesPerGroup = Array(numberOfGroups).fill(0);

  // Distribute byes starting from the last group
  // This ensures the first groups are fuller
  for (let i = 0; i < byesNeeded; i++) {
    const groupIndex = numberOfGroups - 1 - (i % numberOfGroups);
    byesPerGroup[groupIndex]++;
  }

  return byesPerGroup;
}

/**
 * Returns the number of matches in the group phase
 */
export function getGroupPhaseMatchCount(numberOfGroups: number, teamsPerGroup: number): number {
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  return numberOfGroups * matchesPerGroup;
}
