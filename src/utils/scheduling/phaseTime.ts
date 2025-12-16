import type { Match, Tournament } from '../../types/tournament';
import { parseTimeToMinutes, formatMinutesToTime, calculateMatchDuration } from './core';
import { calculateKnockoutMatchStartTime, calculateKnockoutMatchStartTimeWithOffset } from './knockoutTime';

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
