import { describe, expect, it } from 'vitest';
import { computeGroupStandings } from '../../src';
import { BEST_OF_THREE_15, played, SINGLE_21, TWO_SETS_15 } from '../helpers';

const order = (rows: readonly { teamId: string }[]) => rows.map((r) => r.teamId);
const ranks = (rows: readonly { rank: number }[]) => rows.map((r) => r.rank);

describe('Gruppentabelle – Grundreihenfolge (Q6)', () => {
  it('ordnet nach Siegen', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      matches: [played('B', 'C', [21, 10]), played('A', 'C', [21, 10]), played('B', 'A', [21, 19])],
    });
    expect(order(s.rows)).toEqual(['B', 'A', 'C']);
    expect(ranks(s.rows)).toEqual([1, 2, 3]);
    expect(s.isFinal).toBe(true);
  });

  it('bei „2 Sätze“ zählen gewonnene Sätze als Punkte, 1:1 ist ein Unentschieden', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B'],
      setFormat: TWO_SETS_15,
      matches: [played('A', 'B', [15, 10], [10, 15])],
    });
    expect(s.rows.map((r) => [r.teamId, r.points, r.drawn])).toEqual([
      ['A', 1, 1],
      ['B', 1, 1],
    ]);
  });

  it('Satzdifferenz vor Ballpunktdifferenz', () => {
    // Zyklus mit je einem Sieg; B hat die beste Ballpunktdifferenz, aber die schlechteste Satzdifferenz.
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: BEST_OF_THREE_15,
      matches: [
        played('A', 'B', [15, 13], [15, 13]),
        played('B', 'C', [15, 0], [0, 15], [15, 0]),
        played('C', 'A', [15, 0], [0, 15], [15, 0]),
      ],
    });
    expect(
      s.rows.map((r) => [r.teamId, r.setsWon - r.setsLost, r.pointsWon - r.pointsLost]),
    ).toEqual([
      ['A', 1, -11],
      ['C', 0, 0],
      ['B', -1, 11],
    ]);
  });
});

describe('Gruppentabelle – direkter Vergleich (Q7, Q46)', () => {
  it('zwei punktgleiche Teams: der direkte Vergleich entscheidet', () => {
    // A und B je 2 Siege, Satzdifferenz +1, Ballpunktdifferenz +8; B gewann das direkte Spiel.
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C', 'D'],
      setFormat: SINGLE_21,
      matches: [
        played('A', 'B', [19, 21]),
        played('A', 'C', [21, 15]),
        played('A', 'D', [21, 17]),
        played('B', 'C', [21, 11]),
        played('B', 'D', [17, 21]),
        played('C', 'D', [21, 10]),
      ],
    });
    const key = (id: string) => {
      const r = s.rows.find((row) => row.teamId === id);
      return r && [r.points, r.setsWon - r.setsLost, r.pointsWon - r.pointsLost];
    };
    expect(key('A')).toEqual([2, 1, 8]);
    expect(key('B')).toEqual([2, 1, 8]);
    expect(order(s.rows).slice(0, 2)).toEqual(['B', 'A']);
  });

  it('Mini-Tabelle trennt drei Teams vollständig nach Ballpunkten', () => {
    // Zyklus A>B>C>A, alle gleich auf Gesamtwertung bis auf die Mini-Tabelle.
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      matches: [played('A', 'B', [21, 15]), played('B', 'C', [21, 18]), played('C', 'A', [21, 20])],
    });
    // Ballpunktdifferenz gesamt = Mini-Tabelle: A +5, B -3, C -2
    expect(order(s.rows)).toEqual(['A', 'C', 'B']);
  });

  it('drei Teams, die auch die Mini-Tabelle nicht trennt → Schere-Stein-Papier', () => {
    // A, B, C: untereinander je 1:1 mit gleichen Ballpunkten, gegen D je 2:0 zu 30:0.
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C', 'D'],
      setFormat: TWO_SETS_15,
      matches: [
        played('A', 'B', [15, 13], [13, 15]),
        played('A', 'C', [15, 13], [13, 15]),
        played('B', 'C', [13, 15], [15, 13]),
        played('A', 'D', [15, 0], [15, 0]),
        played('B', 'D', [15, 0], [15, 0]),
        played('C', 'D', [15, 0], [15, 0]),
      ],
    });
    expect(s.pendingRockPaperScissors).toEqual([['A', 'B', 'C']]);
    expect(ranks(s.rows)).toEqual([1, 1, 1, 4]);
    expect(s.isFinal).toBe(false);
  });

  it('Q46: Restgleichstand nach der Mini-Tabelle wird erneut direkt verglichen', () => {
    // Gesamt: A, B, C je 2 Siege, Satzdiff +1, Ballpunktdiff +4.
    // Mini-Tabelle (Zyklus): A +2, B -1, C -1 → A vorn; B und C gleich.
    // Erneuter direkter Vergleich nur zwischen B und C: B schlug C.
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C', 'D'],
      setFormat: SINGLE_21,
      matches: [
        played('A', 'B', [21, 16]),
        played('B', 'C', [21, 17]),
        played('C', 'A', [21, 18]),
        played('A', 'D', [21, 19]),
        played('B', 'D', [21, 16]),
        played('C', 'D', [21, 16]),
      ],
    });
    expect(s.rows.slice(0, 3).map((r) => r.pointsWon - r.pointsLost)).toEqual([4, 4, 4]);
    expect(order(s.rows)).toEqual(['A', 'B', 'C', 'D']);
    expect(s.isFinal).toBe(true);
  });
});

describe('Gruppentabelle – Schere-Stein-Papier (Q6, Q7)', () => {
  const circular = [
    played('A', 'B', [21, 19]),
    played('B', 'C', [21, 19]),
    played('C', 'A', [21, 19]),
  ];

  it('vollständiger Zyklus ohne Trennung verlangt Schere-Stein-Papier', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      matches: circular,
    });
    expect(s.pendingRockPaperScissors).toEqual([['A', 'B', 'C']]);
    expect(ranks(s.rows)).toEqual([1, 1, 1]);
  });

  it('eingetragene Reihenfolge löst den Gleichstand', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      matches: circular,
      rockPaperScissors: [['C', 'A', 'B']],
    });
    expect(order(s.rows)).toEqual(['C', 'A', 'B']);
    expect(s.isFinal).toBe(true);
  });

  it('eine Reihenfolge für andere Teams wird ignoriert', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      matches: circular,
      rockPaperScissors: [['A', 'B']],
    });
    expect(s.pendingRockPaperScissors).toHaveLength(1);
  });

  it('während die Gruppe läuft, wird noch kein Schere-Stein-Papier verlangt', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      matches: [],
    });
    expect(s.isComplete).toBe(false);
    expect(s.pendingRockPaperScissors).toEqual([]);
    expect(ranks(s.rows)).toEqual([1, 1, 1]);
  });
});

describe('Gruppentabelle – Rückzug (Q28)', () => {
  it('alle Spiele eines zurückgezogenen Teams werden annulliert', () => {
    const s = computeGroupStandings({
      teamIds: ['A', 'B', 'C'],
      setFormat: SINGLE_21,
      withdrawn: new Set(['C']),
      matches: [played('A', 'C', [10, 21]), played('B', 'C', [21, 10]), played('A', 'B', [21, 15])],
    });
    expect(order(s.rows)).toEqual(['A', 'B']);
    expect(s.rows.map((r) => r.played)).toEqual([1, 1]);
    expect(s.withdrawn).toEqual(['C']);
    expect(s.isFinal).toBe(true);
  });
});
