import {
  createTournament,
  deriveTournament,
  groupName,
  type TournamentConfig,
} from '@beachl/domain';
import { formatTime } from '../../format';

/** Vorschau vor dem Start: Gruppen, Spielzahl und geschätztes Ende (Q42). */
export function SetupPreview({ config }: { config: TournamentConfig }) {
  const created = createTournament(config, { id: 'vorschau', createdAt: '' });
  if (!created.ok) {
    return (
      <aside className="rounded-xl border-2 border-orange bg-orange-soft p-4">
        <p className="font-semibold">Noch nicht startklar</p>
        <p className="text-sm">{created.error}</p>
      </aside>
    );
  }
  const view = deriveTournament(created.value);
  const preliminary = view.matches.filter((m) => m.phase === 'group' || m.phase === 'roundRobin');
  const later = view.matches.length - preliminary.length;
  const end = Math.max(...view.matches.map((m) => m.end));

  return (
    <aside className="flex flex-col gap-3 rounded-xl border-2 border-blue bg-blue-soft p-4">
      <p className="font-display text-lg font-bold">Vorschau</p>
      {view.groups.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {view.groups.map(({ group }) => (
            <li key={group.index} className="rounded-lg bg-paper p-2">
              <span className="font-semibold">Gruppe {groupName(group.index)}</span>
              <span className="block text-muted">
                {group.teamIds
                  .map(
                    (id) => `#${String(view.config.teams.find((t) => t.id === id)?.seed ?? '?')}`,
                  )
                  .join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">
          {view.groups.length > 0 ? 'Gruppenspiele' : 'Vorrundenspiele'}
        </dt>
        <dd className="font-semibold tabular-nums">{preliminary.length}</dd>
        <dt className="text-muted">
          {view.groups.length > 0 ? 'K.o.-Spiele' : 'Platzierungsspiele'}
        </dt>
        <dd className="font-semibold tabular-nums">{later}</dd>
        <dt className="text-muted">Geschätztes Ende</dt>
        <dd className="font-semibold tabular-nums">{formatTime(end)} Uhr</dd>
      </dl>
      {config.format === 'round-robin' && config.teams.length > 8 && (
        <p className="text-sm font-semibold text-orange">
          Mehr als 8 Teams: „Jeder gegen jeden“ dauert sehr lange.
        </p>
      )}
    </aside>
  );
}
