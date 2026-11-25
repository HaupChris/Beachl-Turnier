import { describe, expect, it } from 'vitest';
import { planGroupPhase } from '../../src';
import { makeTeams } from '../helpers';
import { plansAvailable, readPlanSheets } from './csv';
import { extractPlanGroups } from './extractGroups';

/**
 * Excel-Abgleich: Gruppenzusammensetzung der Vereinspläne gegen die Schlangenverteilung.
 * Läuft nur lokal mit exportierten Plänen (npm run plans:export), sonst übersprungen.
 *
 * Verglichen werden die Setzplätze je Gruppe; die Gruppenbuchstaben der Pläne entsprechen
 * nicht der Stärke und werden ignoriert (README.md „Achtung, Gruppenbuchstaben“).
 */

interface PlanCase {
  readonly folder: string;
  readonly prefix: string;
  /** Bewusste Abweichung laut docs/schedules/README.md. */
  readonly knownDeviation?: string;
}

const CASES: readonly PlanCase[] = [
  { folder: '12er', prefix: '12er_3er Gruppen_alle kommen weiter_alles ausspielen' },
  { folder: '16er', prefix: '16er_4er Gruppe_alle kommen weiter_alles ausspielen' },
  { folder: '16er', prefix: '16er_4er Gruppen_3 kommen weiter_alles ausspielen' },
  { folder: '24er', prefix: '24er_3er Gruppen_alle kommen weiter_alles ausspielen' },
  {
    folder: '10er',
    prefix: '10er_5er Gruppe_alles ausspielen',
    knownDeviation: 'Q47: Vorlage verteilt ab Reihe 3 nicht im Zickzack',
  },
  {
    folder: '20er',
    prefix: '20er_5er Gruppen_3 kommen weiter_alles ausspielen',
    knownDeviation: 'Q47: Seed 17 und 18 manuell vertauscht',
  },
];

const normalize = (groups: number[][]) =>
  groups.map((g) => [...g].sort((a, b) => a - b)).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));

describe.skipIf(!plansAvailable)('Excel-Abgleich: Gruppen nach Schlange (Q5, Q47)', () => {
  it.each(CASES)('$prefix', ({ folder, prefix, knownDeviation }) => {
    const { seeds, groups } = extractPlanGroups([...readPlanSheets(folder, prefix).values()]);
    expect(seeds.size).toBeGreaterThanOrEqual(6);

    const fromPlan = normalize(
      [...groups.values()].map((names) => names.map((name) => seeds.get(name) ?? -1)),
    );
    const ours = normalize(
      planGroupPhase(makeTeams(seeds.size)).groups.map((g) =>
        g.teamIds.map((id) => Number(id.slice(1))),
      ),
    );

    if (knownDeviation) expect(fromPlan, knownDeviation).not.toEqual(ours);
    else expect(fromPlan).toEqual(ours);
  });
});
