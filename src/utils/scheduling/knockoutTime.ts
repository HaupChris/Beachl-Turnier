import type { Match, SchedulingSettings } from '../../types/tournament';
import { parseTimeToMinutes, formatMinutesToTime } from './core';

// Knockout round order mapping
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
  const matchRoundIndex = match.knockoutRound ? KNOCKOUT_ROUND_ORDER[match.knockoutRound] ?? 0 : 0;

  // Calculate cumulative time for previous rounds
  let cumulativeMinutes = startMinutes;

  for (let r = 0; r < matchRoundIndex; r++) {
    const roundNames = Object.keys(KNOCKOUT_ROUND_ORDER).filter(k => KNOCKOUT_ROUND_ORDER[k] === r);
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
