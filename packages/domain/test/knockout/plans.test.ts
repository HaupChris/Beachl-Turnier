import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatSlot, formatStage, type KnockoutPlan } from '../../src';
import { planFor } from './knockoutHelpers';

const slots = (plan: KnockoutPlan, n: number) =>
  plan.matches.slice(0, n).map((m) => `${formatSlot(m.slotA, plan)}–${formatSlot(m.slotB, plan)}`);

describe('Full Placement – Pläne (groups-full-placement.md)', () => {
  it.each([
    [8, 12],
    [10, 15],
    [12, 20],
    [16, 32],
    [20, 40],
    [24, 52],
    [32, 80],
  ])('%i Teams: %i K.o.-Spiele', (teams, expected) => {
    expect(planFor('full', teams).plan.matches).toHaveLength(expected);
  });

  it('16 Teams: Runde 1 wie im 16er-Plan (Q19)', () => {
    const { plan } = planFor('full', 16);
    expect(slots(plan, 8)).toEqual([
      '1.A–4.D',
      '2.C–3.B',
      '1.D–4.A',
      '2.B–3.C',
      '1.C–4.B',
      '2.A–3.D',
      '1.B–4.C',
      '2.D–3.A',
    ]);
    const ninth = plan.matches[8];
    expect(ninth && formatSlot(ninth.slotA, plan)).toBe('Sieger Spiel 1');
  });

  it('16 Teams: Finale ist Sieger der Halbfinals, alle Plätze 1–16 werden ausgespielt', () => {
    const { plan } = planFor('full', 16);
    const final = plan.matches.find(
      (m) => m.stage.kind === 'placementMatch' && m.stage.place === 1,
    );
    expect(final && formatStage(final.stage)).toBe('Finale');
    expect(plan.placements.map((p) => p.place)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
  });

  it('10 Teams (2×5): Vorschaltspiele 4.B–5.A und 4.A–5.B (Q27)', () => {
    const { plan } = planFor('full', 10);
    expect(slots(plan, 2)).toEqual(['4.B–5.A', '4.A–5.B']);
    expect(plan.matches.slice(0, 2).every((m) => m.stage.kind === 'playIn')).toBe(true);
  });

  it('20 Teams (4×5): Vorschaltspiele 4.D–5.C, 4.A–5.B, 4.B–5.A, 4.C–5.D (Q27)', () => {
    const { plan } = planFor('full', 20);
    expect(slots(plan, 4)).toEqual(['4.D–5.C', '4.A–5.B', '4.B–5.A', '4.C–5.D']);
  });

  it('12 Teams (4×3) ist identisch mit Short Main (Q36)', () => {
    expect(planFor('full', 12).plan).toEqual(planFor('split', 12).plan);
  });

  it('24 Teams (8×3): Runde 1 sind die Spiele 2. gegen 3. des 24er-Plans', () => {
    const { plan } = planFor('full', 24);
    expect(slots(plan, 8)).toEqual([
      '2.E–3.D',
      '2.B–3.G',
      '2.A–3.H',
      '2.F–3.C',
      '2.G–3.B',
      '2.D–3.E',
      '2.C–3.F',
      '2.H–3.A',
    ]);
  });
});

describe('Short Main – Pläne (groups-split-bracket.md)', () => {
  it.each([
    [10, 11],
    [16, 24],
    [20, 27],
  ])('%i Teams: %i K.o.-Spiele wie im Vereinsplan', (teams, expected) => {
    expect(planFor('split', teams).plan.matches).toHaveLength(expected);
  });

  it('16 Teams: Quali, Viertelfinale und Platz 9–12 (Q19, Q35, Q37)', () => {
    const { plan } = planFor('split', 16);
    expect(slots(plan, 6)).toEqual([
      '2.C–3.B',
      '2.B–3.C',
      '2.A–3.D',
      '2.D–3.A',
      '4.A–4.D',
      '4.C–4.B',
    ]);
    expect(slots(plan, 10).slice(6)).toEqual([
      '1.A–Sieger Spiel 1',
      '1.D–Sieger Spiel 2',
      '1.C–Sieger Spiel 3',
      '1.B–Sieger Spiel 4',
    ]);
    const ninth = plan.matches.filter((m) => m.places.from === 9 && m.places.to === 12);
    expect(ninth.map((m) => `${formatSlot(m.slotA, plan)}–${formatSlot(m.slotB, plan)}`)).toEqual([
      'Verlierer Spiel 3–Verlierer Spiel 1',
      'Verlierer Spiel 4–Verlierer Spiel 2',
    ]);
  });

  it('20 Teams (4×5): unteres Feld laut 20er-Plan, 5.C und 5.D teilen Platz 19 (Q26)', () => {
    const { plan } = planFor('split', 20);
    const lower = plan.matches.filter((m) => m.sectionId === 'lower');
    expect(
      lower.slice(0, 2).map((m) => `${formatSlot(m.slotA, plan)}–${formatSlot(m.slotB, plan)}`),
    ).toEqual(['5.A–4.D', '5.B–4.C']);
    const shared = plan.placements
      .filter((p) => p.place === 19)
      .map((p) => formatSlot(p.source, plan));
    expect(shared).toEqual(['5.C', '5.D']);
  });

  it('17 Teams: 5.B fehlt, 4.C kommt kampflos weiter (Q26)', () => {
    const { plan } = planFor('split', 17);
    const lower = plan.matches.filter((m) => m.sectionId === 'lower');
    const labels = lower.map((m) => `${formatSlot(m.slotA, plan)}–${formatSlot(m.slotB, plan)}`);
    expect(labels).toContain('5.A–4.D');
    expect(labels.some((l) => l.endsWith('–4.A') && l.startsWith('4.C'))).toBe(true);
  });

  it('32 Teams (8×4): Gruppenvierte 4.A–4.H, 4.E–4.D, 4.C–4.F, 4.G–4.B (Q48)', () => {
    const { plan } = planFor('split', 32);
    const lower = plan.matches.filter((m) => m.sectionId === 'lower').slice(0, 4);
    expect(lower.map((m) => `${formatSlot(m.slotA, plan)}–${formatSlot(m.slotB, plan)}`)).toEqual([
      '4.A–4.H',
      '4.E–4.D',
      '4.C–4.F',
      '4.G–4.B',
    ]);
  });
});

describe('Eigenschaften für alle Teamzahlen 6–32', () => {
  const formats = ['full', 'split'] as const;

  it('jedes Team bekommt genau einen Platz, Plätze beginnen bei 1 ohne Lücken (Q9, Q11)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 32 }), fc.constantFrom(...formats), (n, format) => {
        const { plan } = planFor(format, n);
        expect(plan.placements).toHaveLength(n);
        plan.placements.forEach((p, i) => {
          const before = plan.placements.filter((q) => q.place < p.place).length;
          expect(p.place).toBe(before + 1);
          expect(p.place).toBeLessThanOrEqual(i + 1);
        });
      }),
    );
  });

  it('Spiele verweisen nur auf frühere Spiele; jeder Platzhalter wird höchstens einmal verwendet', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 32 }), fc.constantFrom(...formats), (n, format) => {
        const { plan } = planFor(format, n);
        const used = new Set<string>();
        for (const m of plan.matches) {
          for (const s of [m.slotA, m.slotB]) {
            const key =
              s.kind === 'groupRank'
                ? `g${String(s.groupIndex)}-${String(s.rank)}`
                : `${s.kind}-${s.matchId}`;
            expect(used.has(key)).toBe(false);
            used.add(key);
            if (s.kind !== 'groupRank') {
              const ref = plan.matches.find((x) => x.id === s.matchId);
              expect(ref && ref.number < m.number).toBe(true);
            }
          }
        }
      }),
    );
  });

  it('Q15: Short Main hat nie mehr Spiele als Full Placement, mit 4er-/5er-Gruppen echt weniger', () => {
    for (let n = 6; n <= 32; n++) {
      const full = planFor('full', n);
      const split = planFor('split', n);
      const capacity = Math.max(...full.groupPhase.groups.map((g) => g.teamIds.length));
      if (capacity >= 4) expect(split.plan.matches.length).toBeLessThan(full.plan.matches.length);
      else expect(split.plan.matches.length).toBe(full.plan.matches.length);
    }
  });
});
