import type { MatchId, TeamId } from '../model/types';

/**
 * Zeitfenster-Planung für Spiele mit bekannten Teams (Gruppenphase, Jeder gegen jeden).
 *
 * Jede Warteschlange hält Spiele in fester Reihenfolge (Q20) und ist einem oder mehreren
 * Feldern zugeordnet. Ein Feld kann mehrere Warteschlangen abwechselnd bedienen (Q21).
 * Ein Spiel, dessen Teams im selben Zeitfenster schon spielen, wird zurückgestellt;
 * das nächste passende Spiel der Warteschlange wird vorgezogen.
 */

export interface QueueMatch {
  readonly id: MatchId;
  readonly teams: readonly [TeamId, TeamId];
}

export interface SlotAssignment {
  readonly matchId: MatchId;
  readonly court: number;
  readonly slot: number;
}

export function scheduleSlots(
  queues: readonly (readonly QueueMatch[])[],
  queuesOfCourt: readonly (readonly number[])[],
): SlotAssignment[] {
  const remaining = queues.map((q) => [...q]);
  const rotation = queuesOfCourt.map(() => 0);
  const assignments: SlotAssignment[] = [];
  const total = queues.reduce((sum, q) => sum + q.length, 0);

  for (let slot = 0; assignments.length < total; slot++) {
    const busy = new Set<TeamId>();
    const before = assignments.length;
    for (const [courtIndex, queueIds] of queuesOfCourt.entries()) {
      for (let k = 0; k < queueIds.length; k++) {
        const pointer = ((rotation[courtIndex] ?? 0) + k) % queueIds.length;
        const queue = remaining[queueIds[pointer] ?? -1];
        const index = queue?.findIndex((m) => !m.teams.some((t) => busy.has(t))) ?? -1;
        const match = index >= 0 ? queue?.[index] : undefined;
        if (!queue || !match) continue;
        queue.splice(index, 1);
        match.teams.forEach((t) => busy.add(t));
        assignments.push({ matchId: match.id, court: courtIndex + 1, slot });
        rotation[courtIndex] = (pointer + 1) % queueIds.length;
        break;
      }
    }
    if (assignments.length === before) throw new Error('Zeitplan kommt nicht voran');
  }
  return assignments;
}
