import type { MatchId } from '../model/types';
import type { KnockoutPlan, SlotSource } from '../knockout/types';
import type { PlacementMatchPlan } from '../roundRobin/planRoundRobin';
import type { Minutes, PhaseScheduleOptions, ScheduledMatch, ScheduledReferee } from './types';

interface Timed {
  readonly matchId: MatchId;
  readonly court: number;
  readonly start: Minutes;
  readonly end: Minutes;
}

/**
 * Feste Reihenfolge nach Spielnummer; jedes Spiel kommt auf das Feld, das zuerst frei wird,
 * sobald beide Teams feststehen (Q21). `options.start` ist das Ende der Gruppenphase.
 */
function listSchedule(
  matches: readonly { readonly id: MatchId; readonly dependsOn: readonly MatchId[] }[],
  options: PhaseScheduleOptions,
): Timed[] {
  const courtFree = Array.from({ length: options.courts }, () => options.start);
  const finish = new Map<MatchId, Minutes>();
  return matches.map((m) => {
    const ready = Math.max(
      options.start,
      ...m.dependsOn.map((d) => finish.get(d) ?? options.start),
    );
    const court = courtFree.reduce(
      (best, free, i) => (free < (courtFree[best] ?? Infinity) ? i : best),
      0,
    );
    const start = Math.max(ready, courtFree[court] ?? options.start);
    const end = start + options.matchDuration;
    courtFree[court] = end;
    finish.set(m.id, end);
    return { matchId: m.id, court: court + 1, start, end };
  });
}

const dependencies = (sources: readonly SlotSource[]) =>
  sources.flatMap((s) => (s.kind === 'groupRank' ? [] : [s.matchId]));

const sourceKey = (s: SlotSource) =>
  s.kind === 'groupRank' ? `g${String(s.groupIndex)}-${String(s.rank)}` : `${s.kind}-${s.matchId}`;

/** Zeitplan der K.o.-Runde mit Schiedsrichtern (Q21, Q25). */
export function scheduleKnockout(
  plan: KnockoutPlan,
  options: PhaseScheduleOptions,
): ScheduledMatch[] {
  const timed = listSchedule(
    plan.matches.map((m) => ({ id: m.id, dependsOn: dependencies([m.slotA, m.slotB]) })),
    options,
  );
  const referees = options.referees ? assignKnockoutReferees(plan, timed, options) : undefined;
  return timed.map((t) => ({
    ...t,
    referee: referees?.get(t.matchId) ?? (referees ? { kind: 'organizer' } : undefined),
  }));
}

/**
 * Schiedsrichter im K.o. (Q25): Kandidaten sind Platzhalter, deren Team frei ist – Verlierer
 * eines beendeten Spiels (bevorzugt der zuletzt beendete), Teams mit Freilos (Gruppenplätze vor
 * ihrem ersten Spiel) und ausgeschiedene Teams. Wer im nächsten Zeitslot spielt, kommt nur zum
 * Zug, wenn sonst niemand frei ist.
 */
function assignKnockoutReferees(
  plan: KnockoutPlan,
  timed: readonly Timed[],
  options: PhaseScheduleOptions,
): Map<MatchId, ScheduledReferee> {
  const timeOf = new Map(timed.map((t) => [t.matchId, t]));
  const nextStart = new Map<string, Minutes>();
  const candidates = new Map<string, { source: SlotSource; available: Minutes; rank: number }>();
  const add = (source: SlotSource, available: Minutes, rank: number) => {
    candidates.set(sourceKey(source), { source, available, rank });
  };
  for (const m of plan.matches) {
    const t = timeOf.get(m.id);
    if (!t) continue;
    for (const s of [m.slotA, m.slotB]) {
      nextStart.set(sourceKey(s), t.start);
      if (s.kind === 'groupRank') add(s, options.start, 1);
    }
    add({ kind: 'loserOf', matchId: m.id }, t.end, 0);
    add({ kind: 'winnerOf', matchId: m.id }, t.end, 2);
  }

  const busy = new Map<string, { start: Minutes; end: Minutes }[]>();
  const counts = new Map<string, number>();
  const result = new Map<MatchId, ScheduledReferee>();
  for (const t of [...timed].sort((a, b) => a.start - b.start || a.court - b.court)) {
    const free = (key: string) =>
      !(busy.get(key) ?? []).some((b) => b.start < t.end && t.start < b.end);
    // Bevorzugt: Team spielt im nächsten Zeitslot nicht (Q25). Sonst darf es direkt danach
    // spielen, wie im 24er-Plan (Gruppensieger pfeifen Runde 1, spielen dann Achtelfinale).
    const freeBetween = (minNext: Minutes) =>
      [...candidates.entries()].filter(
        ([key, c]) =>
          c.available <= t.start && (nextStart.get(key) ?? Infinity) >= minNext && free(key),
      );
    const rested = freeBetween(t.end + options.matchDuration);
    const eligible = rested.length > 0 ? rested : freeBetween(t.end);
    eligible.sort(
      ([ka, a], [kb, b]) =>
        a.rank - b.rank ||
        (a.rank === 0 ? b.available - a.available : 0) ||
        (counts.get(ka) ?? 0) - (counts.get(kb) ?? 0) ||
        a.available - b.available,
    );
    const chosen = eligible[0];
    if (!chosen) continue;
    const [key, c] = chosen;
    busy.set(key, [...(busy.get(key) ?? []), { start: t.start, end: t.end }]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    result.set(t.matchId, { kind: 'placeholder', source: c.source });
  }
  return result;
}

/** Platzierungsspiele nach „Jeder gegen jeden“ (Q29): beginnen nach dem letzten Vorrundenspiel. */
export function scheduleRoundRobinPlacements(
  placementMatches: readonly PlacementMatchPlan[],
  options: PhaseScheduleOptions,
): ScheduledMatch[] {
  return listSchedule(
    placementMatches.map((m) => ({ id: m.id, dependsOn: [] })),
    options,
  ).map((t) => ({ ...t, referee: options.referees ? { kind: 'organizer' } : undefined }));
}
