import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type CompletedMatch, computeGroupStandings, type SetFormat } from '../../src';
import { SINGLE_21, TWO_SETS_15 } from '../helpers';

/** Zufällige, vollständig gespielte Gruppe mit 3–5 Teams. */
const arbitraryGroup = (format: SetFormat) =>
  fc.integer({ min: 3, max: 5 }).chain((size) => {
    const ids = Array.from({ length: size }, (_, i) => `T${String(i + 1)}`);
    const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const));
    const setScore = fc
      .tuple(fc.boolean(), fc.integer({ min: 0, max: format.pointsPerSet - 2 }))
      .map(([aWins, loser]) =>
        aWins ? { a: format.pointsPerSet, b: loser } : { a: loser, b: format.pointsPerSet },
      );
    const setsPerMatch = format.kind === 'twoSets' ? 2 : 1;
    return fc
      .tuple(
        ...pairs.map(() =>
          fc.array(setScore, { minLength: setsPerMatch, maxLength: setsPerMatch }),
        ),
      )
      .map((allSets) => ({
        ids,
        matches: pairs.map(([teamA, teamB], i): CompletedMatch => ({
          teamA,
          teamB,
          sets: allSets[i] ?? [],
        })),
      }));
  });

const key = (r: {
  points: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
}) => [r.points, r.setsWon - r.setsLost, r.pointsWon - r.pointsLost];

const lexGreaterOrEqual = (x: number[], y: number[]) => {
  for (let i = 0; i < x.length; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return true;
};

describe.each([
  ['1 Satz', SINGLE_21],
  ['2 Sätze', TWO_SETS_15],
])('Gruppentabelle – Eigenschaften (%s)', (_label, format) => {
  it('Reihenfolge ist nach Punkten, Satz- und Ballpunktdifferenz absteigend (Q6)', () => {
    fc.assert(
      fc.property(arbitraryGroup(format), ({ ids, matches }) => {
        const { rows } = computeGroupStandings({ teamIds: ids, matches, setFormat: format });
        for (let i = 1; i < rows.length; i++) {
          const prev = rows[i - 1];
          const cur = rows[i];
          if (prev && cur) expect(lexGreaterOrEqual(key(prev), key(cur))).toBe(true);
        }
      }),
    );
  });

  it('Ränge sind Positionen; nur offene Gleichstände teilen sich einen Rang', () => {
    fc.assert(
      fc.property(arbitraryGroup(format), ({ ids, matches }) => {
        const s = computeGroupStandings({ teamIds: ids, matches, setFormat: format });
        const tied = new Set(s.pendingRockPaperScissors.flat());
        s.rows.forEach((row, i) => {
          if (!tied.has(row.teamId)) expect(row.rank).toBe(i + 1);
        });
        expect(s.isComplete).toBe(true);
        expect(s.isFinal).toBe(s.pendingRockPaperScissors.length === 0);
      }),
    );
  });

  it('Gleichstand zweier Teams: der Sieger des direkten Spiels steht vorn (Q7)', () => {
    fc.assert(
      fc.property(arbitraryGroup(format), ({ ids, matches }) => {
        const { rows } = computeGroupStandings({ teamIds: ids, matches, setFormat: format });
        for (let i = 1; i < rows.length; i++) {
          const upper = rows[i - 1];
          const lower = rows[i];
          if (!upper || !lower || key(upper).join() !== key(lower).join()) continue;
          const neighbours = [rows[i - 2], rows[i + 1]].filter(
            (r) => r && key(r).join() === key(upper).join(),
          );
          if (neighbours.length > 0) continue; // nur echte Zweier-Gleichstände
          const direct = matches.find(
            (m) =>
              (m.teamA === upper.teamId && m.teamB === lower.teamId) ||
              (m.teamA === lower.teamId && m.teamB === upper.teamId),
          );
          if (!direct) continue;
          const setsUpper = direct.sets.filter((st) =>
            direct.teamA === upper.teamId ? st.a > st.b : st.b > st.a,
          ).length;
          expect(setsUpper * 2).toBeGreaterThanOrEqual(direct.sets.length);
        }
      }),
    );
  });

  it('metamorph: Umbenennen, Umsortieren und Seitentausch ändern die Tabelle nicht', () => {
    fc.assert(
      fc.property(arbitraryGroup(format), fc.boolean(), ({ ids, matches }, flip) => {
        const base = computeGroupStandings({ teamIds: ids, matches, setFormat: format });
        const rename = (id: string) => `X-${id}`;
        const transformed = [...matches].reverse().map((m) =>
          flip
            ? {
                teamA: rename(m.teamB),
                teamB: rename(m.teamA),
                sets: m.sets.map((st) => ({ a: st.b, b: st.a })),
              }
            : { teamA: rename(m.teamA), teamB: rename(m.teamB), sets: m.sets },
        );
        const other = computeGroupStandings({
          teamIds: ids.map(rename),
          matches: transformed,
          setFormat: format,
        });
        expect(other.rows.map((r) => [r.teamId, r.rank])).toEqual(
          base.rows.map((r) => [rename(r.teamId), r.rank]),
        );
      }),
    );
  });

  it('metamorph: ein Rückzug wirkt wie eine Gruppe ohne dieses Team (Q28)', () => {
    fc.assert(
      fc.property(arbitraryGroup(format), ({ ids, matches }) => {
        const withdrawnId = ids.at(-1) ?? '';
        const withWithdrawal = computeGroupStandings({
          teamIds: ids,
          matches,
          setFormat: format,
          withdrawn: new Set([withdrawnId]),
        });
        const without = computeGroupStandings({
          teamIds: ids.filter((id) => id !== withdrawnId),
          matches: matches.filter((m) => m.teamA !== withdrawnId && m.teamB !== withdrawnId),
          setFormat: format,
        });
        expect(withWithdrawal.rows).toEqual(without.rows);
      }),
    );
  });
});
