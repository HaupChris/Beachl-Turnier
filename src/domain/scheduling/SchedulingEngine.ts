/**
 * Scheduling Engine
 *
 * Provides domain-layer abstractions for tournament scheduling:
 * - Time slot calculation with parallel court support
 * - Court assignment strategies
 * - Phase transition handling
 * - Duration estimation
 *
 * This module wraps and extends the existing scheduling utilities
 * to provide a cleaner interface for the domain layer.
 *
 * @see docs/tournament-modes-specification.md
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scheduling configuration
 */
export interface SchedulingConfig {
  /** Tournament start time (HH:MM format) */
  startTime: string;
  /** Planned end time (HH:MM format) */
  endTime: string;
  /** Number of available courts */
  courts: number;
  /** Minutes per 21-point set */
  minutesPer21PointSet: number;
  /** Minutes per 15-point set */
  minutesPer15PointSet: number;
  /** Minutes between consecutive matches */
  minutesBetweenMatches: number;
  /** Minutes between tournament phases */
  minutesBetweenPhases: number;
}

/**
 * Match format for duration calculation
 */
export interface MatchFormat {
  /** Number of sets (1, 2, or 3 for best-of-3) */
  setsPerMatch: number;
  /** Points per set (typically 21 or 15) */
  pointsPerSet: number;
  /** Points in deciding set (for best-of-3) */
  pointsPerThirdSet?: number;
}

/**
 * Court assignment strategies
 */
export type CourtAssignmentStrategy =
  | 'sequential'      // Courts assigned 1, 2, 3, 4, 1, 2, 3, 4...
  | 'round-based'     // All matches in a round use same courts
  | 'balanced';       // Minimize court usage imbalance

/**
 * A scheduled match with time and court
 */
export interface ScheduledMatch {
  /** Match identifier */
  matchId: string;
  /** Round number */
  round: number;
  /** Position within round */
  positionInRound: number;
  /** Assigned court (1-indexed) */
  court: number;
  /** Time slot index (0-indexed) */
  timeSlot: number;
  /** Calculated start time (HH:MM) */
  startTime: string;
  /** Calculated end time (HH:MM) */
  endTime: string;
}

/**
 * Input match for scheduling
 */
export interface MatchInput {
  /** Unique match identifier */
  id: string;
  /** Round number */
  round: number;
  /** Match number within tournament */
  matchNumber: number;
  /** Optional phase identifier */
  phase?: string;
  /** Optional knockout round type */
  knockoutRound?: string;
}

/**
 * Phase scheduling result
 */
export interface PhaseSchedule {
  /** Phase identifier */
  phaseId: string;
  /** Scheduled matches */
  matches: ScheduledMatch[];
  /** Phase start time (HH:MM) */
  startTime: string;
  /** Phase end time (HH:MM) */
  endTime: string;
  /** Total duration in minutes */
  durationMinutes: number;
}

/**
 * Tournament schedule result
 */
export interface TournamentSchedule {
  /** All scheduled matches */
  matches: ScheduledMatch[];
  /** Phases (if multi-phase tournament) */
  phases: PhaseSchedule[];
  /** Tournament start time */
  startTime: string;
  /** Estimated end time */
  estimatedEndTime: string;
  /** Total duration in minutes */
  totalDurationMinutes: number;
  /** Whether schedule exceeds planned end time */
  exceedsEndTime: boolean;
  /** Overrun in minutes (if any) */
  overrunMinutes: number;
}

/**
 * Duration estimation result
 */
export interface DurationEstimate {
  /** Total number of matches */
  matchCount: number;
  /** Number of time slots needed */
  timeSlots: number;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Estimated end time (HH:MM) */
  endTime: string;
  /** Whether estimate exceeds planned end */
  exceedsEndTime: boolean;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to "HH:MM"
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate match duration based on format
 */
export function calculateMatchDuration(
  format: MatchFormat,
  config: Pick<SchedulingConfig, 'minutesPer21PointSet' | 'minutesPer15PointSet'>
): number {
  const { setsPerMatch, pointsPerSet, pointsPerThirdSet } = format;
  const { minutesPer21PointSet, minutesPer15PointSet } = config;

  const getSetDuration = (points: number) =>
    points === 21 ? minutesPer21PointSet : minutesPer15PointSet;

  if (setsPerMatch === 1) {
    return getSetDuration(pointsPerSet);
  } else if (setsPerMatch === 2) {
    return 2 * getSetDuration(pointsPerSet);
  } else {
    // Best of 3: worst case is all 3 sets
    const twoSets = 2 * getSetDuration(pointsPerSet);
    const thirdSet = getSetDuration(pointsPerThirdSet ?? 15);
    return twoSets + thirdSet;
  }
}

/**
 * Calculate number of time slots for a set of matches
 */
export function calculateTimeSlots(matchCount: number, courts: number): number {
  return Math.ceil(matchCount / courts);
}

/**
 * Default scheduling configuration
 */
export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
  startTime: '09:00',
  endTime: '17:00',
  courts: 4,
  minutesPer21PointSet: 20,
  minutesPer15PointSet: 12,
  minutesBetweenMatches: 5,
  minutesBetweenPhases: 0,
};

// =============================================================================
// SCHEDULING ENGINE
// =============================================================================

/**
 * Scheduling Engine for tournament match scheduling
 */
export class SchedulingEngine {
  private config: SchedulingConfig;
  private strategy: CourtAssignmentStrategy;
  private matchDuration: number;

  constructor(
    config: Partial<SchedulingConfig> = {},
    format: MatchFormat = { setsPerMatch: 2, pointsPerSet: 21 },
    strategy: CourtAssignmentStrategy = 'sequential'
  ) {
    this.config = { ...DEFAULT_SCHEDULING_CONFIG, ...config };
    this.strategy = strategy;
    this.matchDuration = calculateMatchDuration(format, this.config);
  }

  /**
   * Get the match duration in minutes
   */
  getMatchDuration(): number {
    return this.matchDuration;
  }

  /**
   * Get the scheduling configuration
   */
  getConfig(): SchedulingConfig {
    return { ...this.config };
  }

  /**
   * Schedule a list of matches
   */
  scheduleMatches(matches: MatchInput[]): TournamentSchedule {
    if (matches.length === 0) {
      return this.emptySchedule();
    }

    // Group matches by phase
    const phases = this.groupByPhase(matches);
    const scheduledPhases: PhaseSchedule[] = [];
    const allScheduledMatches: ScheduledMatch[] = [];

    let currentStartMinutes = parseTimeToMinutes(this.config.startTime);

    for (const [phaseId, phaseMatches] of phases) {
      const phaseSchedule = this.schedulePhase(phaseId, phaseMatches, currentStartMinutes);
      scheduledPhases.push(phaseSchedule);
      allScheduledMatches.push(...phaseSchedule.matches);

      // Next phase starts after this one + break
      currentStartMinutes =
        parseTimeToMinutes(phaseSchedule.endTime) + this.config.minutesBetweenPhases;
    }

    const endMinutes = currentStartMinutes - this.config.minutesBetweenPhases;
    const plannedEndMinutes = parseTimeToMinutes(this.config.endTime);
    const startMinutes = parseTimeToMinutes(this.config.startTime);

    return {
      matches: allScheduledMatches,
      phases: scheduledPhases,
      startTime: this.config.startTime,
      estimatedEndTime: formatMinutesToTime(endMinutes),
      totalDurationMinutes: endMinutes - startMinutes,
      exceedsEndTime: endMinutes > plannedEndMinutes,
      overrunMinutes: Math.max(0, endMinutes - plannedEndMinutes),
    };
  }

  /**
   * Schedule a single phase
   */
  private schedulePhase(
    phaseId: string,
    matches: MatchInput[],
    startMinutes: number
  ): PhaseSchedule {
    // Sort matches by round, then match number
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchNumber - b.matchNumber;
    });

    const scheduledMatches: ScheduledMatch[] = [];
    let currentMinutes = startMinutes;

    // Group by round for round-based scheduling
    const roundGroups = this.groupByRound(sortedMatches);

    for (const [round, roundMatches] of roundGroups) {
      const roundSchedule = this.scheduleRound(round, roundMatches, currentMinutes);
      scheduledMatches.push(...roundSchedule.matches);
      currentMinutes = roundSchedule.endMinutes;
    }

    return {
      phaseId,
      matches: scheduledMatches,
      startTime: formatMinutesToTime(startMinutes),
      endTime: formatMinutesToTime(currentMinutes),
      durationMinutes: currentMinutes - startMinutes,
    };
  }

  /**
   * Schedule matches within a round
   */
  private scheduleRound(
    round: number,
    matches: MatchInput[],
    startMinutes: number
  ): { matches: ScheduledMatch[]; endMinutes: number } {
    const scheduledMatches: ScheduledMatch[] = [];
    const { courts, minutesBetweenMatches } = this.config;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const timeSlot = Math.floor(i / courts);
      const court = this.assignCourt(i, courts);

      const matchStartMinutes =
        startMinutes + timeSlot * (this.matchDuration + minutesBetweenMatches);
      const matchEndMinutes = matchStartMinutes + this.matchDuration;

      scheduledMatches.push({
        matchId: match.id,
        round,
        positionInRound: i,
        court,
        timeSlot,
        startTime: formatMinutesToTime(matchStartMinutes),
        endTime: formatMinutesToTime(matchEndMinutes),
      });
    }

    // Calculate end time (last time slot end)
    const timeSlots = calculateTimeSlots(matches.length, courts);
    const lastMatchEnd =
      startMinutes +
      (timeSlots - 1) * (this.matchDuration + minutesBetweenMatches) +
      this.matchDuration;

    return { matches: scheduledMatches, endMinutes: lastMatchEnd + minutesBetweenMatches };
  }

  /**
   * Assign court based on strategy
   */
  private assignCourt(index: number, courts: number): number {
    switch (this.strategy) {
      case 'sequential':
        return (index % courts) + 1;
      case 'round-based':
        return (index % courts) + 1;
      case 'balanced':
        // For balanced, we could track court usage
        // For now, use sequential as default
        return (index % courts) + 1;
      default:
        return (index % courts) + 1;
    }
  }

  /**
   * Group matches by phase
   */
  private groupByPhase(matches: MatchInput[]): Map<string, MatchInput[]> {
    const groups = new Map<string, MatchInput[]>();

    for (const match of matches) {
      const phase = match.phase ?? 'default';
      if (!groups.has(phase)) {
        groups.set(phase, []);
      }
      groups.get(phase)!.push(match);
    }

    return groups;
  }

  /**
   * Group matches by round
   */
  private groupByRound(matches: MatchInput[]): Map<number, MatchInput[]> {
    const groups = new Map<number, MatchInput[]>();

    for (const match of matches) {
      if (!groups.has(match.round)) {
        groups.set(match.round, []);
      }
      groups.get(match.round)!.push(match);
    }

    // Sort by round number
    return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
  }

  /**
   * Create empty schedule result
   */
  private emptySchedule(): TournamentSchedule {
    return {
      matches: [],
      phases: [],
      startTime: this.config.startTime,
      estimatedEndTime: this.config.startTime,
      totalDurationMinutes: 0,
      exceedsEndTime: false,
      overrunMinutes: 0,
    };
  }

  /**
   * Estimate duration for a given match count
   */
  estimateDuration(matchCount: number): DurationEstimate {
    const { courts, minutesBetweenMatches } = this.config;
    const timeSlots = calculateTimeSlots(matchCount, courts);
    const durationMinutes =
      timeSlots * (this.matchDuration + minutesBetweenMatches) - minutesBetweenMatches;

    const startMinutes = parseTimeToMinutes(this.config.startTime);
    const endMinutes = startMinutes + durationMinutes;
    const plannedEndMinutes = parseTimeToMinutes(this.config.endTime);

    return {
      matchCount,
      timeSlots,
      durationMinutes,
      endTime: formatMinutesToTime(endMinutes),
      exceedsEndTime: endMinutes > plannedEndMinutes,
    };
  }

  /**
   * Calculate start time for a specific match
   */
  calculateMatchStartTime(match: MatchInput, allMatches: MatchInput[]): string | null {
    const schedule = this.scheduleMatches(allMatches);
    const scheduled = schedule.matches.find((m) => m.matchId === match.id);
    return scheduled?.startTime ?? null;
  }

  /**
   * Validate scheduling configuration
   */
  static validate(config: Partial<SchedulingConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.startTime) {
      const startMinutes = parseTimeToMinutes(config.startTime);
      if (isNaN(startMinutes) || startMinutes < 0 || startMinutes >= 24 * 60) {
        errors.push('Invalid start time format');
      }
    }

    if (config.endTime) {
      const endMinutes = parseTimeToMinutes(config.endTime);
      if (isNaN(endMinutes) || endMinutes < 0 || endMinutes >= 24 * 60) {
        errors.push('Invalid end time format');
      }
    }

    if (config.startTime && config.endTime) {
      if (parseTimeToMinutes(config.startTime) >= parseTimeToMinutes(config.endTime)) {
        errors.push('Start time must be before end time');
      }
    }

    if (config.courts !== undefined && config.courts < 1) {
      errors.push('Must have at least 1 court');
    }

    if (config.minutesPer21PointSet !== undefined && config.minutesPer21PointSet < 1) {
      errors.push('Minutes per 21-point set must be at least 1');
    }

    if (config.minutesPer15PointSet !== undefined && config.minutesPer15PointSet < 1) {
      errors.push('Minutes per 15-point set must be at least 1');
    }

    if (config.minutesBetweenMatches !== undefined && config.minutesBetweenMatches < 0) {
      errors.push('Minutes between matches cannot be negative');
    }

    if (config.minutesBetweenPhases !== undefined && config.minutesBetweenPhases < 0) {
      errors.push('Minutes between phases cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a scheduling engine with default settings
 */
export function createSchedulingEngine(
  config?: Partial<SchedulingConfig>,
  format?: MatchFormat,
  strategy?: CourtAssignmentStrategy
): SchedulingEngine {
  return new SchedulingEngine(config, format, strategy);
}

/**
 * Quick estimate for round-robin tournament
 */
export function estimateRoundRobinDuration(
  teamCount: number,
  config: Partial<SchedulingConfig> = {},
  format: MatchFormat = { setsPerMatch: 2, pointsPerSet: 21 }
): DurationEstimate {
  const engine = new SchedulingEngine(config, format);
  const matchCount = (teamCount * (teamCount - 1)) / 2;
  return engine.estimateDuration(matchCount);
}

/**
 * Quick estimate for Swiss tournament
 */
export function estimateSwissDuration(
  teamCount: number,
  rounds: number,
  config: Partial<SchedulingConfig> = {},
  format: MatchFormat = { setsPerMatch: 2, pointsPerSet: 21 }
): DurationEstimate {
  const engine = new SchedulingEngine(config, format);
  const matchCount = Math.floor(teamCount / 2) * rounds;
  return engine.estimateDuration(matchCount);
}

/**
 * Quick estimate for group phase tournament
 */
export function estimateGroupPhaseDuration(
  numberOfGroups: number,
  teamsPerGroup: number,
  config: Partial<SchedulingConfig> = {},
  format: MatchFormat = { setsPerMatch: 2, pointsPerSet: 21 }
): DurationEstimate {
  const engine = new SchedulingEngine(config, format);
  // Each group plays round-robin
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  const matchCount = numberOfGroups * matchesPerGroup;
  return engine.estimateDuration(matchCount);
}
