import { formatPlace, groupName, type TournamentView } from '@beachl/domain';
import { useEffect, useState } from 'react';
import { formatTime, matchTitle, refereeLabel, sideLabel, teamName } from '../../format';
import { useApp, useTournamentView } from '../../state/appStore';
import { courtQueues } from '../tournament/courtQueue';

type Screen = 'now' | 'tables' | 'final';
const ROTATION_MS = 15000;

/**
 * Aushang (Q42): Vollbild ohne Bedienelemente für einen zweiten Bildschirm oder Beamer.
 * Wechselt zwischen „Jetzt“ und Tabellen; nach Turnierende der Endstand.
 * Aktualisiert sich live über den BroadcastChannel des Stores.
 */
export function BoardPage({ id }: { id: string }) {
  const loaded = useApp((s) => s.loaded);
  const view = useTournamentView(id);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), ROTATION_MS);
    return () => clearInterval(timer);
  }, []);

  if (!view) return <p className="p-8 text-2xl">{loaded ? 'Turnier nicht gefunden.' : 'Lädt …'}</p>;
  const screens: Screen[] = view.isFinished ? ['final'] : ['now', 'tables'];
  const screen = screens[tick % screens.length] ?? 'now';

  return (
    <div className="min-h-screen bg-paper p-6 text-ink lg:p-10">
      <h1 className="mb-6 font-display text-4xl font-bold">{view.config.name}</h1>
      {screen === 'now' && <BoardNow view={view} />}
      {screen === 'tables' && <BoardTables view={view} />}
      {screen === 'final' && <BoardFinal view={view} />}
    </div>
  );
}

function BoardNow({ view }: { view: TournamentView }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
      {courtQueues(view).map(({ court, current, next }) => (
        <section key={court} className="rounded-2xl border-4 border-blue p-5">
          <h2 className="font-display text-3xl font-bold text-blue">Feld {court}</h2>
          {current ? (
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-lg text-muted">
                {matchTitle(view, current)} · {formatTime(current.start)}
              </p>
              <p className="text-3xl font-bold">{sideLabel(view, current, 'a')}</p>
              <p className="text-xl text-muted">gegen</p>
              <p className="text-3xl font-bold">{sideLabel(view, current, 'b')}</p>
              {current.referee && (
                <p className="mt-2 text-xl">Schiri: {refereeLabel(view, current.referee)}</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-2xl text-muted">frei</p>
          )}
          {next && (
            <p className="mt-4 border-t-2 border-line pt-3 text-xl">
              Danach: <strong>{sideLabel(view, next, 'a')}</strong> –{' '}
              <strong>{sideLabel(view, next, 'b')}</strong>
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

function BoardTables({ view }: { view: TournamentView }) {
  const tables = view.table
    ? [{ title: 'Tabelle', rows: view.table.rows }]
    : view.groups.map(({ group, standings }) => ({
        title: `Gruppe ${groupName(group.index)}`,
        rows: standings.rows,
      }));
  return (
    <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
      {tables.map((t) => (
        <section key={t.title} className="rounded-2xl border-4 border-violet p-5">
          <h2 className="mb-3 font-display text-3xl font-bold text-violet">{t.title}</h2>
          <ol className="flex flex-col gap-2 text-2xl">
            {t.rows.map((r) => (
              <li key={r.teamId} className="flex justify-between gap-3 tabular-nums">
                <span>
                  {r.rank}. {teamName(view, r.teamId)}
                </span>
                <span className="font-bold">{r.points}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function BoardFinal({ view }: { view: TournamentView }) {
  return (
    <ol className="grid gap-3 text-3xl md:grid-cols-2">
      {view.placements.map((p) => (
        <li
          key={`${p.teamId}-${String(p.place)}`}
          className="flex gap-4 rounded-2xl border-4 border-violet px-5 py-3"
        >
          <span className="w-16 font-display font-bold text-violet">{formatPlace(p.place)}</span>
          <span className="font-semibold">{teamName(view, p.teamId)}</span>
        </li>
      ))}
    </ol>
  );
}
