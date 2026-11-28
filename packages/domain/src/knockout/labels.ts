import { groupName } from '../groups/snake';
import type { KnockoutPlan, MatchStage, SlotSource } from './types';

/** Anzeigename eines Platzhalters: „2.C“, „Sieger Spiel 5“, „Verlierer Spiel 5“. */
export function formatSlot(source: SlotSource, plan: KnockoutPlan): string {
  if (source.kind === 'groupRank') {
    return `${String(source.rank)}.${groupName(source.groupIndex)}`;
  }
  const number = plan.matches.find((m) => m.id === source.matchId)?.number ?? '?';
  return `${source.kind === 'winnerOf' ? 'Sieger' : 'Verlierer'} Spiel ${String(number)}`;
}

const ROUND_NAMES: Readonly<Record<number, string>> = {
  4: 'Halbfinale',
  8: 'Viertelfinale',
  16: 'Achtelfinale',
  32: 'Sechzehntelfinale',
};

/** Anzeigename der Spielart, z. B. „Viertelfinale“, „Spiel um Platz 5“, „Finale“. */
export function formatStage(stage: MatchStage): string {
  switch (stage.kind) {
    case 'round':
      return ROUND_NAMES[stage.size] ?? `Runde der letzten ${String(stage.size)}`;
    case 'placementRound':
      return 'Platzierungsrunde';
    case 'placementMatch':
      return stage.place === 1 ? 'Finale' : `Spiel um Platz ${String(stage.place)}`;
    case 'playIn':
      return 'Vorschaltspiel';
  }
}
