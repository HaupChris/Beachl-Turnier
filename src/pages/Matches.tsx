import { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, SetScore } from '../types/tournament';
import { ScoreEntryModal } from '../components/ScoreEntryModal';
import { MatchCard } from '../components/MatchCard';
import { MatchFilters } from '../components/MatchFilters';

export function Matches() {
  const { currentTournament, dispatch } = useTournament();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  if (!currentTournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kein Turnier ausgewählt</p>
      </div>
    );
  }

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'TBD';
    const team = currentTournament.teams.find(t => t.id === teamId);
    return team?.name ?? 'Unbekannt';
  };

  const filteredMatches = currentTournament.matches
    .filter(match => {
      if (filter === 'pending') return match.status !== 'completed';
      if (filter === 'completed') return match.status === 'completed';
      return true;
    })
    .filter(match => {
      if (!selectedTeamId) return true;
      return match.teamAId === selectedTeamId || match.teamBId === selectedTeamId;
    });

  const handleSaveScores = (scores: SetScore[]) => {
    if (!selectedMatch) return;

    dispatch({
      type: 'UPDATE_MATCH_SCORE',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
        scores,
      },
    });
  };

  const handleCompleteMatch = (scores: SetScore[]) => {
    if (!selectedMatch) return;

    dispatch({
      type: 'UPDATE_MATCH_SCORE',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
        scores,
      },
    });

    dispatch({
      type: 'COMPLETE_MATCH',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
      },
    });
  };

  const completedCount = currentTournament.matches.filter(m => m.status === 'completed').length;
  const totalCount = currentTournament.matches.length;

  const isSwissSystem = currentTournament.system === 'swiss';
  const currentRound = currentTournament.currentRound || 1;
  const currentRoundMatches = currentTournament.matches.filter(m => m.round === currentRound);
  const currentRoundComplete = currentRoundMatches.length > 0 &&
    currentRoundMatches.every(m => m.status === 'completed');
  const maxRounds = currentTournament.numberOfRounds || 4;
  const canGenerateNextRound = isSwissSystem && currentRoundComplete && currentRound < maxRounds;

  const handleGenerateNextRound = () => {
    dispatch({ type: 'GENERATE_NEXT_SWISS_ROUND', payload: currentTournament.id });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Spielplan</h2>
        <span className="text-sm text-gray-500">
          {isSwissSystem ? `Runde ${currentRound}/${maxRounds}` : `${completedCount}/${totalCount} Spiele`}
        </span>
      </div>

      <div className="bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{
            width: `${isSwissSystem
              ? (currentRound / maxRounds) * 100
              : (completedCount / totalCount) * 100}%`
          }}
        />
      </div>

      {canGenerateNextRound && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-3">
            Runde {currentRound} abgeschlossen! Paarungen für die nächste Runde werden basierend auf
            den aktuellen Standings berechnet.
          </p>
          <button
            onClick={handleGenerateNextRound}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Runde {currentRound + 1} starten
          </button>
        </div>
      )}

      {isSwissSystem && currentRound >= maxRounds && currentRoundComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <span className="text-2xl mb-2 block">🏆</span>
          <p className="font-bold text-green-800">Alle Runden abgeschlossen!</p>
          <p className="text-sm text-green-700">Schau dir die finale Tabelle an.</p>
        </div>
      )}

      <MatchFilters
        filter={filter}
        onFilterChange={setFilter}
        teams={currentTournament.teams}
        selectedTeamId={selectedTeamId}
        onTeamChange={setSelectedTeamId}
      />

      {Array.from(new Set(filteredMatches.map(m => m.round)))
        .sort((a, b) => a - b)
        .map(round => {
          const roundMatches = filteredMatches.filter(m => m.round === round);
          return (
            <div key={round} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Runde {round}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {roundMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    getTeamName={getTeamName}
                    onClick={match.status !== 'completed' ? () => setSelectedMatch(match) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {selectedMatch && (
        <ScoreEntryModal
          match={selectedMatch}
          setsPerMatch={currentTournament.setsPerMatch}
          pointsPerSet={currentTournament.pointsPerSet}
          pointsPerThirdSet={currentTournament.pointsPerThirdSet}
          getTeamName={getTeamName}
          onClose={() => setSelectedMatch(null)}
          onSave={handleSaveScores}
          onComplete={handleCompleteMatch}
        />
      )}
    </div>
  );
}
