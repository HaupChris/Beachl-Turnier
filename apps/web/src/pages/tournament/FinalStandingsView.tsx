import { formatPlace, type TournamentView } from '@beachl/domain';
import { teamName } from '../../format';

/** Endstand (Q42): Platzierung 1 bis N; geteilte Plätze zeigen den besten Platz (Q11). */
export function FinalStandingsView({ view }: { view: TournamentView }) {
  const withdrawnEarly = view.withdrawals.filter((w) => w.phase === 'preliminary');
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {!view.isFinished && (
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-muted">
          Das Turnier läuft noch. Hier stehen die Plätze, die schon feststehen.
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {view.placements.map((p) => {
          const withdrawn = view.withdrawals.some((w) => w.teamId === p.teamId);
          return (
            <li
              key={`${p.teamId}-${String(p.place)}`}
              className={`flex items-center gap-4 rounded-xl border bg-paper px-4 py-3 ${p.place <= 3 ? 'border-violet' : 'border-line'}`}
            >
              <span className="w-12 font-display text-2xl font-bold tabular-nums text-violet">
                {formatPlace(p.place)}
              </span>
              <span className="text-lg font-semibold">{teamName(view, p.teamId)}</span>
              {withdrawn && <span className="ml-auto text-sm text-orange">zurückgezogen</span>}
            </li>
          );
        })}
      </ol>
      {withdrawnEarly.length > 0 && (
        <p className="text-sm text-muted">
          In der Vorrunde zurückgezogen (ohne Platzierung):{' '}
          {withdrawnEarly.map((w) => teamName(view, w.teamId)).join(', ')}
        </p>
      )}
    </div>
  );
}
