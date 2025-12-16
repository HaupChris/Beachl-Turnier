import type { Match, Team, KnockoutRoundType } from '../types/tournament';
import { getKnockoutRoundLabel } from '../utils/knockout';
import { getPlacementRoundLabel } from '../utils/placementTree/index';
import { getShortMainRoundLabel } from '../utils/shortMainRound';
import { BracketMatch } from './BracketMatch';
import { SSVBBracketView } from './SSVBBracketView';

// Generic round label getter that works for all bracket types
function getRoundLabel(round: KnockoutRoundType | undefined, match?: Match): string {
  if (!round) return 'Runde';

  // Check for placement tree rounds
  if (round.startsWith('placement-round') || round === 'placement-final') {
    return getPlacementRoundLabel(round, match?.placementInterval);
  }

  // Check for shortened main round types
  if (['qualification', 'top-quarterfinal', 'top-semifinal', 'top-final', 'placement-5-8', 'placement-9-12', 'placement-13-16'].includes(round)) {
    return getShortMainRoundLabel(round, match?.placementInterval);
  }

  // Default to SSVB knockout labels
  return getKnockoutRoundLabel(round);
}

interface BracketViewProps {
  matches: Match[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
}

export function BracketView({ matches, teams, onMatchClick }: BracketViewProps) {
  // Group matches by round number for generic bracket display
  const matchesByRound = new Map<number, Match[]>();
  matches.forEach(match => {
    const round = match.round;
    if (!matchesByRound.has(round)) {
      matchesByRound.set(round, []);
    }
    matchesByRound.get(round)!.push(match);
  });

  // Sort rounds
  const sortedRounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  // Check if this is SSVB knockout (has specific round types)
  const isSSVBKnockout = matches.some(m =>
    m.knockoutRound === 'intermediate' ||
    m.knockoutRound === 'quarterfinal'
  );

  // For SSVB knockout, use the original layout
  if (isSSVBKnockout) {
    return <SSVBBracketView matches={matches} teams={teams} onMatchClick={onMatchClick} />;
  }

  // Generic bracket view for placement tree and short main round formats
  return (
    <div className="overflow-x-auto pb-4">
      {/* Mobile: Vertical layout */}
      <div className="md:hidden space-y-6">
        {sortedRounds.map(round => {
          const roundMatches = matchesByRound.get(round) || [];
          if (roundMatches.length === 0) return null;

          // Group matches by knockout round type within the same round
          const matchesByType = new Map<string, Match[]>();
          roundMatches.forEach(match => {
            const type = match.knockoutRound || `round-${round}`;
            if (!matchesByType.has(type)) {
              matchesByType.set(type, []);
            }
            matchesByType.get(type)!.push(match);
          });

          return Array.from(matchesByType.entries()).map(([type, typeMatches]) => (
            <div key={`${round}-${type}`}>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {getRoundLabel(type as KnockoutRoundType, typeMatches[0])}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {typeMatches.map(match => (
                  <BracketMatch
                    key={match.id}
                    match={match}
                    teams={teams}
                    allMatches={matches}
                    onClick={onMatchClick ? () => onMatchClick(match) : undefined}
                  />
                ))}
              </div>
            </div>
          ));
        })}
      </div>

      {/* Desktop: Horizontal bracket layout */}
      <div className="hidden md:block">
        <div className="flex gap-8 items-start min-w-max">
          {sortedRounds.map(round => {
            const roundMatches = matchesByRound.get(round) || [];
            if (roundMatches.length === 0) return null;

            // Group matches by knockout round type within the same round
            const matchesByType = new Map<string, Match[]>();
            roundMatches.forEach(match => {
              const type = match.knockoutRound || `round-${round}`;
              if (!matchesByType.has(type)) {
                matchesByType.set(type, []);
              }
              matchesByType.get(type)!.push(match);
            });

            return Array.from(matchesByType.entries()).map(([type, typeMatches]) => (
              <div key={`${round}-${type}`} className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-gray-600 text-center">
                  {getRoundLabel(type as KnockoutRoundType, typeMatches[0])}
                </h3>
                <div className="flex flex-col gap-4 justify-around">
                  {typeMatches.map(match => (
                    <BracketMatch
                      key={match.id}
                      match={match}
                      teams={teams}
                      allMatches={matches}
                      onClick={onMatchClick ? () => onMatchClick(match) : undefined}
                    />
                  ))}
                </div>
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
}
