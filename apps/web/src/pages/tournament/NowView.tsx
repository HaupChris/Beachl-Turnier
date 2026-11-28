import type { MatchView, TournamentView } from '@beachl/domain';
import { MatchCard } from '../../components/MatchCard';
import { courtQueues, notices } from './courtQueue';

interface Props {
  readonly view: TournamentView;
  readonly onEnterResult: (match: MatchView) => void;
}

/** „Jetzt“ (Q42): pro Feld das aktuelle und das nächste Spiel, Ergebnis mit einem Tipp. */
export function NowView({ view, onEnterResult }: Props) {
  const hints = notices(view);
  return (
    <div className="flex flex-col gap-5">
      {hints.length > 0 && (
        <ul className="flex flex-col gap-2">
          {hints.map((h) => (
            <li
              key={h}
              className="rounded-lg border-2 border-orange bg-orange-soft px-4 py-3 font-medium"
            >
              ⚠ {h}
            </li>
          ))}
        </ul>
      )}
      {view.isFinished && (
        <p className="rounded-xl border-2 border-violet bg-violet-soft px-4 py-3 font-semibold">
          Das Turnier ist beendet. Der Endstand steht in der Ansicht „Endstand“.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courtQueues(view).map(({ court, current, next }) => (
          <section key={court} className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold">Feld {court}</h2>
            {current ? (
              <MatchCard view={view} match={current} onEnterResult={onEnterResult} />
            ) : (
              <p className="rounded-xl border-2 border-dashed border-line p-4 text-muted">
                Keine Spiele mehr auf diesem Feld.
              </p>
            )}
            {next && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-muted">Als Nächstes</span>
                <MatchCard view={view} match={next} compact />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
