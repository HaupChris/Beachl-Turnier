import { describe, expect, it } from 'vitest';
import { groupMatchOrder } from '../../src';

const pairs = (size: number) =>
  groupMatchOrder(size).map((t) => [t.positionA, t.positionB].sort().join('-'));

describe('groupMatchOrder (Q20, Q45)', () => {
  it.each([2, 3, 4, 5])('%ier-Gruppe: jedes Paar genau einmal', (size) => {
    const expected = (size * (size - 1)) / 2;
    expect(new Set(pairs(size)).size).toBe(expected);
    expect(pairs(size)).toHaveLength(expected);
  });

  it('3er- und 4er-Gruppe: Spitzenspiel 1–2 kommt zuletzt', () => {
    expect(pairs(3).at(-1)).toBe('1-2');
    expect(pairs(4).at(-1)).toBe('1-2');
  });

  it('4er-Reihenfolge laut Plan: 2–3 (1), 1–4 (2), 2–4 (1), 1–3 (4), 3–4 (2), 1–2 (3)', () => {
    expect(
      groupMatchOrder(4).map((t) => [
        t.positionA,
        t.positionB,
        t.referee.kind === 'position' ? t.referee.position : null,
      ]),
    ).toEqual([
      [2, 3, 1],
      [1, 4, 2],
      [2, 4, 1],
      [1, 3, 4],
      [3, 4, 2],
      [1, 2, 3],
    ]);
  });

  it.each([3, 4, 5])('%ier-Gruppe: Schiedsrichter spielt das Spiel nicht selbst', (size) => {
    for (const t of groupMatchOrder(size)) {
      if (t.referee.kind === 'position') {
        expect([t.positionA, t.positionB]).not.toContain(t.referee.position);
      }
    }
  });

  it('5er-Gruppe: Schiedsrichter hat weder dieses noch das nächste Spiel (Q20)', () => {
    const order = groupMatchOrder(5);
    order.slice(0, -1).forEach((t, i) => {
      const next = order[i + 1];
      expect(t.referee.kind).toBe('position');
      if (t.referee.kind !== 'position' || !next) return;
      const busy = [t.positionA, t.positionB, next.positionA, next.positionB];
      expect(busy).not.toContain(t.referee.position);
    });
  });

  it('5er-Gruppe: letztes Spiel 4–3 pfeift der Verlierer von 1–2 (Q45)', () => {
    const order = groupMatchOrder(5);
    const last = order.at(-1);
    expect(last?.referee).toEqual({ kind: 'loserOf', orderIndex: 8 });
    expect(pairs(5)[8]).toBe('1-2');
  });

  it('2er-Gruppe hat keinen Schiedsrichter aus der Gruppe', () => {
    expect(groupMatchOrder(2)[0]?.referee).toEqual({ kind: 'none' });
  });

  it('lehnt unbekannte Gruppengrößen ab', () => {
    expect(() => groupMatchOrder(6)).toThrow(RangeError);
  });
});
