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
