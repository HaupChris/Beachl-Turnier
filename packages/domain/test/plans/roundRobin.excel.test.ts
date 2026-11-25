import { describe, expect, it } from 'vitest';
import { roundRobinRounds } from '../../src';
import { plansAvailable, readPlanSheets } from './csv';

/**
 * Excel-Abgleich: Spielreihenfolge „Jeder gegen jeden“ (6er- und 8er-Plan).
 * Läuft nur lokal mit exportierten Plänen (npm run plans:export).
 */

const asKey = (a: number, b: number) => `${String(Math.min(a, b))}-${String(Math.max(a, b))}`;

/** 6er-Vorlage: Zeilen „RUNDE n | Feld | Team a | vs. | Team b“, Team-Nummer = Setzplatz. */
function sixTeamRounds(): string[][] {
  const sheet = readPlanSheets('6er', '6er Jeder gegen Jeden mit Finale').get('Vorrunde') ?? [];
  const rounds: string[][] = [];
  for (const row of sheet) {
    if (row.some((c) => /^RUNDE \d$/.test(c))) rounds.push([]);
    const vs = row.indexOf('vs.');
    const a = /^Team (\d)$/.exec(row[vs - 1] ?? '');
    const b = /^Team (\d)$/.exec(row[vs + 1] ?? '');
    if (vs > 0 && a?.[1] && b?.[1]) rounds.at(-1)?.push(asKey(Number(a[1]), Number(b[1])));
  }
  return rounds;
}

/** 8er-Plan: Tabelle mit Feldern als Spalten, Runden als Zeilen, Spiele als „a--b“. */
function eightTeamRounds(): string[][] {
  const sheet = readPlanSheets('8er', '8er Jeden gegen Jeden mit Finale').get('Spiele') ?? [];
  return sheet
    .map((row) =>
      row.flatMap((cell) => {
        const m = /^(\d)--(\d)$/.exec(cell);
        return m?.[1] && m[2] ? [asKey(Number(m[1]), Number(m[2]))] : [];
      }),
    )
    .filter((round) => round.length > 0);
}

const ours = (n: number) => roundRobinRounds(n).map((round) => round.map(([a, b]) => asKey(a, b)));

describe.skipIf(!plansAvailable)('Excel-Abgleich: Jeder gegen jeden (Q29)', () => {
  it('6er-Plan', () => {
    expect(ours(6)).toEqual(sixTeamRounds());
  });

  it('8er-Plan', () => {
    expect(ours(8)).toEqual(eightTeamRounds());
  });
});
