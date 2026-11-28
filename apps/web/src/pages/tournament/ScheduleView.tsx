import type { MatchView, TournamentView } from '@beachl/domain';
import { useState } from 'react';
import { MatchCard } from '../../components/MatchCard';
import { formatTime } from '../../format';

interface Props {
  readonly view: TournamentView;
  readonly onEnterResult: (match: MatchView) => void;
}

type StatusFilter = 'open' | 'done' | 'all';

/** Spielplan (Q42): alle Spiele nach Zeit und Feld, filterbar nach Status und Team. */
export function ScheduleView({ view, onEnterResult }: Props) {
  const [status, setStatus] = useState<StatusFilter>('open');
  const [team, setTeam] = useState('');

  const matches = view.matches
    .filter((m) => {
      const open = m.status === 'ready' || m.status === 'waiting';
      if (status === 'open' && !open) return false;
      if (status === 'done' && open) return false;
      return team === '' || m.teamA === team || m.teamB === team;
    })
    .sort((a, b) => a.start - b.start || a.court - b.court);
  const slots = [...new Set(matches.map((m) => m.start))];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div
          className="flex gap-1 rounded-lg border border-line bg-paper p-1"
          role="group"
          aria-label="Status"
        >
          {(
            [
              ['open', 'Offen'],
              ['done', 'Beendet'],
              ['all', 'Alle'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={`rounded-md px-4 py-2 font-semibold ${status === value ? 'bg-violet text-paper' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="team-filter">
          Team
          <select
            id="team-filter"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="rounded-lg border-2 border-line px-3 py-2 font-normal"
          >
            <option value="">Alle Teams</option>
            {view.config.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {slots.length === 0 && <p className="text-muted">Keine Spiele für diesen Filter.</p>}
      {slots.map((start) => (
        <section key={start} className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold tabular-nums">{formatTime(start)} Uhr</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {matches
              .filter((m) => m.start === start)
              .map((m) => (
                <MatchCard key={m.id} view={view} match={m} onEnterResult={onEnterResult} compact />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
