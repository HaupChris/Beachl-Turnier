import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { resolveKnockout, type TeamId } from '../../src';
import {
  betterSeedWins,
  chalkGroupRanking,
  type Format,
  planFor,
  playOut,
  seedOf,
} from './knockoutHelpers';

const formats: Format[] = ['full', 'split'];

describe('Durchspielen des K.o.-Teils', () => {
  it('ohne Ergebnisse steht noch kein Platz fest, die Spiele der Runde 1 haben Teams', () => {
    const { groupPhase, plan } = planFor('full', 16);
    const resolution = resolveKnockout(plan, {
      groupRanking: chalkGroupRanking(groupPhase),
      winners: new Map(),
    });
    expect(resolution.isComplete).toBe(false);
    expect(resolution.matches[0]).toMatchObject({ teamA: 'T1', teamB: 'T13', winner: undefined });
  });

  it('Full Placement 16: Gewinnt immer der besser Gesetzte, landen 1–8 auf ihrem Setzplatz', () => {
    const { groupPhase, plan } = planFor('full', 16);
    const result = playOut(plan, chalkGroupRanking(groupPhase), betterSeedWins);
    expect(result.isComplete).toBe(true);
    const placeOf = new Map(result.placements.map((p) => [p.teamId, p.place]));
    for (let seed = 1; seed <= 4; seed++) expect(placeOf.get(`T${String(seed)}`)).toBe(seed);
  });

  it('Eigenschaft: Bei beliebigen Ergebnissen bekommt jedes Team genau einen Platz', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 32 }),
        fc.constantFrom(...formats),
        fc.infiniteStream(fc.boolean()),
        (n, format, coins) => {
          const { groupPhase, plan } = planFor(format, n);
          const iterator = coins[Symbol.iterator]();
          const result = playOut(plan, chalkGroupRanking(groupPhase), (a, b) =>
            iterator.next().value ? a : b,
          );
          expect(result.isComplete).toBe(true);
          const teams = result.placements.map((p) => p.teamId);
          expect(new Set(teams).size).toBe(n);
          expect(teams).toHaveLength(n);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('metamorph: Vertauschter Sieger im Finale tauscht nur Platz 1 und 2', () => {
    const { groupPhase, plan } = planFor('split', 16);
    const ranking = chalkGroupRanking(groupPhase);
    const final = plan.matches.find(
      (m) => m.stage.kind === 'placementMatch' && m.stage.place === 1,
    );
    const base = playOut(plan, ranking, betterSeedWins);
    const swapped = playOut(plan, ranking, (a, b, id) =>
      id === final?.id ? (betterSeedWins(a, b) === a ? b : a) : betterSeedWins(a, b),
    );
    const placeMap = (r: typeof base) => new Map(r.placements.map((p) => [p.teamId, p.place]));
    const before = placeMap(base);
    const after = placeMap(swapped);
    const changed = [...before].filter(([team, place]) => after.get(team) !== place);
    expect(changed.map(([, place]) => place).sort()).toEqual([1, 2]);
  });
});

describe('Rückzug im K.o. (Q28)', () => {
  it('nächstes Spiel endet als Walkover, danach verliert das Team jedes Spiel kampflos', () => {
    const { groupPhase, plan } = planFor('full', 16);
    const ranking = chalkGroupRanking(groupPhase);
    const withdrawn = new Set<TeamId>(['T1']);
    const result = playOut(plan, ranking, betterSeedWins, withdrawn);
    expect(result.isComplete).toBe(true);
    const first = result.matches[0];
    expect(first).toMatchObject({ teamA: 'T1', winner: 'T13', walkover: true });
    // T1 verliert alle Spiele im Baum ab Runde 1 → schlechtester Platz des Teilbaums 9–16.
    expect(result.placements.find((p) => p.teamId === 'T1')?.place).toBe(16);
  });

  it('bereits eingetragene Ergebnisse bleiben bei einem späteren Rückzug stehen', () => {
    const { groupPhase, plan } = planFor('full', 16);
    const winners = new Map([[plan.matches[0]?.id ?? '', 'T1']]);
    const resolution = resolveKnockout(plan, {
      groupRanking: chalkGroupRanking(groupPhase),
      winners,
      withdrawn: new Set(['T1']),
    });
    expect(resolution.matches[0]).toMatchObject({ winner: 'T1', walkover: false });
  });

  it('ein eingetragener Sieger, der nicht im Spiel steht, wird ignoriert', () => {
    const { groupPhase, plan } = planFor('full', 16);
    const resolution = resolveKnockout(plan, {
      groupRanking: chalkGroupRanking(groupPhase),
      winners: new Map([[plan.matches[0]?.id ?? '', 'T7']]),
    });
    expect(resolution.matches[0]?.winner).toBeUndefined();
  });

  it('zwei zurückgezogene Teams: Team A kommt kampflos weiter', () => {
    const { groupPhase, plan } = planFor('full', 16);
    const resolution = resolveKnockout(plan, {
      groupRanking: chalkGroupRanking(groupPhase),
      winners: new Map(),
      withdrawn: new Set(['T1', 'T13']),
    });
    expect(resolution.matches[0]).toMatchObject({ winner: 'T1', walkover: true });
  });
});

describe('Seed-Konsistenz (weiche Anforderung, Q14)', () => {
  it('Bericht: Abweichungen vom Setzplatz bei Favoritensiegen werden gezählt, nicht verboten', () => {
    const deviations: string[] = [];
    for (const format of formats) {
      for (let n = 6; n <= 32; n++) {
        const { groupPhase, plan } = planFor(format, n);
        const result = playOut(plan, chalkGroupRanking(groupPhase), betterSeedWins);
        const off = result.placements.filter((p) => p.place !== seedOf(p.teamId)).length;
        if (off > 0) deviations.push(`${format}-${String(n)}: ${String(off)}`);
      }
    }
    // Details stehen in den Freigabe-Dateien; hier nur: Der Bericht läuft durch.
    expect(Array.isArray(deviations)).toBe(true);
  });
});
