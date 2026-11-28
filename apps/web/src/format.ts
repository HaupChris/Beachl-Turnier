import {
  formatSlot,
  formatStage,
  groupName,
  type MatchView,
  type ScheduledReferee,
  type SetFormat,
  type SlotSource,
  type TeamId,
  type TournamentView,
} from '@beachl/domain';

/** Anzeige-Hilfen für die Oberfläche (deutsch). */

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTime(text: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match?.[1] || !match[2]) return undefined;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : undefined;
}

export function teamName(view: TournamentView, id: TeamId | undefined): string | undefined {
  return id === undefined ? undefined : (view.config.teams.find((t) => t.id === id)?.name ?? id);
}

export function slotLabel(view: TournamentView, source: SlotSource | undefined): string {
  if (!source) return 'offen';
  if (view.knockoutPlan) return formatSlot(source, view.knockoutPlan);
  return source.kind === 'groupRank'
    ? `${String(source.rank)}.${groupName(source.groupIndex)}`
    : 'offen';
}

/** Name des Teams, sonst der Platzhalter (z. B. „Sieger Spiel 5“). */
export function sideLabel(view: TournamentView, match: MatchView, side: 'a' | 'b'): string {
  const id = side === 'a' ? match.teamA : match.teamB;
  const name = teamName(view, id);
  if (name) return name;
  if (match.placementRank !== undefined) {
    return `Rang ${String(side === 'a' ? match.placementRank : match.placementRank + 1)}`;
  }
  return slotLabel(view, side === 'a' ? match.slotA : match.slotB);
}

export function refereeLabel(
  view: TournamentView,
  referee: ScheduledReferee | undefined,
): string | undefined {
  if (!referee) return undefined;
  switch (referee.kind) {
    case 'team':
      return teamName(view, referee.teamId);
    case 'loserOf':
      return `Verlierer ${referee.matchId}`;
    case 'placeholder':
      return slotLabel(view, referee.source);
    case 'organizer':
      return 'Turnierleitung teilt zu';
  }
}

export function matchTitle(view: TournamentView, match: MatchView): string {
  if (match.phase === 'group' && match.groupIndex !== undefined) {
    return `Gruppe ${groupName(match.groupIndex)} · Spiel ${match.id}`;
  }
  if (match.phase === 'roundRobin') return `Vorrunde · ${match.id}`;
  if (match.phase === 'placement') {
    return match.placementRank === 1 ? 'Finale' : `Spiel um Platz ${String(match.placementRank)}`;
  }
  const number = view.knockoutPlan?.matches.find((m) => m.id === match.id)?.number;
  return `${match.stage ? formatStage(match.stage) : 'K.o.'} · Spiel ${String(number ?? match.id)}`;
}

export const SET_FORMAT_LABELS: Record<SetFormat['kind'], string> = {
  singleSet: '1 Satz',
  twoSets: '2 Sätze',
  bestOfThree: '2 Gewinnsätze',
};

export function setFormatLabel(format: SetFormat): string {
  return `${SET_FORMAT_LABELS[format.kind]} bis ${String(format.pointsPerSet)}`;
}

export const FORMAT_LABELS = {
  'round-robin': 'Jeder gegen jeden',
  'groups-full-placement': 'Full Placement („alle kommen weiter“)',
  'groups-split-bracket': 'Short Main („3 kommen weiter“)',
} as const;
