import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { planGroupLayout } from '../../src';

/** Erwartete Aufteilung je Teamzahl, Größen in Reihenfolge G1…Gn (group-phase.md). */
const EXPECTED: Record<number, number[]> = {
  6: [3, 3],
  7: [3, 4],
  8: [4, 4],
  9: [5, 4],
  10: [5, 5],
  11: [3, 3, 3, 2],
  12: [3, 3, 3, 3],
  13: [3, 3, 3, 4],
  14: [3, 3, 4, 4],
  15: [3, 4, 4, 4],
  16: [4, 4, 4, 4],
  17: [5, 4, 4, 4],
  18: [5, 5, 4, 4],
  19: [5, 5, 5, 4],
  20: [5, 5, 5, 5],
  21: [3, 3, 3, 3, 3, 2, 2, 2],
  22: [3, 3, 3, 3, 3, 3, 2, 2],
  23: [3, 3, 3, 3, 3, 3, 3, 2],
  24: [3, 3, 3, 3, 3, 3, 3, 3],
  25: [3, 3, 3, 3, 3, 3, 3, 4],
  32: [4, 4, 4, 4, 4, 4, 4, 4],
};

describe('planGroupLayout (Q18)', () => {
  it.each(Object.entries(EXPECTED))('%s Teams → %j', (teamCount, sizes) => {
    expect(planGroupLayout(Number(teamCount)).sizes).toEqual(sizes);
  });

  it('2er-Gruppen nur bei 11 und 21–23 Teams (Q4c)', () => {
    const withTwoTeamGroups = Array.from({ length: 27 }, (_, i) => i + 6).filter(
      (n) => planGroupLayout(n).hasTwoTeamGroups,
    );
    expect(withTwoTeamGroups).toEqual([11, 21, 22, 23]);
  });

  it('Eigenschaften für alle Teamzahlen 6–32', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 32 }), (n) => {
        const layout = planGroupLayout(n);
        expect([2, 4, 8]).toContain(layout.groupCount);
        expect(layout.sizes).toHaveLength(layout.groupCount);
        expect(layout.sizes.reduce((a, b) => a + b, 0)).toBe(n);
        expect(Math.max(...layout.sizes) - Math.min(...layout.sizes)).toBeLessThanOrEqual(1);
        expect(Math.max(...layout.sizes)).toBe(layout.capacity);
        expect(layout.capacity).toBeGreaterThanOrEqual(3);
        expect(layout.capacity).toBeLessThanOrEqual(5);
      }),
    );
  });

  it.each([5, 33, 0, 7.5])('lehnt %s Teams ab', (n) => {
    expect(() => planGroupLayout(n)).toThrow(RangeError);
  });
});
