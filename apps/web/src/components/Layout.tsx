import type { ReactNode } from 'react';
import { useApp } from '../state/appStore';
import { href, TOURNAMENT_TABS, type TournamentTab } from '../router';

const TAB_LABELS: Record<TournamentTab, string> = {
  jetzt: 'Jetzt',
  spielplan: 'Spielplan',
  gruppen: 'Gruppen',
  baum: 'Baum',
  endstand: 'Endstand',
  teams: 'Teams',
};

interface LayoutProps {
  readonly title: string;
  readonly tournamentId?: string;
  readonly activeTab?: TournamentTab;
  readonly isRoundRobin?: boolean;
  readonly children: ReactNode;
}

export function Layout({ title, tournamentId, activeTab, isRoundRobin, children }: LayoutProps) {
  const error = useApp((s) => s.error);
  const clearError = useApp((s) => s.clearError);
  const undo = useApp((s) => s.undo);
  const canUndo = useApp((s) =>
    tournamentId ? (s.documents[tournamentId]?.events.length ?? 0) > 0 : false,
  );
  const tabs = TOURNAMENT_TABS.filter((t) => !(isRoundRobin && t === 'baum'));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <a href="#/" className="font-display text-lg font-bold text-violet">
            BeachL Turnier
          </a>
          <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold">{title}</h1>
          {tournamentId && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canUndo}
                onClick={() => void undo()}
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                ↶ Rückgängig
              </button>
              <a
                href={href({ page: 'board', id: tournamentId })}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
              >
                Aushang öffnen
              </a>
            </div>
          )}
        </div>
        {tournamentId && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Ansichten">
            {tabs.map((tab) => (
              <a
                key={tab}
                href={href({ page: 'tournament', id: tournamentId, view: tab })}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`whitespace-nowrap border-b-4 px-4 py-2 font-semibold ${
                  activeTab === tab ? 'border-violet text-violet' : 'border-transparent text-muted'
                }`}
              >
                {tab === 'gruppen' && isRoundRobin ? 'Tabelle' : TAB_LABELS[tab]}
              </a>
            ))}
          </nav>
        )}
      </header>
      {error && (
        <div role="alert" className="mx-auto mt-3 flex max-w-6xl items-start gap-3 px-4">
          <p className="flex-1 rounded-lg border-2 border-orange bg-orange-soft px-4 py-3 font-medium">
            ⚠ {error}
          </p>
          <button
            type="button"
            onClick={clearError}
            className="rounded-lg border border-line bg-paper px-3 py-3 text-sm"
          >
            Schließen
          </button>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
