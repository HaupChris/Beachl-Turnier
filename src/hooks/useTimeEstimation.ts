/**
 * Time Estimation Hook
 *
 * Calculates tournament duration and end time estimates.
 * Extracted from useConfigureForm to reduce complexity.
 */

import { useMemo } from 'react';
import type { SchedulingSettings, KnockoutSettings, TournamentSystem } from '../types/tournament';
import { calculateTimeEstimation, calculateEndTime } from '../domain';

interface UseTimeEstimationParams {
  teamsCount: number;
  system: TournamentSystem;
  isGroupBasedSystem: boolean;
  teamsPerGroup: 3 | 4 | 5;
  numberOfCourts: number;
  numberOfRounds: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet: number;
  knockoutSettings: KnockoutSettings;
  enablePlayoff: boolean;
  scheduling: SchedulingSettings;
}

export function useTimeEstimation(params: UseTimeEstimationParams) {
  const {
    teamsCount,
    system,
    isGroupBasedSystem,
    teamsPerGroup,
    numberOfCourts,
    numberOfRounds,
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    knockoutSettings,
    enablePlayoff,
    scheduling,
  } = params;

  const timeEstimation = useMemo(() => {
    return calculateTimeEstimation({
      teamsCount,
      system,
      isGroupBasedSystem,
      teamsPerGroup,
      numberOfCourts,
      numberOfRounds,
      setsPerMatch,
      pointsPerSet,
      pointsPerThirdSet,
      knockoutSettings,
      enablePlayoff,
      scheduling,
    });
  }, [
    teamsCount,
    system,
    isGroupBasedSystem,
    teamsPerGroup,
    numberOfCourts,
    numberOfRounds,
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    knockoutSettings,
    enablePlayoff,
    scheduling,
  ]);

  const getEndTime = () => {
    return calculateEndTime(timeEstimation, scheduling.startTime);
  };

  return {
    timeEstimation,
    getEndTime,
  };
}
