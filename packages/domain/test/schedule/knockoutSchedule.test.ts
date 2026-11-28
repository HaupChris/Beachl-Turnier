import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  planRoundRobin,
  scheduleKnockout,
  scheduleRoundRobinPlacements,
  type SlotSource,
} from '../../src';
import { makeTeams } from '../helpers';
import { type Format, planFor } from '../knockout/knockoutHelpers';

const options = (courts: number, referees = false) => ({
  courts,
  start: 900,
  matchDuration: 25,
  referees,
});

const key = (s: SlotSource) =>
  s.kind === 'groupRank' ? `g${String(s.groupIndex)}-${String(s.rank)}` : `${s.kind}-${s.matchId}`;

describe('scheduleKnockout (Q21)', () => {
  it('16 Teams Full Placement auf 4 Feldern: Runde 1 in zwei Zeitfenstern ab Ende der Gruppenphase', () => {
    const { plan } = planFor('full', 16);
    const schedule = scheduleKnockout(plan, options(4));
    expect(schedule.slice(0, 8).map((s) => s.start)).toEqual([
      900, 900, 900, 900, 925, 925, 925, 925,
    ]);
    expect(schedule.every((s) => s.referee === undefined)).toBe(true);
  });

  it('24 Teams (8×3) auf 8 Feldern: Runde 1 pfeifen die Gruppensieger wie im 24er-Plan (Q25)', () => {
    const { plan } = planFor('full', 24);
    const schedule = scheduleKnockout(plan, options(8, true));
    for (const s of schedule.slice(0, 8)) {
      expect(s.referee?.kind).toBe('placeholder');
      if (s.referee?.kind === 'placeholder') {
        expect(s.referee.source).toMatchObject({ kind: 'groupRank', rank: 1 });
      }
    }
  });

  it('24 Teams: Achtelfinale pfeifen Verlierer der ersten Runde', () => {
    const { plan } = planFor('full', 24);
    const schedule = scheduleKnockout(plan, options(8, true));
    const roundOf16 = schedule.filter(
      (s) => plan.matches.find((m) => m.id === s.matchId)?.round === 2,
    );
    expect(
      roundOf16.some(
        (s) => s.referee?.kind === 'placeholder' && s.referee.source.kind === 'loserOf',
      ),
    ).toBe(true);
  });

  it('Eigenschaften: Abhängigkeiten, Felder und Schiedsrichter passen zusammen', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 32 }),
        fc.constantFrom<Format>('full', 'split'),
        fc.integer({ min: 1, max: 10 }),
        (n, format, courts) => {
          const { plan } = planFor(format, n);
          const schedule = scheduleKnockout(plan, options(courts, true));
          const timeOf = new Map(schedule.map((s) => [s.matchId, s]));
          expect(schedule).toHaveLength(plan.matches.length);
          for (const m of plan.matches) {
            const t = timeOf.get(m.id);
            if (!t) throw new Error('fehlt');
            for (const src of [m.slotA, m.slotB]) {
              if (src.kind !== 'groupRank')
                expect(t.start).toBeGreaterThanOrEqual(timeOf.get(src.matchId)?.end ?? 0);
            }
            if (t.referee?.kind === 'placeholder') {
              expect([m.slotA, m.slotB].map(key)).not.toContain(key(t.referee.source));
            }
          }
          for (let c = 1; c <= courts; c++) {
            const onCourt = schedule.filter((s) => s.court === c).sort((a, b) => a.start - b.start);
            onCourt.slice(1).forEach((s, i) => {
              expect(s.start).toBeGreaterThanOrEqual(onCourt[i]?.end ?? 0);
            });
          }
        },
      ),
      { numRuns: 80 },
    );
  });
});

describe('scheduleRoundRobinPlacements (Q29)', () => {
  it('Platzierungsspiele beginnen nach der Vorrunde, verteilt auf die Felder', () => {
    const plan = planRoundRobin(makeTeams(6), { withPlacementMatches: true });
    const schedule = scheduleRoundRobinPlacements(plan.placementMatches, {
      courts: 2,
      start: 1000,
      matchDuration: 50,
      referees: false,
    });
    expect(schedule.map((s) => [s.matchId, s.court, s.start])).toEqual([
      ['P1', 1, 1000],
      ['P3', 2, 1000],
      ['P5', 1, 1050],
    ]);
  });
});
