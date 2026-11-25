import { cellAt, type Sheet } from './csv';

/**
 * Liest aus einem Vereinsplan die Setzliste und die Gruppenzusammensetzung.
 * Die Pläne sind unterschiedlich aufgebaut; erkannt werden:
 * - Setzliste als „#n | Name“ oder als Zahl + Name unter „Setzliste“, „Anmeldeliste“, „Teilnehmer“
 * - Gruppen als Block unter einer Zelle „Gruppe X“ mit Teamnamen in derselben Spalte
 */

export interface PlanGroups {
  /** Teamname → Setzplatz */
  readonly seeds: ReadonlyMap<string, number>;
  /** Gruppenbuchstabe laut Plan → Teamnamen in Plan-Reihenfolge */
  readonly groups: ReadonlyMap<string, readonly string[]>;
}

const SEED_LIST_HEADERS = new Set(['Setzliste', 'Anmeldeliste', 'Teilnehmer']);
const isInt = (s: string) => /^\d{1,2}$/.test(s);
const isName = (s: string) => s !== '' && !isInt(s) && s !== ':' && s !== '0' && !s.startsWith('#');

export function extractSeeds(sheets: Iterable<Sheet>): Map<string, number> {
  const seeds = new Map<string, number>();
  const put = (name: string, seed: number) => {
    if (!seeds.has(name)) seeds.set(name, seed);
  };
  for (const sheet of sheets) {
    sheet.forEach((row, r) => {
      row.forEach((cell, c) => {
        const hash = /^#(\d{1,2})$/.exec(cell);
        const next = cellAt(sheet, r, c + 1);
        if (hash?.[1] && isName(next)) put(next, Number(hash[1]));
        if (SEED_LIST_HEADERS.has(cell))
          readNumberedList(sheet, r, c).forEach(([n, s]) => {
            put(n, s);
          });
      });
    });
  }
  return seeds;
}

/**
 * Liest eine Setzliste unter einer Überschrift. Varianten:
 * - „n | Name“ oder Zahl links vom Namen
 * - nur Namen untereinander: Reihenfolge = Setzplatz (12er-Plan)
 * - Spalten „Frau | Herr“: Teamname = „Frau/Herr“ (20er-Plan)
 */
function readNumberedList(sheet: Sheet, headerRow: number, col: number): [string, number][] {
  const entries: [string, number][] = [];
  let pairColumns = false;
  for (let r = headerRow + 1; r < sheet.length; r++) {
    const before = cellAt(sheet, r, col - 1);
    const here = cellAt(sheet, r, col);
    const after = cellAt(sheet, r, col + 1);
    if (here === 'Frau' && after === 'Herr') {
      pairColumns = true;
      continue;
    }
    if (pairColumns && isName(here) && isName(after)) {
      entries.push([`${here}/${after}`, entries.length + 1]);
    } else if (isInt(before) && isName(here)) entries.push([here, Number(before)]);
    else if (isInt(here) && isName(after)) entries.push([after, Number(here)]);
    else if (!pairColumns && isName(here) && before === '' && after === '') {
      entries.push([here, entries.length + 1]);
    } else if (here === '' && entries.length === 0) continue;
    else break;
  }
  return entries;
}

export function extractGroups(sheets: Iterable<Sheet>, knownNames: ReadonlySet<string>) {
  const groups = new Map<string, string[]>();
  for (const sheet of sheets) {
    sheet.forEach((row, r) => {
      row.forEach((cell, c) => {
        const header = /^Gruppe ([A-H])$/.exec(cell);
        if (!header?.[1] || groups.has(header[1])) return;
        const members: string[] = [];
        for (let k = r + 1; k < sheet.length; k++) {
          const name = cellAt(sheet, k, c);
          if (!knownNames.has(name)) break;
          members.push(name);
        }
        if (members.length >= 2) groups.set(header[1], members);
      });
    });
  }
  return groups;
}

export function extractPlanGroups(sheets: readonly Sheet[]): PlanGroups {
  const seeds = extractSeeds(sheets);
  return { seeds, groups: extractGroups(sheets, new Set(seeds.keys())) };
}
