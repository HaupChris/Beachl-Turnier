import { describe, expect, it } from 'vitest';
import { formatSlot } from '../../src';
import { type Format, planFor } from '../knockout/knockoutHelpers';
import { plansAvailable, readPlanSheets } from './csv';
import { extractPlanGroups } from './extractGroups';

/**
 * Excel-Abgleich K.o.-Runde: alle Spiele „Gruppenplatz gegen Gruppenplatz“ (Runde 1, Quali,
 * Vorschaltspiele, unteres Feld) im Vereinsplan gegen unseren Plan.
 * Gruppenbuchstaben der Pläne werden über die Setzliste auf G1…Gn (A, B, … nach Stärke) abgebildet.
 */

interface Case {
  readonly folder: string;
  readonly prefix: string;
  readonly format: Format;
  /** Teamzahl der Vorlage, falls im Plan weniger Teams eingetragen sind. */
  readonly templateTeams?: number;
}

const CASES: readonly Case[] = [
  {
    folder: '10er',
    prefix: '10er_5er Gruppe_alles ausspielen',
    format: 'split',
    templateTeams: 10,
  },
  {
    folder: '12er',
    prefix: '12er_3er Gruppen_alle kommen weiter_alles ausspielen',
    format: 'full',
    templateTeams: 12,
  },
  { folder: '16er', prefix: '16er_4er Gruppe_alle kommen weiter_alles ausspielen', format: 'full' },
  { folder: '16er', prefix: '16er_4er Gruppen_3 kommen weiter_alles ausspielen', format: 'split' },
  { folder: '20er', prefix: '20er_5er Gruppen_3 kommen weiter_alles ausspielen', format: 'split' },
  {
    folder: '24er',
    prefix: '24er_3er Gruppen_alle kommen weiter_alles ausspielen',
    format: 'full',
  },
];

const GROUP_RANK = [/^(\d)\.\s?([A-H])$/, /^(\d)\. Gruppe ([A-H])$/];
const GROUP_RANK_LETTER_FIRST = /^([A-H])(\d)$/;

function parseGroupRank(cell: string): { rank: number; letter: string } | undefined {
  for (const pattern of GROUP_RANK) {
    const m = pattern.exec(cell);
    if (m?.[1] && m[2]) return { rank: Number(m[1]), letter: m[2] };
  }
  const m = GROUP_RANK_LETTER_FIRST.exec(cell);
  return m?.[1] && m[2] ? { rank: Number(m[2]), letter: m[1] } : undefined;
}

function planPairs({ folder, prefix }: Case): { pairs: string[]; teamCount: number } {
  const sheets = readPlanSheets(folder, prefix);
  const { seeds, groups } = extractPlanGroups([...sheets.values()]);
  // Planbuchstabe → Buchstabe nach Stärke (Gruppe mit dem kleinsten Seed = A).
  const strength = [...groups]
    .map(([letter, names]) => [letter, Math.min(...names.map((n) => seeds.get(n) ?? 99))] as const)
    .sort((a, b) => a[1] - b[1]);
  const toStrength = new Map(strength.map(([letter], i) => [letter, 'ABCDEFGH'[i] ?? '?']));

  const pairs: string[] = [];
  for (const [name, sheet] of sheets) {
    if (!name.includes('Hauptrunde') && name !== 'Tabelle1') continue;
    for (const row of sheet) {
      const cells = row.filter((c) => c !== '');
      for (let i = 0; i < cells.length; i++) {
        const a = parseGroupRank(cells[i] ?? '');
        if (!a) continue;
        // Partner ist der nächste Gruppenplatz in derselben Zeile, höchstens zwei Zellen weiter.
        for (const j of [i + 1, i + 2]) {
          const b = parseGroupRank(cells[j] ?? '');
          if (!b) continue;
          const left = `${String(a.rank)}.${toStrength.get(a.letter) ?? '?'}`;
          const right = `${String(b.rank)}.${toStrength.get(b.letter) ?? '?'}`;
          pairs.push([left, right].sort().join('–'));
          i = j;
          break;
        }
      }
    }
  }
  return { pairs: pairs.sort(), teamCount: seeds.size };
}

describe.skipIf(!plansAvailable)('Excel-Abgleich: K.o.-Spiele zwischen Gruppenplätzen', () => {
  it.each(CASES)('$prefix', (planCase) => {
    const { pairs, teamCount } = planPairs(planCase);
    const { plan } = planFor(planCase.format, planCase.templateTeams ?? teamCount);
    const ours = plan.matches
      .filter((m) => m.slotA.kind === 'groupRank' && m.slotB.kind === 'groupRank')
      .map((m) => [formatSlot(m.slotA, plan), formatSlot(m.slotB, plan)].sort().join('–'))
      .sort();
    expect(pairs.length).toBeGreaterThan(0);
    expect(ours).toEqual(pairs);
  });
});
