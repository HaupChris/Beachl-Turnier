import type { SchedulingSettings } from '../../types/tournament';
import { parseTimeToMinutes, formatMinutesToTime, calculateMatchDuration } from './core';

/**
 * Estimates the total match count and duration for planning purposes
 * (before the tournament has started)
 */
export function estimateTournamentDuration(
  teamCount: number,
  system: string,
  numberOfCourts: number,
  numberOfRounds: number | undefined,
  setsPerMatch: number,
  pointsPerSet: number,
  pointsPerThirdSet: number | undefined,
  scheduling: SchedulingSettings
): {
  matchCount: number;
  totalMinutes: number;
  endTime: string;
} {
  // Estimate match count based on system
  let matchCount: number;

  if (system === 'round-robin') {
    // Round robin: n * (n-1) / 2 matches
    matchCount = (teamCount * (teamCount - 1)) / 2;
  } else if (system === 'swiss') {
    // Swiss: (teams / 2) matches per round * numberOfRounds
    const matchesPerRound = Math.floor(teamCount / 2);
    matchCount = matchesPerRound * (numberOfRounds ?? 1);
  } else if (system === 'group-phase') {
    // Group phase: estimate based on 4 teams per group
    const teamsPerGroup = 4;
    const numberOfGroups = Math.ceil(teamCount / teamsPerGroup);
    const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2; // 6 for 4 teams
    matchCount = numberOfGroups * matchesPerGroup;
  } else {
    // Default fallback
    matchCount = teamCount;
  }

  const matchDuration = calculateMatchDuration(
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  const { minutesBetweenMatches } = scheduling;
  const numberOfTimeSlots = Math.ceil(matchCount / numberOfCourts);
  const totalMinutes = numberOfTimeSlots * (matchDuration + minutesBetweenMatches) - minutesBetweenMatches;

  const startMinutes = parseTimeToMinutes(scheduling.startTime);
  const endTime = formatMinutesToTime(startMinutes + totalMinutes);

  return { matchCount, totalMinutes, endTime };
}

/**
 * Calculates how many teams advance to knockout based on group size
 */
function calculateTeamsInKnockout(numberOfGroups: number, teamsPerGroup: number): number {
  // Teams that advance per group:
  // - 3er groups: all 3 (1st direct, 2nd+3rd intermediate)
  // - 4er groups: 3 (1st direct, 2nd+3rd intermediate, 4th out)
  // - 5er groups: 4 (1st+2nd direct, 3rd+4th intermediate, 5th out)
  let teamsAdvancingPerGroup: number;
  if (teamsPerGroup === 3) {
    teamsAdvancingPerGroup = 3; // All advance
  } else if (teamsPerGroup === 4) {
    teamsAdvancingPerGroup = 3; // Top 3, last out
  } else if (teamsPerGroup === 5) {
    teamsAdvancingPerGroup = 4; // Top 4, last out
  } else {
    teamsAdvancingPerGroup = Math.ceil(teamsPerGroup * 0.75); // Default: ~75% advance
  }
  return numberOfGroups * teamsAdvancingPerGroup;
}

/**
 * Estimates knockout matches based on teams and groups
 */
function estimateKnockoutMatches(_teamsInKnockout: number, numberOfGroups: number): number {
  // Intermediate round: 2nd vs 3rd from different groups (N matches for N groups)
  const intermediateMatches = numberOfGroups;

  // After intermediate: N group winners + N intermediate winners = 2N teams
  // These play standard knockout: 2N-1 matches (QF/SF/Final structure)
  const teamsAfterIntermediate = numberOfGroups * 2;

  // Standard knockout structure
  if (teamsAfterIntermediate <= 4) {
    // 2 semis + 1 final
    return intermediateMatches + 2 + 1;
  } else if (teamsAfterIntermediate <= 8) {
    // 4 quarters + 2 semis + 1 final
    return intermediateMatches + 4 + 2 + 1;
  } else {
    // Round of 16 + quarters + semis + final
    return intermediateMatches + 8 + 4 + 2 + 1;
  }
}

/**
 * Estimates duration for SSVB group phase + knockout tournament
 * Supports variable group sizes (3, 4, or 5 teams per group)
 */
export function estimateSSVBTournamentDuration(
  teamCount: number,
  numberOfCourts: number,
  groupPhaseSetsPerMatch: number,
  groupPhasePointsPerSet: number,
  groupPhasePointsPerThirdSet: number | undefined,
  knockoutSetsPerMatch: number,
  knockoutPointsPerSet: number,
  knockoutPointsPerThirdSet: number | undefined,
  playThirdPlaceMatch: boolean,
  scheduling: SchedulingSettings,
  teamsPerGroup: number = 4
): {
  groupPhaseMatchCount: number;
  knockoutMatchCount: number;
  totalMatchCount: number;
  groupPhaseMinutes: number;
  knockoutMinutes: number;
  totalMinutes: number;
  groupPhaseEndTime: string;
  knockoutEndTime: string;
} {
  const numberOfGroups = Math.floor(teamCount / teamsPerGroup);

  if (numberOfGroups < 2 || numberOfGroups > 8) {
    throw new Error(`Format requires 2-8 groups (current: ${numberOfGroups} groups with ${teamsPerGroup} teams each)`);
  }

  // Group phase matches: round-robin within each group
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  const groupPhaseMatchCount = numberOfGroups * matchesPerGroup;

  // Calculate knockout matches based on group size and count
  const teamsInKnockout = calculateTeamsInKnockout(numberOfGroups, teamsPerGroup);
  let knockoutMatchCount = estimateKnockoutMatches(teamsInKnockout, numberOfGroups);
  if (playThirdPlaceMatch) {
    knockoutMatchCount += 1;
  }

  // Calculate group phase duration
  const groupPhaseMatchDuration = calculateMatchDuration(
    groupPhaseSetsPerMatch,
    groupPhasePointsPerSet,
    groupPhasePointsPerThirdSet,
    scheduling
  );

  const groupPhaseTimeSlots = Math.ceil(groupPhaseMatchCount / numberOfCourts);
  const groupPhaseMinutes = groupPhaseTimeSlots * (groupPhaseMatchDuration + scheduling.minutesBetweenMatches)
    - scheduling.minutesBetweenMatches;

  // Calculate knockout duration
  const knockoutMatchDuration = calculateMatchDuration(
    knockoutSetsPerMatch,
    knockoutPointsPerSet,
    knockoutPointsPerThirdSet,
    scheduling
  );

  const knockoutTimeSlots = Math.ceil(knockoutMatchCount / numberOfCourts);
  const knockoutMinutes = knockoutTimeSlots * (knockoutMatchDuration + scheduling.minutesBetweenMatches)
    - scheduling.minutesBetweenMatches;

  // Calculate times
  const startMinutes = parseTimeToMinutes(scheduling.startTime);
  const groupPhaseEndMinutes = startMinutes + groupPhaseMinutes;
  const knockoutStartMinutes = groupPhaseEndMinutes + scheduling.minutesBetweenPhases;
  const knockoutEndMinutes = knockoutStartMinutes + knockoutMinutes;

  return {
    groupPhaseMatchCount,
    knockoutMatchCount,
    totalMatchCount: groupPhaseMatchCount + knockoutMatchCount,
    groupPhaseMinutes,
    knockoutMinutes,
    totalMinutes: groupPhaseMinutes + scheduling.minutesBetweenPhases + knockoutMinutes,
    groupPhaseEndTime: formatMinutesToTime(groupPhaseEndMinutes),
    knockoutEndTime: formatMinutesToTime(knockoutEndMinutes),
  };
}
