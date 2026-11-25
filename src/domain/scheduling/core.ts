import type { SchedulingSettings } from '../../types/tournament';

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
