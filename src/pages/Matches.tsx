import { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, SetScore } from '../types/tournament';

export function Matches() {
  const { currentTournament, dispatch } = useTournament();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<SetScore[]>([]);
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

  const filteredMatches = currentTournament.matches.filter(match => {
    if (filter === 'pending') return match.status !== 'completed';
    if (filter === 'completed') return match.status === 'completed';
    return true;
  }).filter(match => {
    if (!selectedTeamId) return true;
    return match.teamAId === selectedTeamId || match.teamBId === selectedTeamId;
  });

  const handleOpenScoreEntry = (match: Match) => {
    setSelectedMatch(match);
    if (match.scores.length > 0) {
      setScores([...match.scores]);
    } else {
      const initialScores: SetScore[] = Array(currentTournament.setsPerMatch)
        .fill(null)
        .map(() => ({ teamA: 0, teamB: 0 }));
      setScores(initialScores);
    }
  };

  const handleScoreChange = (setIndex: number, team: 'teamA' | 'teamB', value: number) => {
    const newScores = [...scores];
    newScores[setIndex] = { ...newScores[setIndex], [team]: Math.max(0, value) };
    setScores(newScores);
  };

  const handleSaveScores = () => {
    if (!selectedMatch) return;

    dispatch({
      type: 'UPDATE_MATCH_SCORE',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
        scores,
      },
    });

    setSelectedMatch(null);
  };

  const handleCompleteMatch = () => {
    if (!selectedMatch) return;

    // First save the scores
    dispatch({
      type: 'UPDATE_MATCH_SCORE',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
        scores,
      },
    });

    // Then complete the match
    dispatch({
      type: 'COMPLETE_MATCH',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
      },
    });

    setSelectedMatch(null);
  };

  const getMatchStatus = (match: Match) => {
    if (match.status === 'completed') return { text: 'Beendet', color: 'bg-green-100 text-green-800' };
    if (match.status === 'in-progress') return { text: 'Läuft', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Geplant', color: 'bg-gray-100 text-gray-800' };
  };

  const completedCount = currentTournament.matches.filter(m => m.status === 'completed').length;
  const totalCount = currentTournament.matches.length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Spielplan</h2>
        <span className="text-sm text-gray-500">
          {completedCount}/{totalCount} Spiele
        </span>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ausstehend
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Beendet
        </button>
      </div>

      {/* Team Filter */}
      <div>
        <select
          value={selectedTeamId ?? ''}
          onChange={e => setSelectedTeamId(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Teams</option>
          {currentTournament.teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Matches by Round */}
      {Array.from(new Set(filteredMatches.map(m => m.round)))
        .sort((a, b) => a - b)
        .map(round => {
          const roundMatches = filteredMatches.filter(m => m.round === round);
          return (
            <div key={round} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Runde {round}
              </h3>
              {roundMatches.map(match => {
                const status = getMatchStatus(match);
                return (
                  <div
                    key={match.id}
                    onClick={() => match.status !== 'completed' && handleOpenScoreEntry(match)}
                    className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${
                      match.status === 'completed'
                        ? 'border-green-500'
                        : match.status === 'in-progress'
                        ? 'border-yellow-500'
                        : 'border-gray-300 cursor-pointer hover:border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        {match.courtNumber && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Feld {match.courtNumber}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">#{match.matchNumber}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div
                          className={`font-medium ${
                            match.winnerId === match.teamAId ? 'text-green-700' : 'text-gray-800'
                          }`}
                        >
                          {getTeamName(match.teamAId)}
                        </div>
                        <div
                          className={`font-medium ${
                            match.winnerId === match.teamBId ? 'text-green-700' : 'text-gray-800'
                          }`}
                        >
                          {getTeamName(match.teamBId)}
                        </div>
                      </div>

                      {match.scores.length > 0 && (
                        <div className="text-right">
                          {match.scores.map((score, i) => (
                            <div key={i} className="text-sm font-mono">
                              {score.teamA} - {score.teamB}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

      {/* Score Entry Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Ergebnis eintragen</h3>

            <div className="mb-4 text-center">
              <div className="text-lg font-medium text-gray-800">
                {getTeamName(selectedMatch.teamAId)}
              </div>
              <div className="text-gray-400">vs</div>
              <div className="text-lg font-medium text-gray-800">
                {getTeamName(selectedMatch.teamBId)}
              </div>
            </div>

            <div className="space-y-4">
              {scores.map((score, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 w-16">Satz {index + 1}</span>
                  <input
                    type="number"
                    min={0}
                    value={score.teamA}
                    onChange={e =>
                      handleScoreChange(index, 'teamA', parseInt(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-2 border border-gray-300 rounded text-center"
                  />
                  <span className="text-gray-400">:</span>
                  <input
                    type="number"
                    min={0}
                    value={score.teamB}
                    onChange={e =>
                      handleScoreChange(index, 'teamB', parseInt(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-2 border border-gray-300 rounded text-center"
                  />
                </div>
              ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSelectedMatch(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveScores}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Speichern
              </button>
              <button
                onClick={handleCompleteMatch}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Beenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
