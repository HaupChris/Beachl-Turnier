import type { Match, Team } from '../types/tournament';
import { getKnockoutRoundLabel } from '../utils/knockout';

interface BracketViewProps {
  matches: Match[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
}

interface BracketMatchProps {
  match: Match;
  teams: Team[];
  allMatches: Match[]; // All matches to resolve dependencies
  onClick?: () => void;
}

/**
 * Gets the display text for a team slot in a bracket match
 * Shows team name if assigned, or placeholder text if pending
 */
function getTeamSlotDisplay(
  teamId: string | null,
  placeholder: string | undefined,
  dependency: { matchId: string; result: 'winner' | 'loser' } | undefined,
  teams: Team[],
  allMatches: Match[]
): { text: string; isPending: boolean } {
  if (teamId) {
    const team = teams.find(t => t.id === teamId);
    return { text: team?.name || 'TBD', isPending: false };
  }

  // Use placeholder text from match if available
  if (placeholder) {
    return { text: placeholder, isPending: true };
  }

  // Fall back to generating text from dependency
  if (dependency) {
    const dependentMatch = allMatches.find(m => m.id === dependency.matchId);
    if (dependentMatch) {
      const resultLabel = dependency.result === 'winner' ? 'Sieger' : 'Verlierer';
      return { text: `${resultLabel} Spiel ${dependentMatch.matchNumber}`, isPending: true };
    }
  }

  return { text: '---', isPending: true };
}

function BracketMatch({ match, teams, allMatches, onClick }: BracketMatchProps) {
  const teamADisplay = getTeamSlotDisplay(
    match.teamAId,
    match.teamAPlaceholder,
    match.dependsOn?.teamA,
    teams,
    allMatches
  );
  const teamBDisplay = getTeamSlotDisplay(
    match.teamBId,
    match.teamBPlaceholder,
    match.dependsOn?.teamB,
    teams,
    allMatches
  );

  const getScoreDisplay = () => {
    if (match.scores.length === 0) return null;
    return match.scores.map((s) => `${s.teamA}:${s.teamB}`).join(', ');
  };

  const isTeamWinner = (teamId: string | null) => {
    return match.winnerId && match.winnerId === teamId;
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border rounded-lg shadow-sm overflow-hidden min-w-[160px]
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${match.status === 'completed' ? 'border-green-300' : 'border-gray-200'}
      `}
    >
      {/* Match number badge */}
      <div className="bg-gray-100 px-2 py-0.5 text-xs text-gray-500 text-center border-b">
        Spiel {match.matchNumber}
      </div>

      {/* Team A */}
      <div
        className={`
          px-3 py-2 border-b text-sm flex justify-between items-center
          ${isTeamWinner(match.teamAId) ? 'bg-green-50 font-semibold' : ''}
          ${match.winnerId && !isTeamWinner(match.teamAId) ? 'text-gray-400' : ''}
          ${teamADisplay.isPending ? 'text-gray-400 italic' : ''}
        `}
      >
        <span className="truncate max-w-[120px]">
          {teamADisplay.text}
        </span>
        {match.scores.length > 0 && (
          <span className="text-xs text-gray-500 ml-2">
            {match.scores.reduce((sum, s) => sum + (s.teamA > s.teamB ? 1 : 0), 0)}
          </span>
        )}
      </div>

      {/* Team B */}
      <div
        className={`
          px-3 py-2 text-sm flex justify-between items-center
          ${isTeamWinner(match.teamBId) ? 'bg-green-50 font-semibold' : ''}
          ${match.winnerId && !isTeamWinner(match.teamBId) ? 'text-gray-400' : ''}
          ${teamBDisplay.isPending ? 'text-gray-400 italic' : ''}
        `}
      >
        <span className="truncate max-w-[120px]">
          {teamBDisplay.text}
        </span>
        {match.scores.length > 0 && (
          <span className="text-xs text-gray-500 ml-2">
            {match.scores.reduce((sum, s) => sum + (s.teamB > s.teamA ? 1 : 0), 0)}
          </span>
        )}
      </div>

      {/* Score display */}
      {match.scores.length > 0 && (
        <div className="px-3 py-1 bg-gray-50 text-xs text-gray-500 text-center">
          {getScoreDisplay()}
        </div>
      )}
    </div>
  );
}

export function BracketView({ matches, teams, onMatchClick }: BracketViewProps) {
  // Group matches by knockout round
  const intermediateMatches = matches.filter(m => m.knockoutRound === 'intermediate');
  const quarterfinalMatches = matches.filter(m => m.knockoutRound === 'quarterfinal');
  const semifinalMatches = matches.filter(m => m.knockoutRound === 'semifinal');
  const thirdPlaceMatch = matches.find(m => m.knockoutRound === 'third-place');
  const finalMatch = matches.find(m => m.knockoutRound === 'final');

  return (
    <div className="overflow-x-auto pb-4">
      {/* Mobile: Vertical layout */}
      <div className="md:hidden space-y-6">
        {/* Intermediate Round */}
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

        {/* Quarterfinals */}
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

        {/* Semifinals */}
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

        {/* Finals */}
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
          {/* Intermediate Round */}
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

          {/* Quarterfinals */}
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

          {/* Semifinals */}
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

          {/* Finals */}
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
