import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  assignGroupCourts,
  defaultMatchDuration,
  planGroupPhase,
  planRoundRobin,
  scheduleGroupPhase,
  scheduleRoundRobin,
  type ScheduledMatch,
} from '../../src';
import { makeTeams } from '../helpers';

const options = (courts: number, referees = false) => ({
  courts,
  start: 600,
  matchDuration: 25,
  referees,
});

describe('defaultMatchDuration (Q50)', () => {
  it.each([
    ['singleSet', 21, 25],
    ['singleSet', 15, 20],
    ['twoSets', 15, 30],
    ['twoSets', 21, 40],
    ['bestOfThree', 15, 50],
    ['bestOfThree', 21, 60],
  ] as const)('%s bis %i → %i min', (kind, pointsPerSet, minutes) => {
    expect(defaultMatchDuration({ kind, pointsPerSet })).toBe(minutes);
  });
});

describe('assignGroupCourts (Q21, Q49)', () => {
  it('je Gruppe ein Feld', () => {
    expect(assignGroupCourts([4, 4, 4, 4], 4)).toEqual([[0], [1], [2], [3]]);
  });

  it('übrige Felder an die Gruppen mit den meisten Spielen', () => {
    expect(assignGroupCourts([4, 4, 5, 5], 6)).toEqual([[0], [1], [2], [3], [2], [3]]);
  });

  it('3er-Gruppen bekommen kein zweites Feld (nur ein Spiel gleichzeitig möglich)', () => {
    expect(assignGroupCourts([3, 3], 4)).toEqual([[0], [1]]);
  });

  it('weniger Felder als Gruppen: Gruppen teilen sich Felder', () => {
    expect(assignGroupCourts([3, 3, 3, 3, 3, 3, 3, 3], 4)).toEqual([
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ]);
  });

  it('lehnt 0 Felder ab', () => {
    expect(() => assignGroupCourts([4, 4], 0)).toThrow(RangeError);
  });
});

describe('scheduleGroupPhase', () => {
  it('16 Teams auf 4 Feldern: jede Gruppe auf ihrem Feld, 6 Zeitfenster à 25 min', () => {
    const schedule = scheduleGroupPhase(planGroupPhase(makeTeams(16)), options(4));
    expect(schedule).toHaveLength(24);
    expect(schedule.filter((s) => s.court === 1).every((s) => s.matchId.startsWith('A-'))).toBe(
      true,
    );
    expect(Math.max(...schedule.map((s) => s.end))).toBe(600 + 6 * 25);
    expect(schedule.every((s) => s.referee === undefined)).toBe(true);
  });

  it('Schiedsrichter an: vorgesehenes Team der Gruppe pfeift (Q20)', () => {
    const plan = planGroupPhase(makeTeams(16));
    const schedule = scheduleGroupPhase(plan, options(4, true));
    expect(schedule.find((s) => s.matchId === 'A-1')?.referee).toEqual({
      kind: 'team',
      teamId: 'T1',
    });
  });

  it('2 Felder pro Gruppe: alle spielen, kein freies Team → Turnierleitung (Q49)', () => {
    const schedule = scheduleGroupPhase(planGroupPhase(makeTeams(16)), options(8, true));
    expect(Math.max(...schedule.map((s) => s.end))).toBe(600 + 3 * 25);
    expect(schedule.every((s) => s.referee?.kind === 'organizer')).toBe(true);
  });

  it('11 Teams auf 3 Feldern: Spiel der 2er-Gruppe pfeift ein freies Team einer anderen Gruppe (Q49)', () => {
    const plan = planGroupPhase(makeTeams(11));
    const schedule = scheduleGroupPhase(plan, options(3, true));
    const match = schedule.find((s) => s.matchId === 'D-1');
    const groupD = plan.groups[3]?.teamIds ?? [];
    expect(match?.referee?.kind).toBe('team');
    if (match?.referee?.kind === 'team') expect(groupD).not.toContain(match.referee.teamId);
  });

  it('5er-Gruppe: letztes Spiel pfeift der Verlierer von Spiel 9 (Q45)', () => {
    const schedule = scheduleGroupPhase(planGroupPhase(makeTeams(10)), options(2, true));
    expect(schedule.find((s) => s.matchId === 'A-10')?.referee).toEqual({
      kind: 'loserOf',
      matchId: 'A-9',
    });
  });
});

function assertValidSlots(
  schedule: readonly ScheduledMatch[],
  teamsOf: (id: string) => string[],
  courts: number,
) {
  const byStart = new Map<number, ScheduledMatch[]>();
  for (const s of schedule) byStart.set(s.start, [...(byStart.get(s.start) ?? []), s]);
  for (const slot of byStart.values()) {
    const playing = slot.flatMap((s) => teamsOf(s.matchId));
    expect(new Set(playing).size).toBe(playing.length);
    const courtsUsed = slot.map((s) => s.court);
    expect(new Set(courtsUsed).size).toBe(courtsUsed.length);
    expect(courtsUsed.every((c) => c >= 1 && c <= courts)).toBe(true);
    const refs = slot.flatMap((s) => (s.referee?.kind === 'team' ? [s.referee.teamId] : []));
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs.some((r) => playing.includes(r))).toBe(false);
  }
}

describe('Eigenschaften des Zeitplans', () => {
  it('Gruppenphase: kein Team doppelt im Zeitfenster, Schiedsrichter spielen nicht selbst', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 32 }), fc.integer({ min: 1, max: 12 }), (n, courts) => {
        const plan = planGroupPhase(makeTeams(n));
        const schedule = scheduleGroupPhase(plan, options(courts, true));
        expect(schedule).toHaveLength(plan.matches.length);
        const byId = new Map(plan.matches.map((m) => [m.id, [m.teamA, m.teamB]]));
        assertValidSlots(schedule, (id) => byId.get(id) ?? [], courts);
      }),
    );
  });

  it('Jeder gegen jeden: kein Team doppelt im Zeitfenster', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 10 }), fc.integer({ min: 1, max: 5 }), (n, courts) => {
        const plan = planRoundRobin(makeTeams(n), { withPlacementMatches: false });
        const schedule = scheduleRoundRobin(plan, options(courts, true));
        expect(schedule).toHaveLength(plan.matches.length);
        const byId = new Map(plan.matches.map((m) => [m.id, [m.teamA, m.teamB]]));
        assertValidSlots(schedule, (id) => byId.get(id) ?? [], courts);
      }),
    );
  });
});

describe('scheduleRoundRobin', () => {
  it('6 Teams auf 3 Feldern: 5 Runden wie im 6er-Plan, kein freies Team → Turnierleitung', () => {
    const plan = planRoundRobin(makeTeams(6), { withPlacementMatches: true });
    const schedule = scheduleRoundRobin(plan, options(3, true));
    expect(Math.max(...schedule.map((s) => s.end))).toBe(600 + 5 * 25);
    expect(schedule.slice(0, 3).map((s) => s.matchId)).toEqual(['R1-1', 'R1-2', 'R1-3']);
    expect(schedule.every((s) => s.referee?.kind === 'organizer')).toBe(true);
  });

  it('5 Teams auf 2 Feldern: ein freies Team pfeift', () => {
    const plan = planRoundRobin(makeTeams(5), { withPlacementMatches: false });
    const schedule = scheduleRoundRobin(plan, options(2, true));
    expect(schedule.some((s) => s.referee?.kind === 'team')).toBe(true);
  });
});
