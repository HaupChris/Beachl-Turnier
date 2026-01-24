import type { Match, SchedulingSettings } from '../../types/tournament';
import { parseTimeToMinutes, formatMinutesToTime } from './core';

// Knockout round order mapping (base values)
const KNOCKOUT_ROUND_ORDER: Record<string, number> = {
  'intermediate': 0,
  'quarterfinal': 1,
  'semifinal': 2,
  'third-place': 3,
  'final': 3, // Same round as third place
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

// Short main round knockout types that should use round-based scheduling
const SHORT_MAIN_ROUND_TYPES = new Set([
  'qualification',
  'placement-13-16',
  'top-quarterfinal',
  'placement-9-12',
  'top-semifinal',
  'placement-5-8',
  'third-place',
  'top-final',
]);

/**
 * Gets the effective round index for scheduling, considering both knockoutRound and round field.
 * For short-main-round tournaments, all matches are scheduled based on their round field
 * to ensure matches in the same round run in parallel regardless of knockoutRound type.
 */
function getEffectiveRoundIndex(match: Match): number {
  // For short-main-round matches: use the round field directly
  // This ensures all matches in the same round are scheduled together
  // (e.g., top-semifinal and placement-5-8 semis both in round 1 for 2 groups)
  if (match.knockoutRound && SHORT_MAIN_ROUND_TYPES.has(match.knockoutRound) && match.round !== undefined) {
    return match.round;
  }

  // For other knockout types, use the base mapping
  return match.knockoutRound ? KNOCKOUT_ROUND_ORDER[match.knockoutRound] ?? 0 : 0;
}

/**
 * Helper function for knockout match time calculation with a custom start offset
 */
export function calculateKnockoutMatchStartTimeWithOffset(
  match: Match,
  allMatches: Match[],
  matchDuration: number,
  minutesBetweenMatches: number,
  numberOfCourts: number,
  startMinutes: number
): string | null {
  const matchRoundIndex = getEffectiveRoundIndex(match);

  // Get all unique round indices from matches
  const allRoundIndices = [...new Set(allMatches.map(getEffectiveRoundIndex))].sort((a, b) => a - b);

  // Calculate cumulative time for previous rounds
  let cumulativeMinutes = startMinutes;

  for (const roundIndex of allRoundIndices) {
    if (roundIndex >= matchRoundIndex) break;

    const roundMatches = allMatches.filter(m => getEffectiveRoundIndex(m) === roundIndex);
    const timeSlots = Math.ceil(roundMatches.length / numberOfCourts);
    cumulativeMinutes += timeSlots * (matchDuration + minutesBetweenMatches);
  }

  // Calculate position within current round (same effective round index)
  const currentRoundMatches = allMatches
    .filter(m => getEffectiveRoundIndex(m) === matchRoundIndex)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const positionInRound = currentRoundMatches.findIndex(m => m.id === match.id);
  const timeSlotInRound = Math.floor(positionInRound / numberOfCourts);

  return formatMinutesToTime(cumulativeMinutes + timeSlotInRound * (matchDuration + minutesBetweenMatches));
}

/**
 * Calculates knockout match start time with phase transition support
 */
export function calculateKnockoutMatchStartTime(
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

  // Basic round order for standard knockout
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
