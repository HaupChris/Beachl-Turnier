import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { groupName, planGroupPhase, snakePosition } from '../../src';
import { makeTeams } from '../helpers';

const seedsOf = (ids: readonly string[]) => ids.map((id) => Number(id.slice(1)));

describe('Schlangenverteilung (Q5, Q19)', () => {
  it('16 Teams auf 4 Gruppen wie in group-phase.md', () => {
    const plan = planGroupPhase(makeTeams(16));
    expect(plan.groups.map((g) => seedsOf(g.teamIds))).toEqual([
      [1, 8, 9, 16],
      [2, 7, 10, 15],
      [3, 6, 11, 14],
      [4, 5, 12, 13],
    ]);
    expect(plan.groups.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('14 Teams: die fehlenden Seeds 15 und 16 verkleinern G2 und G1 (Q5a)', () => {
    const plan = planGroupPhase(makeTeams(14));
    expect(plan.groups.map((g) => seedsOf(g.teamIds))).toEqual([
      [1, 8, 9],
      [2, 7, 10],
      [3, 6, 11, 14],
      [4, 5, 12, 13],
    ]);
  });

  it('Gruppennamen folgen der Stärke', () => {
    expect([0, 1, 7].map(groupName)).toEqual(['A', 'B', 'H']);
    expect(() => groupName(8)).toThrow(RangeError);
  });

  it('snakePosition lehnt ungültige Seeds ab', () => {
    expect(() => snakePosition(0, 4)).toThrow(RangeError);
  });
});

describe('planGroupPhase', () => {
  it('16 Teams: 24 Spiele, Reihenfolge und Schiedsrichter je Gruppe', () => {
    const plan = planGroupPhase(makeTeams(16));
    expect(plan.matches).toHaveLength(24);
    const groupA = plan.matches.filter((m) => m.groupIndex === 0);
    expect(groupA.map((m) => [m.id, m.teamA, m.teamB])).toEqual([
      ['A-1', 'T8', 'T9'],
      ['A-2', 'T1', 'T16'],
      ['A-3', 'T8', 'T16'],
      ['A-4', 'T1', 'T9'],
      ['A-5', 'T9', 'T16'],
      ['A-6', 'T1', 'T8'],
    ]);
    expect(groupA[0]?.referee).toEqual({ kind: 'team', teamId: 'T1' });
  });

  it('5er-Gruppe: letzter Schiedsrichter ist der Verlierer von Spiel 9 (Q45)', () => {
    const plan = planGroupPhase(makeTeams(10));
    const last = plan.matches.find((m) => m.id === 'A-10');
    expect(last?.referee).toEqual({ kind: 'loserOf', matchId: 'A-9' });
  });

  it('11 Teams: 2er-Gruppe mit einem Spiel ohne Schiedsrichter (Q4c)', () => {
    const plan = planGroupPhase(makeTeams(11));
    const groupD = plan.matches.filter((m) => m.groupIndex === 3);
    expect(groupD).toHaveLength(1);
    expect(groupD[0]?.referee).toEqual({ kind: 'none' });
  });

  it('Eigenschaften für alle Teamzahlen 6–32', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 32 }), (n) => {
        const plan = planGroupPhase(makeTeams(n));
        const allTeams = plan.groups.flatMap((g) => g.teamIds);
        expect(new Set(allTeams).size).toBe(n);
        const expectedMatches = plan.groups.reduce(
          (sum, g) => sum + (g.teamIds.length * (g.teamIds.length - 1)) / 2,
          0,
        );
        expect(plan.matches).toHaveLength(expectedMatches);
        for (const match of plan.matches) {
          const group = plan.groups[match.groupIndex];
          expect(match.teamA).not.toBe(match.teamB);
          expect(group?.teamIds).toContain(match.teamA);
          expect(group?.teamIds).toContain(match.teamB);
          if (match.referee.kind === 'team') {
            expect(group?.teamIds).toContain(match.referee.teamId);
            expect([match.teamA, match.teamB]).not.toContain(match.referee.teamId);
          }
        }
      }),
    );
  });

  it('Ergebnis hängt nicht von der Reihenfolge der Eingabe ab (metamorph)', () => {
    const teams = makeTeams(18);
    expect(planGroupPhase([...teams].reverse())).toEqual(planGroupPhase(teams));
  });

  it('lehnt lückenhafte Setzlisten und doppelte IDs ab', () => {
    const teams = makeTeams(8);
    expect(() => planGroupPhase(teams.map((t) => ({ ...t, seed: t.seed + 1 })))).toThrow(
      RangeError,
    );
    expect(() => planGroupPhase(teams.map((t) => ({ ...t, id: 'X' })))).toThrow(RangeError);
  });
});
