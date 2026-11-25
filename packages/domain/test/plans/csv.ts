import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Zugriff auf die lokal exportierten Vereinspläne (npm run plans:export).
 * Die Pläne sind nicht im Repo; fehlen sie, werden die Excel-Abgleich-Tests übersprungen.
 */
export const PLANS_DIR = fileURLToPath(new URL('../../../../.local/plans-csv', import.meta.url));

export const plansAvailable = existsSync(PLANS_DIR);

export type Sheet = string[][];

/** Liest alle CSV-Blätter eines Plans, z. B. „16er/16er_4er Gruppe_alle kommen weiter…“. */
export function readPlanSheets(folder: string, planPrefix: string): Map<string, Sheet> {
  const dir = join(PLANS_DIR, folder);
  const sheets = new Map<string, Sheet>();
  for (const file of readdirSync(dir)) {
    if (!file.startsWith(planPrefix) || !file.endsWith('.csv')) continue;
    const sheetName = file.slice(planPrefix.length + 1, -'.csv'.length);
    sheets.set(sheetName, parseCsv(readFileSync(join(dir, file), 'utf8')));
  }
  return sheets;
}

/** Minimaler CSV-Parser (Komma, Anführungszeichen ") für die LibreOffice-Exporte. */
export function parseCsv(text: string): Sheet {
  const rows: Sheet = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length > 0) rows.push([...row, cell.trim()]);
  return rows;
}

export const cellAt = (sheet: Sheet, r: number, c: number): string => sheet[r]?.[c] ?? '';
