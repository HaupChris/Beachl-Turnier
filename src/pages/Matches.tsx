import { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, SetScore, PlayoffSettings } from '../types/tournament';
import { ScoreEntryModal } from '../components/ScoreEntryModal';
import { MatchCard } from '../components/MatchCard';
import { MatchFilters } from '../components/MatchFilters';
import { PlayoffConfigModal } from '../components/PlayoffConfigModal';
import { getPlayoffMatchLabel } from '../utils/playoff';

export function Matches() {
  const { currentTournament, dispatch } = useTournament();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showPlayoffModal, setShowPlayoffModal] = useState(false);

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

  const handleSubmitScore = (scores: SetScore[]) => {
    if (!selectedMatch) return;

    // Update the match scores
    dispatch({
      type: 'UPDATE_MATCH_SCORE',
      payload: {
        tournamentId: currentTournament.id,
        matchId: selectedMatch.id,
        scores,
      },
    });

    // Complete the match (can be edited again later)
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

  // Playoff logic: available for Swiss and Round Robin when a round is complete
  const isRoundRobin = currentTournament.system === 'round-robin';
  const hasPlayoffRound = currentTournament.hasPlayoffRound ?? false;
  const regularMatches = currentTournament.matches.filter(m => !m.isPlayoff);
  const allRegularMatchesComplete = regularMatches.length > 0 &&
    regularMatches.every(m => m.status === 'completed');

  // For Swiss: show after completing current round (not necessarily all rounds)
  // For Round Robin: show after all matches are complete
  const canGeneratePlayoff = !hasPlayoffRound &&
    currentTournament.teams.length >= 2 &&
    ((isSwissSystem && currentRoundComplete) ||
     (isRoundRobin && allRegularMatchesComplete));

  const handleGeneratePlayoff = (settings: PlayoffSettings) => {
    dispatch({
      type: 'GENERATE_PLAYOFF_ROUND',
      payload: {
        tournamentId: currentTournament.id,
        settings,
      },
    });
    setShowPlayoffModal(false);
  };

  // Get match-specific settings (use playoff settings for playoff matches)
  const getMatchSettings = (match: Match) => {
    if (match.isPlayoff && currentTournament.playoffSettings) {
      return currentTournament.playoffSettings;
    }
    return {
      setsPerMatch: currentTournament.setsPerMatch,
      pointsPerSet: currentTournament.pointsPerSet,
      pointsPerThirdSet: currentTournament.pointsPerThirdSet,
    };
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

      {isSwissSystem && currentRound >= maxRounds && currentRoundComplete && !hasPlayoffRound && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <span className="text-2xl mb-2 block">🏆</span>
          <p className="font-bold text-green-800">Alle Runden abgeschlossen!</p>
          <p className="text-sm text-green-700">Schau dir die finale Tabelle an.</p>
        </div>
      )}

      {/* Playoff option - visible when round is complete and playoff not yet generated */}
      {canGeneratePlayoff && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🏅</span>
            <h4 className="font-semibold text-amber-800">Finale Platzierungen ausspielen</h4>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            Erstelle eine Finalrunde, in der jeweils zwei benachbarte Teams in der aktuellen
            Tabelle die bessere Platzierung ausspielen (1. vs 2. um Platz 1, 3. vs 4. um Platz 3, usw.).
          </p>
          <button
            onClick={() => setShowPlayoffModal(true)}
            className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            Finalrunde konfigurieren
          </button>
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
          const isPlayoffRound = roundMatches.some(m => m.isPlayoff);
          return (
            <div key={round} className="space-y-3">
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${
                isPlayoffRound ? 'text-amber-700' : 'text-gray-600'
              }`}>
                {isPlayoffRound ? '🏅 Finale Platzierungen' : `Runde ${round}`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {roundMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    getTeamName={getTeamName}
                    onClick={() => setSelectedMatch(match)}
                    playoffLabel={match.isPlayoff && match.playoffForPlace
                      ? getPlayoffMatchLabel(match.playoffForPlace)
                      : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {selectedMatch && (() => {
        const matchSettings = getMatchSettings(selectedMatch);
        return (
          <ScoreEntryModal
            match={selectedMatch}
            setsPerMatch={matchSettings.setsPerMatch}
            pointsPerSet={matchSettings.pointsPerSet}
            pointsPerThirdSet={matchSettings.pointsPerThirdSet}
            getTeamName={getTeamName}
            onClose={() => setSelectedMatch(null)}
            onSubmit={handleSubmitScore}
          />
        );
      })()}

      {showPlayoffModal && (
        <PlayoffConfigModal
          standings={currentTournament.standings}
          teams={currentTournament.teams}
          defaultSettings={{
            setsPerMatch: currentTournament.setsPerMatch,
            pointsPerSet: currentTournament.pointsPerSet,
            pointsPerThirdSet: currentTournament.pointsPerThirdSet,
          }}
          onClose={() => setShowPlayoffModal(false)}
          onConfirm={handleGeneratePlayoff}
        />
      )}
    </div>
  );
}
