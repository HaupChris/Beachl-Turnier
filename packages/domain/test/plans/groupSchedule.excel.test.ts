import { describe, expect, it } from 'vitest';
import { planGroupPhase, scheduleGroupPhase } from '../../src';
import { makeTeams } from '../helpers';
import { plansAvailable, readPlanSheets } from './csv';
import { extractSeeds } from './extractGroups';

/**
 * Excel-Abgleich Zeitplan der Gruppenphase: 24er-Plan (8 Gruppen à 3, 8 Felder, 25 min, ab 14:10).
 * Verglichen werden je Spiel Anfangszeit und Schiedsrichter (Q20, Q21, Q50).
 */

const toMinutes = (text: string) => {
  const m = /^(\d{2}):(\d{2}):\d{2} (AM|PM)$/.exec(text);
  if (!m?.[1] || !m[2]) return undefined;
  const hours = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0);
  return hours * 60 + Number(m[2]);
};

describe.skipIf(!plansAvailable)('Excel-Abgleich: Zeitplan der Gruppenphase (24er-Plan)', () => {
  it('Anfangszeiten und Schiedsrichter je Gruppenspiel', () => {
    const sheets = readPlanSheets('24er', '24er_3er Gruppen_alle kommen weiter_alles ausspielen');
    const seeds = extractSeeds(sheets.values());
    const fromPlan: string[] = [];
    for (const row of sheets.get('Vorrunde') ?? []) {
      const vs = row.indexOf('vs.');
      if (vs < 2) continue;
      const a = seeds.get(row[vs - 1] ?? '');
      const b = seeds.get(row[vs + 1] ?? '');
      const ref = seeds.get(row[vs + 2] ?? '');
      const start = toMinutes(row[vs - 2] ?? '');
      if (a && b && ref && start !== undefined) {
        fromPlan.push(
          `${String(Math.min(a, b))}-${String(Math.max(a, b))} @${String(start)} Schiri ${String(ref)}`,
        );
      }
    }

    const plan = planGroupPhase(makeTeams(24));
    const schedule = scheduleGroupPhase(plan, {
      courts: 8,
      start: 14 * 60 + 10,
      matchDuration: 25,
      referees: true,
    });
    const byId = new Map(plan.matches.map((m) => [m.id, m]));
    const seed = (id: string) => Number(id.slice(1));
    const ours = schedule.map((s) => {
      const m = byId.get(s.matchId);
      const [a, b] = [seed(m?.teamA ?? ''), seed(m?.teamB ?? '')];
      const ref = s.referee?.kind === 'team' ? seed(s.referee.teamId) : -1;
      return `${String(Math.min(a, b))}-${String(Math.max(a, b))} @${String(s.start)} Schiri ${String(ref)}`;
    });

    expect(fromPlan).toHaveLength(24);
    expect([...ours].sort()).toEqual([...fromPlan].sort());
  });
});
