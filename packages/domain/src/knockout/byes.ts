import type { MatchId } from '../model/types';
import type { RawMatch, RawPlan, RawSlot } from './rawPlan';
import type {
  BracketSection,
  KnockoutMatch,
  KnockoutPlan,
  PlacementEntry,
  SlotSource,
} from './types';

/**
 * Löst Freilose im Rohplan auf (Q5, Q9; README.md „Freilose in K.o.-Bäumen“):
 * - Gruppenplätze, die es nicht gibt (Gruppe zu klein), sind Freilose.
 * - Team gegen Freilos: Walkover, das Spiel entfällt; das Freilos wandert in den Verliererpfad.
 * - Freilos gegen Freilos: Spiel entfällt.
 * - Freilose landen hinten; ihre Plätze entfallen, die Plätze werden lückenlos neu nummeriert.
 */
export function simplifyByes(raw: RawPlan, groupSizes: readonly number[]): KnockoutPlan {
  type State = { kind: 'kept' } | { kind: 'walkover'; winner: RawSlot } | { kind: 'dropped' };
  const states = new Map<string, State>();

  const resolve = (slot: RawSlot): RawSlot => {
    switch (slot.kind) {
      case 'bye':
        return slot;
      case 'groupRank':
        return slot.rank <= (groupSizes[slot.groupIndex] ?? 0) ? slot : { kind: 'bye' };
      case 'winnerOf':
      case 'loserOf': {
        const state = states.get(slot.key);
        if (!state) throw new Error(`Spiel ${slot.key} wird vor seiner Definition referenziert`);
        if (state.kind === 'kept') return slot;
        if (state.kind === 'walkover' && slot.kind === 'winnerOf') return state.winner;
        return { kind: 'bye' };
      }
    }
  };

  const kept: { match: RawMatch; slotA: RawSlot; slotB: RawSlot; index: number }[] = [];
  const rawPlacements: { place: number; slot: RawSlot }[] = [];

  raw.matches.forEach((match, index) => {
    const slotA = resolve(match.slotA);
    const slotB = resolve(match.slotB);
    const byeA = slotA.kind === 'bye';
    const byeB = slotB.kind === 'bye';
    if (byeA && byeB) {
      states.set(match.key, { kind: 'dropped' });
    } else if (byeA || byeB) {
      const winner = byeA ? slotB : slotA;
      states.set(match.key, { kind: 'walkover', winner });
      if (match.terminal) rawPlacements.push({ place: match.placeFrom, slot: winner });
    } else {
      states.set(match.key, { kind: 'kept' });
      kept.push({ match, slotA, slotB, index });
      if (match.terminal) {
        rawPlacements.push({ place: match.placeFrom, slot: { kind: 'winnerOf', key: match.key } });
        rawPlacements.push({
          place: match.placeFrom + 1,
          slot: { kind: 'loserOf', key: match.key },
        });
      }
    }
  });
  for (const { slot, place } of raw.unplayed) {
    const resolved = resolve(slot);
    if (resolved.kind !== 'bye') rawPlacements.push({ place, slot: resolved });
  }

  // Lückenlose Neunummerierung; geteilte Plätze behalten den besten Platz (Q11).
  const renumber = (rawPlace: number): number =>
    1 + rawPlacements.filter((p) => p.place < rawPlace).length;

  const sectionOrder = new Map(raw.sections.map((s, i) => [s.id, i]));
  kept.sort(
    (x, y) =>
      x.match.round - y.match.round ||
      (sectionOrder.get(x.match.sectionId) ?? 0) - (sectionOrder.get(y.match.sectionId) ?? 0) ||
      x.index - y.index,
  );
  const idOf = new Map<string, MatchId>(kept.map((k, i) => [k.match.key, `K${String(i + 1)}`]));
  const toSource = (slot: RawSlot): SlotSource => {
    if (slot.kind === 'groupRank') return slot;
    if (slot.kind === 'bye') throw new Error('Freilos nach dem Auflösen');
    const matchId = idOf.get(slot.key);
    if (!matchId) throw new Error(`Spiel ${slot.key} fehlt`);
    return { kind: slot.kind, matchId };
  };

  const placesIn = (from: number, to: number) => {
    const inRange = rawPlacements.filter((p) => p.place >= from && p.place <= to);
    const mapped = inRange.map((p) => renumber(p.place));
    return { from: Math.min(...mapped), to: Math.max(...mapped) };
  };

  const matches: KnockoutMatch[] = kept.map(({ match, slotA, slotB }, i) => {
    const places = placesIn(match.placeFrom, match.placeTo);
    return {
      id: `K${String(i + 1)}`,
      number: i + 1,
      sectionId: match.sectionId,
      round: match.round,
      slotA: toSource(slotA),
      slotB: toSource(slotB),
      places,
      stage: match.playIn
        ? { kind: 'playIn' }
        : match.terminal
          ? { kind: 'placementMatch', place: places.from }
          : match.placeFrom === 1
            ? { kind: 'round', size: match.placeTo }
            : { kind: 'placementRound' },
    };
  });

  const placements: PlacementEntry[] = rawPlacements
    .map((p) => ({ place: renumber(p.place), source: toSource(p.slot) }))
    .sort((x, y) => x.place - y.place);

  const sections: BracketSection[] = raw.sections.flatMap((s) => {
    const own = matches.filter((m) => m.sectionId === s.id);
    if (own.length === 0) return [];
    const from = Math.min(...own.map((m) => m.places.from));
    const to = Math.max(...own.map((m) => m.places.to));
    return [
      { id: s.id, title: s.title || `Platz ${String(from)}–${String(to)}`, places: { from, to } },
    ];
  });

  return { sections, matches, placements };
}
