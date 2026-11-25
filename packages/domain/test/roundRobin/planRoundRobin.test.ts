import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { planRoundRobin, roundRobinFinalOrder, roundRobinRounds } from '../../src';
import { makeTeams } from '../helpers';

const pairKey = ([a, b]: readonly [number, number]) =>
  a < b ? `${String(a)}-${String(b)}` : `${String(b)}-${String(a)}`;

describe('roundRobinRounds (Q29)', () => {
  it('6 Teams: Reihenfolge des 6er-Plans', () => {
    expect(roundRobinRounds(6).map((round) => round.map(pairKey))).toEqual([
      ['2-5', '1-6', '3-4'],
      ['1-5', '2-4', '3-6'],
      ['1-4', '2-3', '5-6'],
      ['1-3', '2-6', '4-5'],
      ['1-2', '3-5', '4-6'],
    ]);
  });

  it('8 Teams: erste Runde des 8er-Plans', () => {
    expect(roundRobinRounds(8)[0]?.map(pairKey)).toEqual(['1-8', '2-7', '3-6', '4-5']);
  });

  it('Eigenschaften für 2–16 Teams: jedes Paar genau einmal, jedes Team höchstens einmal pro Runde', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 16 }), (n) => {
        const rounds = roundRobinRounds(n);
        const all = rounds.flat().map(pairKey);
        expect(all).toHaveLength((n * (n - 1)) / 2);
        expect(new Set(all).size).toBe(all.length);
        expect(rounds).toHaveLength(n % 2 === 0 ? n - 1 : n);
        for (const round of rounds) {
          const seeds = round.flat();
          expect(new Set(seeds).size).toBe(seeds.length);
          expect(seeds.every((s) => s >= 1 && s <= n)).toBe(true);
        }
      }),
    );
  });

  it('lehnt weniger als 2 Teams ab', () => {
    expect(() => roundRobinRounds(1)).toThrow(RangeError);
  });
});

describe('planRoundRobin', () => {
  it('6 Teams mit Platzierungsspielen: 15 + 3 Spiele', () => {
    const plan = planRoundRobin(makeTeams(6), { withPlacementMatches: true });
    expect(plan.matches).toHaveLength(15);
    expect(plan.matches[0]).toEqual({ id: 'R1-1', round: 1, teamA: 'T2', teamB: 'T5' });
    expect(plan.placementMatches.map((p) => [p.upperRank, p.lowerRank])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(plan.warnings).toEqual([]);
  });

  it('ungerade Teamzahl: der Letzte hat kein Platzierungsspiel', () => {
    const plan = planRoundRobin(makeTeams(7), { withPlacementMatches: true });
    expect(plan.placementMatches.map((p) => p.id)).toEqual(['P1', 'P3', 'P5']);
  });

  it('ohne Schalter keine Platzierungsspiele', () => {
    expect(planRoundRobin(makeTeams(5), { withPlacementMatches: false }).placementMatches).toEqual(
      [],
    );
  });

  it('mehr als 8 Teams: Warnung, aber kein Fehler', () => {
    expect(planRoundRobin(makeTeams(9), { withPlacementMatches: false }).warnings).toEqual([
      'manyTeams',
    ]);
  });

  it('lehnt weniger als 3 Teams und lückenhafte Setzlisten ab', () => {
    expect(() => planRoundRobin(makeTeams(2), { withPlacementMatches: false })).toThrow(RangeError);
    const gap = makeTeams(4).map((t) => ({ ...t, seed: t.seed * 2 }));
    expect(() => planRoundRobin(gap, { withPlacementMatches: false })).toThrow(RangeError);
  });
});

describe('roundRobinFinalOrder (Q29)', () => {
  const plan = planRoundRobin(makeTeams(5), { withPlacementMatches: true });
  const table = ['T1', 'T2', 'T3', 'T4', 'T5'];

  it('Ergebnis des Platzierungsspiels entscheidet den Platz', () => {
    const winners = new Map([
      ['P1', 'T1'],
      ['P3', 'T4'],
    ]);
    expect(roundRobinFinalOrder(table, plan.placementMatches, winners)).toEqual([
      'T1',
      'T2',
      'T4',
      'T3',
      'T5',
    ]);
  });

  it('solange ein Platzierungsspiel offen ist, gibt es keinen Endstand', () => {
    expect(
      roundRobinFinalOrder(table, plan.placementMatches, new Map([['P1', 'T1']])),
    ).toBeUndefined();
  });

  it('ohne Platzierungsspiele ist die Tabelle der Endstand', () => {
    expect(roundRobinFinalOrder(table, [], new Map())).toEqual(table);
  });

  it('lehnt einen Sieger ab, der nicht in diesem Spiel steht', () => {
    const winners = new Map([
      ['P1', 'T5'],
      ['P3', 'T3'],
    ]);
    expect(() => roundRobinFinalOrder(table, plan.placementMatches, winners)).toThrow(RangeError);
  });
});
