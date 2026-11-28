import type { MatchView, TournamentView } from '@beachl/domain';
import { MatchCard } from '../../components/MatchCard';

interface Props {
  readonly view: TournamentView;
  readonly onEnterResult: (match: MatchView) => void;
}

/**
 * Baum (Q39, Q42): pro Feld bzw. Platzbereich ein Abschnitt, Spalten nach Runden.
 * Freilos-Spiele sind bereits entfernt (Q9). Auf schmalen Geräten scrollt der Baum seitlich.
 */
export function BracketView({ view, onEnterResult }: Props) {
  const plan = view.knockoutPlan;
  if (!plan) return <p className="text-muted">Dieser Modus hat keinen Baum.</p>;
  const byId = new Map(view.matches.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-8">
      {plan.sections.map((section) => {
        const matches = plan.matches.filter((m) => m.sectionId === section.id);
        const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
        const title = /^Platz \d/.test(section.title)
          ? section.title
          : `${section.title} · Platz ${String(section.places.from)}–${String(section.places.to)}`;
        return (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4" style={{ minWidth: `${String(rounds.length * 17)}rem` }}>
                {rounds.map((round) => (
                  <div key={round} className="flex w-64 shrink-0 flex-col justify-around gap-3">
                    {matches
                      .filter((m) => m.round === round)
                      .map((m) => {
                        const match = byId.get(m.id);
                        return match ? (
                          <MatchCard
                            key={m.id}
                            view={view}
                            match={match}
                            onEnterResult={onEnterResult}
                            compact
                          />
                        ) : null;
                      })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
