import { revertWithdrawal, type TournamentView, withdrawTeam } from '@beachl/domain';
import { useState } from 'react';
import { useApp } from '../../state/appStore';

/** Teams: Rückzug während des Turniers und Aufheben (Q28). */
export function TeamsView({ view }: { view: TournamentView }) {
  const run = useApp((s) => s.run);
  const [confirm, setConfirm] = useState<string | undefined>();
  const phaseOf = (id: string) => view.withdrawals.find((w) => w.teamId === id)?.phase;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-muted">
        Zieht ein Team in der Vorrunde zurück, werden alle seine Gruppenspiele annulliert. Im K.o.
        gewinnt der Gegner kampflos, und das Team verliert jedes weitere Spiel kampflos. Mit
        „Aufheben“ wird der Rückzug zurückgenommen.
      </p>
      <ol className="flex flex-col gap-2">
        {[...view.config.teams]
          .sort((a, b) => a.seed - b.seed)
          .map((team) => {
            const phase = phaseOf(team.id);
            return (
              <li
                key={team.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3"
              >
                <span className="w-10 font-semibold tabular-nums text-violet">#{team.seed}</span>
                <span
                  className={`min-w-0 flex-1 font-semibold ${phase ? 'text-muted line-through' : ''}`}
                >
                  {team.name}
                </span>
                {phase ? (
                  <>
                    <span className="text-sm text-orange">
                      zurückgezogen ({phase === 'preliminary' ? 'Vorrunde' : 'K.o.'})
                    </span>
                    <button
                      type="button"
                      onClick={() => void run((doc) => revertWithdrawal(doc, team.id))}
                      className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                    >
                      Aufheben
                    </button>
                  </>
                ) : confirm === team.id ? (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirm(undefined);
                        void run((doc) => withdrawTeam(doc, team.id));
                      }}
                      className="rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-paper"
                    >
                      Rückzug bestätigen
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm(undefined)}
                      className="rounded-lg border border-line px-3 py-2 text-sm"
                    >
                      Abbrechen
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={view.isFinished}
                    onClick={() => setConfirm(team.id)}
                    className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Zieht zurück
                  </button>
                )}
              </li>
            );
          })}
      </ol>
    </div>
  );
}
