import type { MatchView, TournamentView } from '@beachl/domain';
import { formatTime, matchTitle, refereeLabel, sideLabel } from '../format';

interface MatchCardProps {
  readonly view: TournamentView;
  readonly match: MatchView;
  readonly onEnterResult?: (match: MatchView) => void;
  readonly compact?: boolean;
}

const STATUS: Record<MatchView['status'], { label: string; className: string }> = {
  waiting: { label: 'wartet auf Teams', className: 'text-muted' },
  ready: { label: 'bereit', className: 'text-blue font-semibold' },
  completed: { label: '✓ beendet', className: 'text-ink' },
  walkover: { label: 'kampflos', className: 'text-orange font-semibold' },
  cancelled: { label: 'annulliert', className: 'text-muted line-through' },
};

export function MatchCard({ view, match, onEnterResult, compact }: MatchCardProps) {
  const status = STATUS[match.status];
  const referee = refereeLabel(view, match.referee);
  const canEnter = onEnterResult && (match.status === 'ready' || match.status === 'completed');
  const border =
    match.status === 'ready'
      ? 'border-blue'
      : match.status === 'walkover'
        ? 'border-orange'
        : 'border-line';

  return (
    <article className={`flex flex-col gap-2 rounded-xl border-2 bg-paper p-3 ${border}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-muted">{matchTitle(view, match)}</span>
        <span className="tabular-nums text-muted">
          Feld {match.court} · {formatTime(match.start)}
        </span>
      </div>
      {(['a', 'b'] as const).map((side) => {
        const id = side === 'a' ? match.teamA : match.teamB;
        const isWinner = match.winner !== undefined && match.winner === id;
        const isLoser = match.winner !== undefined && id !== undefined && match.winner !== id;
        return (
          <div key={side} className="flex items-center justify-between gap-3">
            <span
              className={`min-w-0 truncate ${compact ? 'text-base' : 'text-lg'} ${
                isWinner ? 'font-bold' : isLoser ? 'text-muted' : ''
              } ${id === undefined ? 'italic text-muted' : ''}`}
            >
              {isWinner && <span aria-label="Sieger">▶ </span>}
              {sideLabel(view, match, side)}
            </span>
            <span className="flex gap-2 tabular-nums">
              {match.sets?.map((set, i) => (
                <span key={i} className={isWinner ? 'font-bold' : ''}>
                  {side === 'a' ? set.a : set.b}
                </span>
              ))}
            </span>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={status.className}>{status.label}</span>
        {referee && <span className="text-muted">Schiri: {referee}</span>}
        {canEnter && (
          <button
            type="button"
            onClick={() => onEnterResult(match)}
            className={
              match.status === 'completed'
                ? 'rounded-lg border-2 border-line px-3 py-1.5 text-sm font-semibold'
                : 'rounded-lg bg-blue px-4 py-2 font-semibold text-paper'
            }
          >
            {match.status === 'completed' ? 'Korrigieren' : 'Ergebnis'}
          </button>
        )}
      </div>
    </article>
  );
}
