import type { Match, Tournament, SchedulingSettings } from '../types/tournament';

// Default scheduling settings
export const DEFAULT_SCHEDULING: SchedulingSettings = {
  startTime: '09:00',
  endTime: '17:00',
  minutesPer21PointSet: 20,
  minutesPer15PointSet: 12,
  minutesBetweenMatches: 5,
  minutesBetweenPhases: 0,
};

/**
 * Calculates the estimated duration of a single match in minutes
 */
export function calculateMatchDuration(
  setsPerMatch: number,
  pointsPerSet: number,
  pointsPerThirdSet: number | undefined,
  scheduling: SchedulingSettings
): number {
  const { minutesPer21PointSet, minutesPer15PointSet } = scheduling;

  if (setsPerMatch === 1) {
    // Single set
    return pointsPerSet === 21 ? minutesPer21PointSet : minutesPer15PointSet;
  } else if (setsPerMatch === 2) {
    // Two sets (both use pointsPerSet)
    return pointsPerSet === 21 ? 2 * minutesPer21PointSet : 2 * minutesPer15PointSet;
  } else {
    // Best of 3: two sets at pointsPerSet + one set at pointsPerThirdSet (worst case)
    const twoSetsTime = pointsPerSet === 21 ? 2 * minutesPer21PointSet : 2 * minutesPer15PointSet;
    const thirdSetTime = (pointsPerThirdSet ?? 15) === 21 ? minutesPer21PointSet : minutesPer15PointSet;
    return twoSetsTime + thirdSetTime;
  }
}

/**
 * Parses a time string "HH:MM" into total minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Formats total minutes since midnight to "HH:MM" string
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculates the scheduled start time for a specific match
 */
export function calculateMatchStartTime(
  match: Match,
  allMatches: Match[],
  tournament: Tournament
): string | null {
  const scheduling = tournament.scheduling;
  if (!scheduling) return null;

  const { numberOfCourts, setsPerMatch, pointsPerSet, pointsPerThirdSet } = tournament;
  const { minutesBetweenMatches } = scheduling;

  const matchDuration = calculateMatchDuration(
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  // Sort matches by round, then by matchNumber to get the order
  const sortedMatches = [...allMatches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });

  // Find the index of the current match
  const matchIndex = sortedMatches.findIndex(m => m.id === match.id);
  if (matchIndex === -1) return null;

  // Calculate which time slot this match is in
  // With multiple courts, matches run in parallel
  const timeSlot = Math.floor(matchIndex / numberOfCourts);

  // Calculate start time
  const startMinutes = parseTimeToMinutes(scheduling.startTime);
  const matchStartMinutes = startMinutes + timeSlot * (matchDuration + minutesBetweenMatches);

  return formatMinutesToTime(matchStartMinutes);
}

/**
 * Calculates the estimated end time of the tournament
 */
export function calculateTournamentEndTime(tournament: Tournament): string | null {
  const scheduling = tournament.scheduling;
  if (!scheduling || tournament.matches.length === 0) return null;

  const { numberOfCourts, setsPerMatch, pointsPerSet, pointsPerThirdSet, matches } = tournament;
  const { minutesBetweenMatches } = scheduling;

  const matchDuration = calculateMatchDuration(
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  // Calculate number of time slots needed
  const numberOfTimeSlots = Math.ceil(matches.length / numberOfCourts);

  // Calculate total duration
  const totalDuration = numberOfTimeSlots * (matchDuration + minutesBetweenMatches) - minutesBetweenMatches;

  const startMinutes = parseTimeToMinutes(scheduling.startTime);
  const endMinutes = startMinutes + totalDuration;

  return formatMinutesToTime(endMinutes);
}

/**
 * Checks if the tournament exceeds the planned end time
 */
export function checkTimeOverrun(tournament: Tournament): {
  exceeds: boolean;
  estimatedEnd: string | null;
  plannedEnd: string | null;
  overrunMinutes: number;
} {
  const scheduling = tournament.scheduling;
  if (!scheduling) {
    return { exceeds: false, estimatedEnd: null, plannedEnd: null, overrunMinutes: 0 };
  }

  const estimatedEnd = calculateTournamentEndTime(tournament);
  if (!estimatedEnd) {
    return { exceeds: false, estimatedEnd: null, plannedEnd: scheduling.endTime, overrunMinutes: 0 };
  }

  const estimatedEndMinutes = parseTimeToMinutes(estimatedEnd);
  const plannedEndMinutes = parseTimeToMinutes(scheduling.endTime);
  const overrunMinutes = Math.max(0, estimatedEndMinutes - plannedEndMinutes);

  return {
    exceeds: estimatedEndMinutes > plannedEndMinutes,
    estimatedEnd,
    plannedEnd: scheduling.endTime,
    overrunMinutes,
  };
}

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
  // Formula: n * (n-1) / 2 matches per group
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  const groupPhaseMatchCount = numberOfGroups * matchesPerGroup;

  // Calculate knockout matches based on group size and count
  // Teams advancing to knockout depends on group size:
  // - 3er groups: all 3 advance (1st direct, 2nd+3rd intermediate)
  // - 4er groups: top 3 advance (1st direct, 2nd+3rd intermediate), 4th out
  // - 5er groups: top 4 advance (1st+2nd direct, 3rd+4th intermediate), 5th out
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

/**
 * Calculates match start time considering phase transitions
 */
export function calculateMatchStartTimeWithPhases(
  match: Match,
  allMatches: Match[],
  tournament: Tournament,
  previousPhaseEndMinutes?: number
): string | null {
  const scheduling = tournament.scheduling;
  if (!scheduling) return null;

  const { numberOfCourts, setsPerMatch, pointsPerSet, pointsPerThirdSet } = tournament;
  const { minutesBetweenMatches } = scheduling;

  const matchDuration = calculateMatchDuration(
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  // For knockout matches, consider round dependencies
  if (tournament.system === 'knockout' && match.knockoutRound) {
    return calculateKnockoutMatchStartTime(
      match,
      allMatches,
      matchDuration,
      minutesBetweenMatches,
      numberOfCourts,
      scheduling,
      previousPhaseEndMinutes
    );
  }

  // Sort matches by round, then by matchNumber
  const sortedMatches = [...allMatches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });

  const matchIndex = sortedMatches.findIndex(m => m.id === match.id);
  if (matchIndex === -1) return null;

  const timeSlot = Math.floor(matchIndex / numberOfCourts);
  const startMinutes = previousPhaseEndMinutes
    ? previousPhaseEndMinutes + scheduling.minutesBetweenPhases
    : parseTimeToMinutes(scheduling.startTime);
  const matchStartMinutes = startMinutes + timeSlot * (matchDuration + minutesBetweenMatches);

  return formatMinutesToTime(matchStartMinutes);
}

/**
 * Calculates the end time in minutes for a tournament phase
 */
export function calculatePhaseEndMinutes(
  tournament: Tournament,
  startMinutes?: number
): number {
  const scheduling = tournament.scheduling;
  if (!scheduling || tournament.matches.length === 0) {
    return startMinutes ?? parseTimeToMinutes(scheduling?.startTime ?? '09:00');
  }

  const { numberOfCourts, setsPerMatch, pointsPerSet, pointsPerThirdSet, matches } = tournament;
  const { minutesBetweenMatches } = scheduling;

  const matchDuration = calculateMatchDuration(
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  // Calculate number of time slots needed
  const numberOfTimeSlots = Math.ceil(matches.length / numberOfCourts);

  // Calculate total duration
  const totalDuration = numberOfTimeSlots * (matchDuration + minutesBetweenMatches) - minutesBetweenMatches;

  const phaseStart = startMinutes ?? parseTimeToMinutes(scheduling.startTime);
  return phaseStart + totalDuration;
}

/**
 * Calculates the scheduled start time for a match, considering tournament phases
 * This function is phase-aware and will calculate times based on when previous phases end
 */
export function calculateMatchStartTimeForPhase(
  match: Match,
  allMatchesInPhase: Match[],
  tournament: Tournament,
  previousPhases: Tournament[]
): string | null {
  const scheduling = tournament.scheduling;
  if (!scheduling) return null;

  // Calculate the end time of all previous phases
  let currentStartMinutes = parseTimeToMinutes(scheduling.startTime);

  for (const previousPhase of previousPhases) {
    if (!previousPhase.scheduling) continue;

    // Use the same scheduling settings from current tournament for previous phases
    const previousPhaseScheduling = previousPhase.scheduling;
    const previousMatchDuration = calculateMatchDuration(
      previousPhase.setsPerMatch,
      previousPhase.pointsPerSet,
      previousPhase.pointsPerThirdSet,
      previousPhaseScheduling
    );

    const previousTimeSlots = Math.ceil(previousPhase.matches.length / previousPhase.numberOfCourts);
    const previousDuration = previousTimeSlots * (previousMatchDuration + previousPhaseScheduling.minutesBetweenMatches)
      - previousPhaseScheduling.minutesBetweenMatches;

    currentStartMinutes += previousDuration + (scheduling.minutesBetweenPhases ?? 0);
  }

  // Now calculate the time for this match within its phase
  const { numberOfCourts, setsPerMatch, pointsPerSet, pointsPerThirdSet } = tournament;
  const { minutesBetweenMatches } = scheduling;

  const matchDuration = calculateMatchDuration(
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  // For knockout matches, use the knockout-specific calculation
  if (match.knockoutRound) {
    return calculateKnockoutMatchStartTimeWithOffset(
      match,
      allMatchesInPhase,
      matchDuration,
      minutesBetweenMatches,
      numberOfCourts,
      currentStartMinutes
    );
  }

  // Sort matches by round, then by matchNumber
  const sortedMatches = [...allMatchesInPhase].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });

  const matchIndex = sortedMatches.findIndex(m => m.id === match.id);
  if (matchIndex === -1) return null;

  const timeSlot = Math.floor(matchIndex / numberOfCourts);
  const matchStartMinutes = currentStartMinutes + timeSlot * (matchDuration + minutesBetweenMatches);

  return formatMinutesToTime(matchStartMinutes);
}

/**
 * Helper function for knockout match time calculation with a custom start offset
 */
function calculateKnockoutMatchStartTimeWithOffset(
  match: Match,
  allMatches: Match[],
  matchDuration: number,
  minutesBetweenMatches: number,
  numberOfCourts: number,
  startMinutes: number
): string | null {
  // Group matches by knockout round
  const roundOrder: Record<string, number> = {
    'intermediate': 0,
    'quarterfinal': 1,
    'semifinal': 2,
    'third-place': 3,
    'final': 3,
    // Placement tree rounds
    'placement-round-1': 0,
    'placement-round-2': 1,
    'placement-round-3': 2,
    'placement-round-4': 3,
    'placement-final': 4,
    // Short main round
    'qualification': 0,
    'placement-13-16': 1,
    'top-quarterfinal': 1,
    'placement-9-12': 2,
    'top-semifinal': 2,
    'placement-5-8': 3,
    'top-final': 4,
  };

  const matchRoundIndex = match.knockoutRound ? roundOrder[match.knockoutRound] ?? 0 : 0;

  // Calculate cumulative time for previous rounds
  let cumulativeMinutes = startMinutes;

  for (let r = 0; r < matchRoundIndex; r++) {
    const roundNames = Object.keys(roundOrder).filter(k => roundOrder[k] === r);
    const roundMatches = allMatches.filter(m => m.knockoutRound && roundNames.includes(m.knockoutRound));
    const timeSlots = Math.ceil(roundMatches.length / numberOfCourts);
    cumulativeMinutes += timeSlots * (matchDuration + minutesBetweenMatches);
  }

  // Calculate position within current round
  const currentRoundMatches = allMatches
    .filter(m => m.knockoutRound === match.knockoutRound)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const positionInRound = currentRoundMatches.findIndex(m => m.id === match.id);
  const timeSlotInRound = Math.floor(positionInRound / numberOfCourts);

  return formatMinutesToTime(cumulativeMinutes + timeSlotInRound * (matchDuration + minutesBetweenMatches));
}

function calculateKnockoutMatchStartTime(
  match: Match,
  allMatches: Match[],
  matchDuration: number,
  minutesBetweenMatches: number,
  numberOfCourts: number,
  scheduling: SchedulingSettings,
  previousPhaseEndMinutes?: number
): string | null {
  const startMinutes = previousPhaseEndMinutes
    ? previousPhaseEndMinutes + scheduling.minutesBetweenPhases
    : parseTimeToMinutes(scheduling.startTime);

  // Group matches by knockout round
  const roundOrder: Record<string, number> = {
    'intermediate': 0,
    'quarterfinal': 1,
    'semifinal': 2,
    'third-place': 3,
    'final': 3, // Same round as third place
  };

  const matchRoundIndex = match.knockoutRound ? roundOrder[match.knockoutRound] ?? 0 : 0;

  // Calculate cumulative time for previous rounds
  let cumulativeMinutes = startMinutes;

  for (let r = 0; r < matchRoundIndex; r++) {
    const roundName = Object.keys(roundOrder).find(k => roundOrder[k] === r);
    const roundMatches = allMatches.filter(m => m.knockoutRound === roundName);
    const timeSlots = Math.ceil(roundMatches.length / numberOfCourts);
    cumulativeMinutes += timeSlots * (matchDuration + minutesBetweenMatches);
  }

  // Calculate position within current round
  const currentRoundMatches = allMatches
    .filter(m => m.knockoutRound === match.knockoutRound)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const positionInRound = currentRoundMatches.findIndex(m => m.id === match.id);
  const timeSlotInRound = Math.floor(positionInRound / numberOfCourts);

  return formatMinutesToTime(cumulativeMinutes + timeSlotInRound * (matchDuration + minutesBetweenMatches));
}
