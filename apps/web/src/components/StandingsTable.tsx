import {
  decideRockPaperScissors,
  type GroupStandings,
  type TeamId,
  type TournamentView,
} from '@beachl/domain';
import { useState } from 'react';
import { teamName } from '../format';
import { useApp } from '../state/appStore';

interface StandingsTableProps {
  readonly view: TournamentView;
  readonly standings: GroupStandings;
  /** Gruppenindex, `null` für die Tabelle bei „Jeder gegen jeden“. */
  readonly groupIndex: number | null;
  readonly title: string;
}

/** Tabelle mit Punkten, Satz- und Ballpunktdifferenz (Q6) und Schere-Stein-Papier-Eingabe (Q7). */
export function StandingsTable({ view, standings, groupIndex, title }: StandingsTableProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <span className="text-sm text-muted">
          {standings.isFinal
            ? '✓ endgültig'
            : standings.isComplete
              ? 'Entscheidung offen'
              : 'läuft'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <thead className="text-sm text-muted">
            <tr>
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Team</th>
              <th className="py-1 pr-2 text-right">Sp.</th>
              <th className="py-1 pr-2 text-right">Pkt.</th>
              <th className="py-1 pr-2 text-right">Sätze</th>
              <th className="py-1 text-right">Bälle</th>
            </tr>
          </thead>
          <tbody>
            {standings.rows.map((row) => (
              <tr key={row.teamId} className="border-t border-line">
                <td className="py-2 pr-2 font-semibold">{row.rank}.</td>
                <td className="py-2 pr-2">{teamName(view, row.teamId)}</td>
                <td className="py-2 pr-2 text-right">{row.played}</td>
                <td className="py-2 pr-2 text-right font-bold">{row.points}</td>
                <td className="py-2 pr-2 text-right">
                  {row.setsWon}:{row.setsLost}
                </td>
                <td className="py-2 text-right">
                  {row.pointsWon}:{row.pointsLost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {standings.withdrawn.length > 0 && (
        <p className="text-sm text-muted">
          Zurückgezogen, alle Spiele annulliert:{' '}
          {standings.withdrawn.map((id) => teamName(view, id)).join(', ')}
        </p>
      )}
      {standings.pendingRockPaperScissors.map((tie) => (
        <RockPaperScissorsPanel key={tie.join('|')} view={view} tie={tie} groupIndex={groupIndex} />
      ))}
    </section>
  );
}

function RockPaperScissorsPanel({
  view,
  tie,
  groupIndex,
}: {
  view: TournamentView;
  tie: readonly TeamId[];
  groupIndex: number | null;
}) {
  const run = useApp((s) => s.run);
  const [order, setOrder] = useState<TeamId[]>([]);
  const remaining = tie.filter((id) => !order.includes(id));
  const complete = remaining.length <= 1;
  const finalOrder = complete ? [...order, ...remaining] : order;

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-orange bg-orange-soft p-3">
      <p className="font-semibold">Schere-Stein-Papier nötig</p>
      <p className="text-sm">
        Gleichstand, den auch der direkte Vergleich nicht trennt. Die Kapitäne spielen best-of-3
        nach einem Ehrenstein. Tippe die Teams in der Reihenfolge ihrer Platzierung an.
      </p>
      <div className="flex flex-wrap gap-2">
        {tie.map((id) => {
          const position = finalOrder.indexOf(id);
          return (
            <button
              key={id}
              type="button"
              disabled={order.includes(id)}
              onClick={() => setOrder((prev) => [...prev, id])}
              className="rounded-lg border-2 border-line bg-paper px-3 py-2 font-semibold disabled:border-violet"
            >
              {position >= 0 ? `${String(position + 1)}. ` : ''}
              {teamName(view, id)}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOrder([])}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        >
          Zurücksetzen
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={() => void run((doc) => decideRockPaperScissors(doc, groupIndex, finalOrder))}
          className="rounded-lg bg-violet px-4 py-2 font-semibold text-paper disabled:opacity-40"
        >
          Reihenfolge speichern
        </button>
      </div>
    </div>
  );
}
