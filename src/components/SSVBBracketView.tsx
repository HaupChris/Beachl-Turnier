import type { Match, Team } from '../types/tournament';
import { getKnockoutRoundLabel } from '../utils/knockout';
import { BracketMatch } from './BracketMatch';

interface SSVBBracketViewProps {
  matches: Match[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
}

export function SSVBBracketView({ matches, teams, onMatchClick }: SSVBBracketViewProps) {
  const intermediateMatches = matches.filter(m => m.knockoutRound === 'intermediate');
  const quarterfinalMatches = matches.filter(m => m.knockoutRound === 'quarterfinal');
  const semifinalMatches = matches.filter(m => m.knockoutRound === 'semifinal');
  const thirdPlaceMatch = matches.find(m => m.knockoutRound === 'third-place');
  const finalMatch = matches.find(m => m.knockoutRound === 'final');

  return (
    <div className="overflow-x-auto pb-4">
      {/* Mobile: Vertical layout */}
      <div className="md:hidden space-y-6">
        {intermediateMatches.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              {getKnockoutRoundLabel('intermediate')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {intermediateMatches.map(match => (
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
        )}
        {quarterfinalMatches.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              {getKnockoutRoundLabel('quarterfinal')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quarterfinalMatches.map(match => (
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
        )}
        {semifinalMatches.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              {getKnockoutRoundLabel('semifinal')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {semifinalMatches.map(match => (
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
        )}
        <div className="grid grid-cols-2 gap-2">
          {thirdPlaceMatch && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {getKnockoutRoundLabel('third-place')}
              </h3>
              <BracketMatch
                match={thirdPlaceMatch}
                teams={teams}
                allMatches={matches}
                onClick={onMatchClick ? () => onMatchClick(thirdPlaceMatch) : undefined}
              />
            </div>
          )}
          {finalMatch && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {getKnockoutRoundLabel('final')}
              </h3>
              <BracketMatch
                match={finalMatch}
                teams={teams}
                allMatches={matches}
                onClick={onMatchClick ? () => onMatchClick(finalMatch) : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Horizontal bracket layout */}
      <div className="hidden md:block">
        <div className="flex gap-8 items-start min-w-max">
          {intermediateMatches.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-600 text-center">
                {getKnockoutRoundLabel('intermediate')}
              </h3>
              <div className="flex flex-col gap-4">
                {intermediateMatches.map(match => (
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
          )}
          {quarterfinalMatches.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-600 text-center">
                {getKnockoutRoundLabel('quarterfinal')}
              </h3>
              <div className="flex flex-col gap-4 justify-around h-full">
                {quarterfinalMatches.map(match => (
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
          )}
          {semifinalMatches.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-600 text-center">
                {getKnockoutRoundLabel('semifinal')}
              </h3>
              <div className="flex flex-col gap-8 justify-around h-full">
                {semifinalMatches.map(match => (
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
          )}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-600 text-center">
              Finale
            </h3>
            <div className="flex flex-col gap-8 justify-around h-full">
              {finalMatch && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 text-center">Platz 1/2</p>
                  <BracketMatch
                    match={finalMatch}
                    teams={teams}
                    allMatches={matches}
                    onClick={onMatchClick ? () => onMatchClick(finalMatch) : undefined}
                  />
                </div>
              )}
              {thirdPlaceMatch && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 text-center">Platz 3/4</p>
                  <BracketMatch
                    match={thirdPlaceMatch}
                    teams={teams}
                    allMatches={matches}
                    onClick={onMatchClick ? () => onMatchClick(thirdPlaceMatch) : undefined}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
