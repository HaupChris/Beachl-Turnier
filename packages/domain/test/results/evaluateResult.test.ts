import { describe, expect, it } from 'vitest';
import { evaluateResult } from '../../src';
import { BEST_OF_THREE_15, SINGLE_21, TWO_SETS_15 } from '../helpers';

const sets = (...pairs: [number, number][]) => pairs.map(([a, b]) => ({ a, b }));

describe('evaluateResult – gültige Ergebnisse (Q22–Q24, Q33)', () => {
  it('1 Satz bis 21', () => {
    const result = evaluateResult(SINGLE_21, sets([21, 15]));
    expect(result).toEqual({
      ok: true,
      summary: { setsA: 1, setsB: 0, pointsA: 21, pointsB: 15, winner: 'a' },
    });
  });

  it('2 Punkte Vorsprung ohne Obergrenze: 31:29 ist gültig', () => {
    expect(evaluateResult(SINGLE_21, sets([29, 31])).ok).toBe(true);
  });

  it('„2 Sätze“ erlaubt 1:1 ohne Sieger', () => {
    const result = evaluateResult(TWO_SETS_15, sets([15, 10], [12, 15]));
    expect(result.ok && result.summary.winner).toBeNull();
  });

  it('„2 Gewinnsätze“: dritter Satz geht bis 15, auch bei 21er-Sätzen', () => {
    const format = { kind: 'bestOfThree', pointsPerSet: 21 } as const;
    const result = evaluateResult(format, sets([21, 19], [17, 21], [15, 13]));
    expect(result.ok && result.summary).toEqual({
      setsA: 2,
      setsB: 1,
      pointsA: 53,
      pointsB: 53,
      winner: 'a',
    });
  });

  it('„2 Gewinnsätze“ 2:0', () => {
    const result = evaluateResult(BEST_OF_THREE_15, sets([10, 15], [13, 15]));
    expect(result.ok && result.summary.winner).toBe('b');
  });
});

describe('evaluateResult – ungültige Ergebnisse', () => {
  it.each([
    ['kein Team erreicht 21', SINGLE_21, sets([20, 18])],
    ['nur 1 Punkt Vorsprung', SINGLE_21, sets([21, 20])],
    ['über 21 mit mehr als 2 Vorsprung', SINGLE_21, sets([25, 20])],
    ['negative Punkte', SINGLE_21, sets([21, -1])],
    ['Kommazahlen', SINGLE_21, sets([21.5, 10])],
    ['zwei Sätze bei „1 Satz“', SINGLE_21, sets([21, 10], [21, 10])],
    ['ein Satz bei „2 Sätze“', TWO_SETS_15, sets([15, 10])],
    ['ein Satz bei „2 Gewinnsätze“', BEST_OF_THREE_15, sets([15, 10])],
    ['dritter Satz nach 2:0', BEST_OF_THREE_15, sets([15, 10], [15, 10], [15, 10])],
    ['fehlender dritter Satz bei 1:1', BEST_OF_THREE_15, sets([15, 10], [10, 15])],
    ['dritter Satz bis 21 statt 15', BEST_OF_THREE_15, sets([15, 10], [10, 15], [21, 10])],
  ])('lehnt ab: %s', (_label, format, input) => {
    const result = evaluateResult(format, input);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.length).toBeGreaterThan(0);
  });
});
