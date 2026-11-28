import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  deriveTournament,
  enterResult,
  parseTournament,
  revertWithdrawal,
  serializeTournament,
  type TournamentDocument,
  type TournamentFormat,
  undoLastEvent,
  withdrawTeam,
} from '../../src';
import { newTournament, playThrough, setFor } from './tournamentHelpers';

/**
 * Zufällige Ereignisfolgen (architecture.md „Teststrategie“): Ergebnisse, Korrekturen,
 * Rückzüge, Aufheben und Rückgängig in beliebiger Reihenfolge. Danach müssen alle
 * Invarianten gelten und das Turnier muss sich zu Ende spielen lassen.
 */

type Step =
  | { kind: 'result'; pick: number; winner: 'a' | 'b' }
  | { kind: 'correct'; pick: number }
  | { kind: 'withdraw'; pick: number }
  | { kind: 'revert'; pick: number }
  | { kind: 'undo' };

const step: fc.Arbitrary<Step> = fc.oneof(
  {
    weight: 8,
    arbitrary: fc.record({
      kind: fc.constant('result' as const),
      pick: fc.nat(),
      winner: fc.constantFrom('a' as const, 'b' as const),
    }),
  },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('correct' as const), pick: fc.nat() }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('withdraw' as const), pick: fc.nat() }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('revert' as const), pick: fc.nat() }) },
  { weight: 1, arbitrary: fc.constant({ kind: 'undo' as const }) },
);

function apply(doc: TournamentDocument, s: Step): TournamentDocument {
  const view = deriveTournament(doc);
  const choose = <T>(items: readonly T[], pick: number) => items[pick % Math.max(items.length, 1)];
  switch (s.kind) {
    case 'result': {
      const m = choose(
        view.matches.filter((x) => x.status === 'ready'),
        s.pick,
      );
      const r = m ? enterResult(doc, m.id, setFor(s.winner)) : undefined;
      return r?.ok ? r.value : doc;
    }
    case 'correct': {
      const m = choose(
        view.matches.filter((x) => x.status === 'completed'),
        s.pick,
      );
      const r = m
        ? enterResult(doc, m.id, setFor(m.summary?.winner === 'a' ? 'b' : 'a'))
        : undefined;
      return r?.ok ? r.value : doc;
    }
    case 'withdraw': {
      // höchstens zwei Rückzüge, damit das Turnier spielbar bleibt
      if (view.withdrawals.length >= 2) return doc;
      const team = choose(doc.config.teams, s.pick);
      const r = team ? withdrawTeam(doc, team.id) : undefined;
      return r?.ok ? r.value : doc;
    }
    case 'revert': {
      const w = choose(view.withdrawals, s.pick);
      const r = w ? revertWithdrawal(doc, w.teamId) : undefined;
      return r?.ok ? r.value : doc;
    }
    case 'undo':
      return undoLastEvent(doc);
  }
}

describe.each<[TournamentFormat, number]>([
  ['groups-full-placement', 10],
  ['groups-split-bracket', 13],
  ['round-robin', 5],
])('Zufällige Ereignisfolgen: %s mit %i Teams', (format, teams) => {
  it('Invarianten gelten nach jedem Schritt; das Turnier lässt sich zu Ende spielen', () => {
    fc.assert(
      fc.property(fc.array(step, { maxLength: 40 }), (steps) => {
        let doc = newTournament(format, teams);
        for (const s of steps) {
          doc = apply(doc, s);
          const view = deriveTournament(doc);
          const placed = view.placements.map((p) => p.teamId);
          expect(new Set(placed).size).toBe(placed.length);
          for (const m of view.matches) {
            if (m.status === 'completed' || m.status === 'walkover') expect(m.winner).toBeDefined();
            if (m.winner) expect([m.teamA, m.teamB]).toContain(m.winner);
          }
        }
        expect(parseTournament(serializeTournament(doc))).toEqual({ ok: true, value: doc });

        const finished = deriveTournament(playThrough(doc));
        expect(finished.isFinished).toBe(true);
        const groupWithdrawn = finished.withdrawals.filter((w) => w.phase === 'preliminary').length;
        expect(finished.placements).toHaveLength(teams - groupWithdrawn);
      }),
      { numRuns: 40 },
    );
  });
});
