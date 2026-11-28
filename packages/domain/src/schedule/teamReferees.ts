import type { MatchId, TeamId } from '../model/types';
import type { ScheduledReferee } from './types';

export interface RefereeRequest {
  readonly matchId: MatchId;
  readonly slot: number;
  readonly teams: readonly [TeamId, TeamId];
  /** Vorgesehener Schiedsrichter laut fester Reihenfolge (Q20, Q45). */
  readonly preferred:
    | { readonly kind: 'team'; readonly teamId: TeamId }
    | { readonly kind: 'loserOf'; readonly matchId: MatchId }
    | { readonly kind: 'none' };
}

/**
 * Schiedsrichter für Spiele mit bekannten Teams (Gruppenphase, Jeder gegen jeden).
 *
 * - Das vorgesehene Team pfeift, wenn es im Zeitfenster frei ist (Q20).
 * - „Verlierer von …“ gilt, wenn jenes Spiel in einem früheren Zeitfenster lag (Q45).
 * - Sonst pfeift gruppenübergreifend ein freies Team (Q49): bevorzugt eines, das auch im
 *   nächsten Zeitfenster nicht spielt und bisher am wenigsten gepfiffen hat.
 * - Gibt es kein freies Team, teilt die Turnierleitung zu.
 */
export function assignTeamReferees(
  requests: readonly RefereeRequest[],
  allTeams: readonly TeamId[],
): Map<MatchId, ScheduledReferee> {
  const playing = new Map<number, Set<TeamId>>();
  for (const r of requests) {
    const set = playing.get(r.slot) ?? new Set<TeamId>();
    r.teams.forEach((t) => set.add(t));
    playing.set(r.slot, set);
  }
  const slotOf = new Map(requests.map((r) => [r.matchId, r.slot]));
  const counts = new Map<TeamId, number>(allTeams.map((t) => [t, 0]));
  const usedInSlot = new Map<number, Set<TeamId>>();
  const result = new Map<MatchId, ScheduledReferee>();

  const ordered = [...requests].sort((x, y) => x.slot - y.slot);
  for (const r of ordered) {
    const busy = playing.get(r.slot) ?? new Set<TeamId>();
    const used = usedInSlot.get(r.slot) ?? new Set<TeamId>();
    usedInSlot.set(r.slot, used);
    const take = (teamId: TeamId): ScheduledReferee => {
      used.add(teamId);
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
      return { kind: 'team', teamId };
    };

    const pref = r.preferred;
    if (pref.kind === 'team' && !busy.has(pref.teamId) && !used.has(pref.teamId)) {
      result.set(r.matchId, take(pref.teamId));
      continue;
    }
    if (pref.kind === 'loserOf' && (slotOf.get(pref.matchId) ?? Infinity) < r.slot) {
      result.set(r.matchId, { kind: 'loserOf', matchId: pref.matchId });
      continue;
    }
    const busyNext = playing.get(r.slot + 1) ?? new Set<TeamId>();
    const candidates = allTeams
      .filter((t) => !busy.has(t) && !used.has(t))
      .sort(
        (a, b) =>
          Number(busyNext.has(a)) - Number(busyNext.has(b)) ||
          (counts.get(a) ?? 0) - (counts.get(b) ?? 0) ||
          allTeams.indexOf(a) - allTeams.indexOf(b),
      );
    const chosen = candidates[0];
    result.set(r.matchId, chosen === undefined ? { kind: 'organizer' } : take(chosen));
  }
  return result;
}
