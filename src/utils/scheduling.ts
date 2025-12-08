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
 * Estimates duration for SSVB group phase + knockout tournament
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
  scheduling: SchedulingSettings
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
  // Validate team count (must be multiple of 4 for SSVB)
  const teamsPerGroup = 4;
  const numberOfGroups = Math.floor(teamCount / teamsPerGroup);

  if (numberOfGroups < 2 || numberOfGroups > 4) {
    // Default to 4 groups if invalid
    throw new Error('SSVB format requires 8-16 teams (2-4 groups of 4)');
  }

  // Group phase matches: 6 matches per group (4 teams, round robin)
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  const groupPhaseMatchCount = numberOfGroups * matchesPerGroup;

  // Knockout matches (for 4 groups):
  // - 4 intermediate round matches
  // - 4 quarterfinal matches
  // - 2 semifinal matches
  // - 1 final + optionally 1 third place match
  let knockoutMatchCount = 4 + 4 + 2 + 1;
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
 * Calculates start time for knockout matches considering round structure
 */
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
