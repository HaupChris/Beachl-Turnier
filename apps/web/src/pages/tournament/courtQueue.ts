import type { MatchView, TournamentView } from '@beachl/domain';

export interface CourtQueue {
  readonly court: number;
  readonly current: MatchView | undefined;
  readonly next: MatchView | undefined;
}

const isOpen = (m: MatchView) => m.status === 'ready' || m.status === 'waiting';

/**
 * Pro Feld das aktuelle und das nächste offene Spiel in Zeitplan-Reihenfolge (Q42 „Jetzt“).
 * Ein Spiel, dessen Teams noch nicht feststehen, steht trotzdem in der Reihe, damit die
 * Turnierleitung sieht, worauf das Feld wartet.
 */
export function courtQueues(view: TournamentView): CourtQueue[] {
  return Array.from({ length: view.config.courts }, (_, i) => {
    const court = i + 1;
    const open = view.matches
      .filter((m) => m.court === court && isOpen(m))
      .sort((a, b) => a.start - b.start);
    return { court, current: open[0], next: open[1] };
  });
}

/** Hinweise für die Turnierleitung: offene Schere-Stein-Papier-Entscheidungen und Warnungen. */
export function notices(view: TournamentView): string[] {
  const list: string[] = [];
  view.groups.forEach(({ group, standings }) => {
    if (standings.pendingRockPaperScissors.length > 0) {
      list.push(
        `Schere-Stein-Papier in Gruppe ${'ABCDEFGH'[group.index] ?? '?'} nötig (Ansicht „Gruppen“).`,
      );
    }
  });
  if (view.table && view.table.pendingRockPaperScissors.length > 0) {
    list.push('Schere-Stein-Papier für die Tabelle nötig (Ansicht „Tabelle“).');
  }
  return [...list, ...view.warnings];
}
