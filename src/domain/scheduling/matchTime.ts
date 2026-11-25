import type { Match, Tournament } from '../../types/tournament';
import { parseTimeToMinutes, formatMinutesToTime, calculateMatchDuration } from './core';

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
