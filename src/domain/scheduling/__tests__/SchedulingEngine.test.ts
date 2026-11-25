/**
 * Tests for Scheduling Engine
 *
 * These tests verify that:
 * 1. Time parsing and formatting work correctly
 * 2. Match duration calculation is accurate
 * 3. Court assignment follows the chosen strategy
 * 4. Multi-phase scheduling handles transitions
 * 5. Duration estimates are accurate
 *
 * @see docs/tournament-modes-specification.md
 */

import { describe, it, expect } from 'vitest';
import {
  SchedulingEngine,
  createSchedulingEngine,
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateMatchDuration,
  calculateTimeSlots,
  estimateRoundRobinDuration,
  estimateSwissDuration,
  estimateGroupPhaseDuration,
  type MatchFormat,
  type MatchInput,
} from '../SchedulingEngine';

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('parseTimeToMinutes', () => {
    it.each([
      ['00:00', 0],
      ['01:00', 60],
      ['09:00', 540],
      ['12:30', 750],
      ['17:00', 1020],
      ['23:59', 1439],
    ])('parses %s to %d minutes', (time, expected) => {
      expect(parseTimeToMinutes(time)).toBe(expected);
    });
  });

  describe('formatMinutesToTime', () => {
    it.each([
      [0, '00:00'],
      [60, '01:00'],
      [540, '09:00'],
      [750, '12:30'],
      [1020, '17:00'],
      [1439, '23:59'],
    ])('formats %d minutes to %s', (minutes, expected) => {
      expect(formatMinutesToTime(minutes)).toBe(expected);
    });

    it('handles times past midnight', () => {
      expect(formatMinutesToTime(1500)).toBe('25:00');
    });
  });

  describe('calculateMatchDuration', () => {
    const config = {
      minutesPer21PointSet: 20,
      minutesPer15PointSet: 12,
    };

    it('calculates single 21-point set', () => {
      const format: MatchFormat = { setsPerMatch: 1, pointsPerSet: 21 };
      expect(calculateMatchDuration(format, config)).toBe(20);
    });

    it('calculates single 15-point set', () => {
      const format: MatchFormat = { setsPerMatch: 1, pointsPerSet: 15 };
      expect(calculateMatchDuration(format, config)).toBe(12);
    });

    it('calculates two 21-point sets', () => {
      const format: MatchFormat = { setsPerMatch: 2, pointsPerSet: 21 };
      expect(calculateMatchDuration(format, config)).toBe(40);
    });

    it('calculates best-of-3 with 15-point third set', () => {
      const format: MatchFormat = { setsPerMatch: 3, pointsPerSet: 21, pointsPerThirdSet: 15 };
      expect(calculateMatchDuration(format, config)).toBe(52); // 20 + 20 + 12
    });

    it('calculates best-of-3 with 21-point third set', () => {
      const format: MatchFormat = { setsPerMatch: 3, pointsPerSet: 21, pointsPerThirdSet: 21 };
      expect(calculateMatchDuration(format, config)).toBe(60); // 20 + 20 + 20
    });
  });

  describe('calculateTimeSlots', () => {
    it.each([
      [4, 2, 2],   // 4 matches on 2 courts = 2 slots
      [6, 3, 2],   // 6 matches on 3 courts = 2 slots
      [7, 3, 3],   // 7 matches on 3 courts = 3 slots
      [10, 4, 3],  // 10 matches on 4 courts = 3 slots
    ])('%d matches on %d courts = %d time slots', (matches, courts, expected) => {
      expect(calculateTimeSlots(matches, courts)).toBe(expected);
    });
  });
});

// =============================================================================
// SCHEDULING ENGINE TESTS
// =============================================================================

describe('SchedulingEngine', () => {
  describe('constructor', () => {
    it('uses default config when not provided', () => {
      const engine = new SchedulingEngine();
      const config = engine.getConfig();

      expect(config.startTime).toBe('09:00');
      expect(config.endTime).toBe('17:00');
      expect(config.courts).toBe(4);
    });

    it('merges partial config with defaults', () => {
      const engine = new SchedulingEngine({ courts: 2, startTime: '10:00' });
      const config = engine.getConfig();

      expect(config.courts).toBe(2);
      expect(config.startTime).toBe('10:00');
      expect(config.endTime).toBe('17:00'); // Default preserved
    });
  });

  describe('getMatchDuration', () => {
    it('returns correct duration for format', () => {
      const engine = new SchedulingEngine({}, { setsPerMatch: 2, pointsPerSet: 21 });
      expect(engine.getMatchDuration()).toBe(40);
    });
  });

  describe('scheduleMatches', () => {
    it('returns empty schedule for no matches', () => {
      const engine = new SchedulingEngine();
      const schedule = engine.scheduleMatches([]);

      expect(schedule.matches).toHaveLength(0);
      expect(schedule.totalDurationMinutes).toBe(0);
      expect(schedule.exceedsEndTime).toBe(false);
    });

    it('schedules matches with correct time slots', () => {
      const engine = new SchedulingEngine({ courts: 2 });
      const matches: MatchInput[] = [
        { id: 'm1', round: 1, matchNumber: 1 },
        { id: 'm2', round: 1, matchNumber: 2 },
        { id: 'm3', round: 1, matchNumber: 3 },
        { id: 'm4', round: 1, matchNumber: 4 },
      ];

      const schedule = engine.scheduleMatches(matches);

      // 4 matches on 2 courts = 2 time slots
      expect(schedule.matches).toHaveLength(4);

      // First slot (courts 1 and 2)
      expect(schedule.matches[0].timeSlot).toBe(0);
      expect(schedule.matches[1].timeSlot).toBe(0);

      // Second slot (courts 1 and 2)
      expect(schedule.matches[2].timeSlot).toBe(1);
      expect(schedule.matches[3].timeSlot).toBe(1);
    });

    it('assigns courts sequentially', () => {
      const engine = new SchedulingEngine({ courts: 3 }, undefined, 'sequential');
      const matches: MatchInput[] = [
        { id: 'm1', round: 1, matchNumber: 1 },
        { id: 'm2', round: 1, matchNumber: 2 },
        { id: 'm3', round: 1, matchNumber: 3 },
        { id: 'm4', round: 1, matchNumber: 4 },
      ];

      const schedule = engine.scheduleMatches(matches);

      expect(schedule.matches[0].court).toBe(1);
      expect(schedule.matches[1].court).toBe(2);
      expect(schedule.matches[2].court).toBe(3);
      expect(schedule.matches[3].court).toBe(1); // Wraps around
    });

    it('calculates correct start times', () => {
      const engine = new SchedulingEngine(
        {
          courts: 2,
          startTime: '09:00',
          minutesBetweenMatches: 5,
          minutesPer21PointSet: 20,
        },
        { setsPerMatch: 2, pointsPerSet: 21 }
      );

      const matches: MatchInput[] = [
        { id: 'm1', round: 1, matchNumber: 1 },
        { id: 'm2', round: 1, matchNumber: 2 },
        { id: 'm3', round: 1, matchNumber: 3 },
        { id: 'm4', round: 1, matchNumber: 4 },
      ];

      const schedule = engine.scheduleMatches(matches);

      // Match duration: 40 min, break: 5 min
      expect(schedule.matches[0].startTime).toBe('09:00'); // Slot 0
      expect(schedule.matches[1].startTime).toBe('09:00'); // Slot 0
      expect(schedule.matches[2].startTime).toBe('09:45'); // Slot 1 (09:00 + 40 + 5)
      expect(schedule.matches[3].startTime).toBe('09:45'); // Slot 1
    });

    it('handles multiple rounds', () => {
      const engine = new SchedulingEngine({ courts: 2 });
      const matches: MatchInput[] = [
        { id: 'r1m1', round: 1, matchNumber: 1 },
        { id: 'r1m2', round: 1, matchNumber: 2 },
        { id: 'r2m1', round: 2, matchNumber: 3 },
        { id: 'r2m2', round: 2, matchNumber: 4 },
      ];

      const schedule = engine.scheduleMatches(matches);

      // Round 1 matches
      expect(schedule.matches[0].round).toBe(1);
      expect(schedule.matches[1].round).toBe(1);

      // Round 2 matches should start after round 1
      expect(schedule.matches[2].round).toBe(2);
      const round2Start = parseTimeToMinutes(schedule.matches[2].startTime);
      const round1End = parseTimeToMinutes(schedule.matches[0].endTime);
      expect(round2Start).toBeGreaterThanOrEqual(round1End);
    });

    it('detects schedule overrun', () => {
      const engine = new SchedulingEngine({
        courts: 1,
        startTime: '09:00',
        endTime: '10:00', // Only 1 hour
        minutesBetweenMatches: 0,
      });

      const matches: MatchInput[] = [
        { id: 'm1', round: 1, matchNumber: 1 },
        { id: 'm2', round: 1, matchNumber: 2 },
        { id: 'm3', round: 1, matchNumber: 3 },
      ];

      const schedule = engine.scheduleMatches(matches);

      // 3 matches * 40 min = 120 min, but only 60 min available
      expect(schedule.exceedsEndTime).toBe(true);
      expect(schedule.overrunMinutes).toBeGreaterThan(0);
    });
  });

  describe('multi-phase scheduling', () => {
    it('groups matches by phase', () => {
      const engine = new SchedulingEngine({ courts: 2 });
      const matches: MatchInput[] = [
        { id: 'p1m1', round: 1, matchNumber: 1, phase: 'group' },
        { id: 'p1m2', round: 1, matchNumber: 2, phase: 'group' },
        { id: 'p2m1', round: 1, matchNumber: 3, phase: 'knockout' },
        { id: 'p2m2', round: 1, matchNumber: 4, phase: 'knockout' },
      ];

      const schedule = engine.scheduleMatches(matches);

      expect(schedule.phases).toHaveLength(2);
      expect(schedule.phases[0].phaseId).toBe('group');
      expect(schedule.phases[1].phaseId).toBe('knockout');
    });

    it('adds break between phases', () => {
      const engine = new SchedulingEngine({
        courts: 2,
        minutesBetweenPhases: 15,
        startTime: '09:00',
      });

      const matches: MatchInput[] = [
        { id: 'p1m1', round: 1, matchNumber: 1, phase: 'group' },
        { id: 'p1m2', round: 1, matchNumber: 2, phase: 'group' },
        { id: 'p2m1', round: 1, matchNumber: 3, phase: 'knockout' },
      ];

      const schedule = engine.scheduleMatches(matches);

      const phase1End = parseTimeToMinutes(schedule.phases[0].endTime);
      const phase2Start = parseTimeToMinutes(schedule.phases[1].startTime);

      expect(phase2Start - phase1End).toBe(15);
    });
  });

  describe('estimateDuration', () => {
    it('estimates duration correctly', () => {
      const engine = new SchedulingEngine({
        courts: 2,
        minutesBetweenMatches: 5,
        startTime: '09:00',
        endTime: '17:00',
      });

      const estimate = engine.estimateDuration(6);

      // 6 matches on 2 courts = 3 time slots
      expect(estimate.timeSlots).toBe(3);
      expect(estimate.matchCount).toBe(6);
    });

    it('detects overrun in estimate', () => {
      const engine = new SchedulingEngine({
        courts: 1,
        startTime: '09:00',
        endTime: '10:00',
      });

      const estimate = engine.estimateDuration(10);

      expect(estimate.exceedsEndTime).toBe(true);
    });
  });

  describe('calculateMatchStartTime', () => {
    it('returns start time for specific match', () => {
      const engine = new SchedulingEngine({ courts: 2, startTime: '09:00' });
      const matches: MatchInput[] = [
        { id: 'm1', round: 1, matchNumber: 1 },
        { id: 'm2', round: 1, matchNumber: 2 },
        { id: 'm3', round: 1, matchNumber: 3 },
      ];

      const startTime = engine.calculateMatchStartTime(matches[2], matches);

      expect(startTime).not.toBeNull();
    });

    it('returns null for unknown match', () => {
      const engine = new SchedulingEngine();
      const matches: MatchInput[] = [
        { id: 'm1', round: 1, matchNumber: 1 },
      ];

      const startTime = engine.calculateMatchStartTime(
        { id: 'unknown', round: 1, matchNumber: 99 },
        matches
      );

      expect(startTime).toBeNull();
    });
  });

  describe('validate', () => {
    it('validates correct config', () => {
      const result = SchedulingEngine.validate({
        startTime: '09:00',
        endTime: '17:00',
        courts: 4,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid start time', () => {
      const result = SchedulingEngine.validate({
        startTime: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid start time format');
    });

    it('rejects start time after end time', () => {
      const result = SchedulingEngine.validate({
        startTime: '17:00',
        endTime: '09:00',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start time must be before end time');
    });

    it('rejects zero courts', () => {
      const result = SchedulingEngine.validate({
        courts: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must have at least 1 court');
    });

    it('rejects negative break time', () => {
      const result = SchedulingEngine.validate({
        minutesBetweenMatches: -5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minutes between matches cannot be negative');
    });
  });
});

// =============================================================================
// CONVENIENCE FUNCTION TESTS
// =============================================================================

describe('Convenience Functions', () => {
  describe('createSchedulingEngine', () => {
    it('creates engine with defaults', () => {
      const engine = createSchedulingEngine();
      expect(engine).toBeInstanceOf(SchedulingEngine);
    });

    it('creates engine with custom config', () => {
      const engine = createSchedulingEngine({ courts: 2 });
      expect(engine.getConfig().courts).toBe(2);
    });
  });

  describe('estimateRoundRobinDuration', () => {
    it('estimates correctly for 4 teams', () => {
      // 4 teams = 6 matches
      const estimate = estimateRoundRobinDuration(4, { courts: 2 });
      expect(estimate.matchCount).toBe(6);
    });

    it('estimates correctly for 8 teams', () => {
      // 8 teams = 28 matches
      const estimate = estimateRoundRobinDuration(8, { courts: 4 });
      expect(estimate.matchCount).toBe(28);
    });
  });

  describe('estimateSwissDuration', () => {
    it('estimates correctly', () => {
      // 8 teams, 4 rounds = 4 matches/round * 4 = 16 matches
      const estimate = estimateSwissDuration(8, 4, { courts: 2 });
      expect(estimate.matchCount).toBe(16);
    });
  });

  describe('estimateGroupPhaseDuration', () => {
    it('estimates correctly for 4 groups of 4', () => {
      // 4 teams per group = 6 matches/group, 4 groups = 24 matches
      const estimate = estimateGroupPhaseDuration(4, 4, { courts: 4 });
      expect(estimate.matchCount).toBe(24);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  it('full tournament scheduling workflow', () => {
    const engine = new SchedulingEngine(
      {
        courts: 4,
        startTime: '09:00',
        endTime: '18:00',
        minutesBetweenMatches: 5,
        minutesBetweenPhases: 15,
      },
      { setsPerMatch: 2, pointsPerSet: 21 }
    );

    // Group phase matches
    const groupMatches: MatchInput[] = [];
    for (let i = 1; i <= 12; i++) {
      groupMatches.push({ id: `g${i}`, round: Math.ceil(i / 4), matchNumber: i, phase: 'group' });
    }

    // Knockout matches
    const knockoutMatches: MatchInput[] = [
      { id: 'qf1', round: 1, matchNumber: 13, phase: 'knockout' },
      { id: 'qf2', round: 1, matchNumber: 14, phase: 'knockout' },
      { id: 'sf1', round: 2, matchNumber: 15, phase: 'knockout' },
      { id: 'sf2', round: 2, matchNumber: 16, phase: 'knockout' },
      { id: 'final', round: 3, matchNumber: 17, phase: 'knockout' },
    ];

    const schedule = engine.scheduleMatches([...groupMatches, ...knockoutMatches]);

    // Verify structure
    expect(schedule.phases).toHaveLength(2);
    expect(schedule.matches).toHaveLength(17);

    // Group phase
    expect(schedule.phases[0].phaseId).toBe('group');
    expect(schedule.phases[0].matches).toHaveLength(12);

    // Knockout phase
    expect(schedule.phases[1].phaseId).toBe('knockout');
    expect(schedule.phases[1].matches).toHaveLength(5);

    // Knockout starts after group + break
    const groupEnd = parseTimeToMinutes(schedule.phases[0].endTime);
    const knockoutStart = parseTimeToMinutes(schedule.phases[1].startTime);
    expect(knockoutStart - groupEnd).toBe(15);

    // All courts used
    const courtsUsed = new Set(schedule.matches.map((m) => m.court));
    expect(courtsUsed.size).toBeLessThanOrEqual(4);
  });
});
