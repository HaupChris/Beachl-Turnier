/**
 * Feste Spielreihenfolge in der Gruppe mit Schiedsrichter (Q20, Q45; group-phase.md).
 *
 * Positionen sind die Plätze in der Gruppe nach Setzung (1 = bester Seed der Gruppe).
 * Es gilt die Reihenfolge für die tatsächliche Gruppengröße. Da fehlende Teams immer
 * die schwächsten Setzplätze belegen, bleiben die Positionen lückenlos.
 */

export type RefereeRule =
  | { readonly kind: 'position'; readonly position: number }
  /** Verlierer des Spiels mit diesem 0-basierten Index in der Reihenfolge (Q45). */
  | { readonly kind: 'loserOf'; readonly orderIndex: number }
  /** 2er-Gruppe: kein freies Team in der Gruppe. */
  | { readonly kind: 'none' };

export interface GroupMatchTemplate {
  readonly positionA: number;
  readonly positionB: number;
  readonly referee: RefereeRule;
}

const ref = (position: number): RefereeRule => ({ kind: 'position', position });
const m = (positionA: number, positionB: number, referee: RefereeRule): GroupMatchTemplate => ({
  positionA,
  positionB,
  referee,
});

const ORDERS: Readonly<Record<number, readonly GroupMatchTemplate[]>> = {
  2: [m(1, 2, { kind: 'none' })],
  // 3er: 2–3 (1), 1–3 (2), 1–2 (3)
  3: [m(2, 3, ref(1)), m(1, 3, ref(2)), m(1, 2, ref(3))],
  // 4er: 2–3 (1), 1–4 (2), 2–4 (1), 1–3 (4), 3–4 (2), 1–2 (3)
  4: [
    m(2, 3, ref(1)),
    m(1, 4, ref(2)),
    m(2, 4, ref(1)),
    m(1, 3, ref(4)),
    m(3, 4, ref(2)),
    m(1, 2, ref(3)),
  ],
  // 5er: Es pfeift das Team, das weder dieses noch das nächste Spiel hat (Q20).
  // Das letzte Spiel 4–3 pfeift der Verlierer von 1–2 (Q45).
  5: [
    m(5, 3, ref(1)),
    m(2, 4, ref(3)),
    m(1, 5, ref(4)),
    m(3, 2, ref(5)),
    m(4, 1, ref(3)),
    m(2, 5, ref(4)),
    m(3, 1, ref(2)),
    m(5, 4, ref(3)),
    m(1, 2, ref(5)),
    m(4, 3, { kind: 'loserOf', orderIndex: 8 }),
  ],
};

export function groupMatchOrder(groupSize: number): readonly GroupMatchTemplate[] {
  const order = ORDERS[groupSize];
  if (!order) throw new RangeError(`Keine Spielreihenfolge für Gruppengröße ${String(groupSize)}.`);
  return order;
}
