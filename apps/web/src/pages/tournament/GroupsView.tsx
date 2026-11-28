import { groupName, type MatchView, type TournamentView } from '@beachl/domain';
import { MatchCard } from '../../components/MatchCard';
import { StandingsTable } from '../../components/StandingsTable';

interface Props {
  readonly view: TournamentView;
  readonly onEnterResult: (match: MatchView) => void;
}

/** Gruppen (Q42): Tabelle und Spiele je Gruppe; bei „Jeder gegen jeden“ die Gesamttabelle. */
export function GroupsView({ view, onEnterResult }: Props) {
  if (view.table) {
    return <StandingsTable view={view} standings={view.table} groupIndex={null} title="Tabelle" />;
  }
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {view.groups.map(({ group, standings }) => (
        <div key={group.index} className="flex flex-col gap-3">
          <StandingsTable
            view={view}
            standings={standings}
            groupIndex={group.index}
            title={`Gruppe ${groupName(group.index)}`}
          />
          <details className="rounded-xl border border-line bg-paper p-3">
            <summary className="cursor-pointer font-semibold">
              Spiele der Gruppe {groupName(group.index)}
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {view.matches
                .filter((m) => m.phase === 'group' && m.groupIndex === group.index)
                .map((m) => (
                  <MatchCard
                    key={m.id}
                    view={view}
                    match={m}
                    onEnterResult={onEnterResult}
                    compact
                  />
                ))}
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}
