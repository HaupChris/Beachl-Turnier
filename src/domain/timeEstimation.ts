import type { TournamentSystem, SchedulingSettings, KnockoutSettings } from '../types/tournament';
import { estimateTournamentDuration, estimateSSVBTournamentDuration } from './scheduling';

export interface TimeEstimation {
  phase1Name: string;
  phase1Matches: number;
  phase1Minutes: number;
  phase2Name: string | null;
  phase2Matches: number;
  phase2Minutes: number;
  totalMinutes: number;
  hasPhase2: boolean;
}

interface TimeEstimationParams {
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

export function calculateTimeEstimation({
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
}: TimeEstimationParams): TimeEstimation | null {
  if (teamsCount < 2) return null;

  // Group-based systems (SSVB, All-Placements, Short-Main)
  const minTeamsForGroups = teamsPerGroup * 2;
  if (isGroupBasedSystem && teamsCount >= minTeamsForGroups && teamsCount % teamsPerGroup === 0) {
    const result = estimateSSVBTournamentDuration(
      teamsCount,
      numberOfCourts,
      setsPerMatch,
      pointsPerSet,
      setsPerMatch === 3 ? pointsPerThirdSet : undefined,
      knockoutSettings.setsPerMatch,
      knockoutSettings.pointsPerSet,
      knockoutSettings.setsPerMatch === 2 ? knockoutSettings.pointsPerThirdSet : undefined,
      knockoutSettings.playThirdPlaceMatch,
      scheduling,
      teamsPerGroup
    );

    // Adjust knockout match count for different systems
    let knockoutMatchCount = result.knockoutMatchCount;
    let phase2Name = 'K.O.-Phase';

    if (system === 'beachl-all-placements') {
      // Full placement tree: N-1 matches
      knockoutMatchCount = teamsCount - 1;
      phase2Name = 'Platzierungsbaum';
    } else if (system === 'beachl-short-main') {
      // Shortened main round: 24 matches for 16 teams
      knockoutMatchCount = 24;
      phase2Name = 'Hauptrunde';
    }

    // Recalculate knockout minutes based on adjusted match count
    const knockoutMinutesPerMatch = knockoutSettings.pointsPerSet === 21
      ? scheduling.minutesPer21PointSet
      : scheduling.minutesPer15PointSet;
    const adjustedKnockoutMinutes = Math.ceil(knockoutMatchCount / numberOfCourts) *
      (knockoutMinutesPerMatch * (knockoutSettings.setsPerMatch === 2 ? 2 : 1) + scheduling.minutesBetweenMatches);

    return {
      phase1Name: 'Gruppenphase',
      phase1Matches: result.groupPhaseMatchCount,
      phase1Minutes: result.groupPhaseMinutes,
      phase2Name,
      phase2Matches: knockoutMatchCount,
      phase2Minutes: adjustedKnockoutMinutes,
      totalMinutes: result.groupPhaseMinutes + scheduling.minutesBetweenPhases + adjustedKnockoutMinutes,
      hasPhase2: true,
    };
  }

  // For round-robin and swiss
  const phase1Result = estimateTournamentDuration(
    teamsCount,
    system,
    numberOfCourts,
    numberOfRounds,
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    scheduling
  );

  if (!enablePlayoff) {
    return {
      phase1Name: system === 'swiss' ? 'Swiss Runden' : 'Vorrunde',
      phase1Matches: phase1Result.matchCount,
      phase1Minutes: phase1Result.totalMinutes,
      phase2Name: null,
      phase2Matches: 0,
      phase2Minutes: 0,
      totalMinutes: phase1Result.totalMinutes,
      hasPhase2: false,
    };
  }

  // Calculate playoff matches (simplified: teams/2 matches for bracket)
  const playoffMatches = Math.ceil(teamsCount / 2);
  const playoffMinutesPerMatch = knockoutSettings.pointsPerSet === 21
    ? scheduling.minutesPer21PointSet
    : scheduling.minutesPer15PointSet;
  const playoffMinutes = Math.ceil(playoffMatches / numberOfCourts) *
    (playoffMinutesPerMatch * (knockoutSettings.setsPerMatch === 2 ? 2 : 1) + scheduling.minutesBetweenMatches);

  return {
    phase1Name: system === 'swiss' ? 'Swiss Runden' : 'Vorrunde',
    phase1Matches: phase1Result.matchCount,
    phase1Minutes: phase1Result.totalMinutes,
    phase2Name: 'Finale',
    phase2Matches: playoffMatches,
    phase2Minutes: playoffMinutes,
    totalMinutes: phase1Result.totalMinutes + scheduling.minutesBetweenPhases + playoffMinutes,
    hasPhase2: true,
  };
}

export function calculateEndTime(timeEstimation: TimeEstimation | null, startTime: string | null): string | null {
  if (!timeEstimation || !startTime) return null;
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + timeEstimation.totalMinutes;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours} Std. ${mins} Min.` : `${mins} Min.`;
}
