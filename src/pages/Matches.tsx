import { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, SetScore, PlayoffSettings, KnockoutRoundType } from '../types/tournament';
import { ScoreEntryModal } from '../components/ScoreEntryModal';
import { MatchCard } from '../components/MatchCard';
import { MatchFilters } from '../components/MatchFilters';
import { PlayoffConfigModal } from '../components/PlayoffConfigModal';
import { BracketView } from '../components/BracketView';
import { getPlayoffMatchLabel } from '../utils/playoff';
import { getKnockoutRoundLabel } from '../utils/knockout';
import { calculateMatchStartTime } from '../utils/scheduling';

export function Matches() {
  const { currentTournament, dispatch, state } = useTournament();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showPlayoffModal, setShowPlayoffModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');

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
  const isPlayoffSystem = currentTournament.system === 'playoff';
  const isGroupPhase = currentTournament.system === 'group-phase';
  const isKnockout = currentTournament.system === 'knockout';

  // Check if a finals tournament already exists for this tournament
  const hasFinalsAlready = state.tournaments.some(
    t => t.parentPhaseId === currentTournament.id && (t.system === 'playoff' || t.system === 'knockout')
  );

  const allMatchesComplete = currentTournament.matches.length > 0 &&
    currentTournament.matches.every(m => m.status === 'completed');

  // For Swiss: show after completing current round (not necessarily all rounds)
  // For Round Robin: show after all matches are complete
  // Never for playoff system (it's already a finals tournament)
  // Never for group-phase (knockout phase is created automatically)
  const canGeneratePlayoff = !isPlayoffSystem &&
    !isGroupPhase &&
    !isKnockout &&
    !hasFinalsAlready &&
    currentTournament.teams.length >= 2 &&
    ((isSwissSystem && currentRoundComplete) ||
     (isRoundRobin && allMatchesComplete));

  const handleGeneratePlayoff = (settings: PlayoffSettings) => {
    dispatch({
      type: 'CREATE_FINALS_TOURNAMENT',
      payload: {
        parentTournamentId: currentTournament.id,
        settings,
      },
    });
    setShowPlayoffModal(false);
  };

  // Get referee team name (or placeholder if not yet assigned)
  const getRefereeTeamName = (match: Match): string | null => {
    if (match.refereeTeamId) {
      // For knockout, referee might be from parent tournament
      const parentTournament = currentTournament.parentPhaseId
        ? state.tournaments.find(t => t.id === currentTournament.parentPhaseId)
        : null;
      const team = currentTournament.teams.find(t => t.id === match.refereeTeamId)
        || parentTournament?.teams.find(t => t.id === match.refereeTeamId);
      return team?.name || null;
    }
    // Return placeholder text if available
    if (match.refereePlaceholder) {
      return match.refereePlaceholder;
    }
    return null;
  };

  // Get match-specific settings - for playoff tournaments, use tournament settings directly
  const getMatchSettings = () => {
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

      {isSwissSystem && currentRound >= maxRounds && currentRoundComplete && !hasFinalsAlready && (
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

      {/* View mode toggle for knockout */}
      {isKnockout && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('bracket')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'bracket'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Turnierbaum
            </button>
          </div>
        </div>
      )}

      <MatchFilters
        filter={filter}
        onFilterChange={setFilter}
        teams={currentTournament.teams}
        selectedTeamId={selectedTeamId}
        onTeamChange={setSelectedTeamId}
      />

      {/* Bracket view for knockout */}
      {isKnockout && viewMode === 'bracket' && (
        <BracketView
          matches={currentTournament.matches}
          teams={currentTournament.teams}
          onMatchClick={(match) => setSelectedMatch(match)}
        />
      )}

      {/* List view (default for all, or selected for knockout) */}
      {(!isKnockout || viewMode === 'list') && (
        <>
          {/* Group Phase: Display by group */}
          {isGroupPhase && currentTournament.groupPhaseConfig && (
            <>
              {currentTournament.groupPhaseConfig.groups.map(group => {
                const groupMatches = filteredMatches.filter(m => m.groupId === group.id);
                if (groupMatches.length === 0) return null;
                return (
                  <div key={group.id} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                      {group.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {groupMatches.map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          getTeamName={getTeamName}
                          onClick={() => setSelectedMatch(match)}
                          scheduledTime={calculateMatchStartTime(match, currentTournament.matches, currentTournament)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Knockout: Display by knockout round */}
          {isKnockout && (
            <>
              {(['intermediate', 'quarterfinal', 'semifinal', 'third-place', 'final'] as KnockoutRoundType[]).map(roundType => {
                const roundMatches = filteredMatches.filter(m => m.knockoutRound === roundType);
                if (roundMatches.length === 0) return null;
                return (
                  <div key={roundType} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                      {getKnockoutRoundLabel(roundType)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {roundMatches.map(match => {
                        const refereeTeam = getRefereeTeamName(match);
                        return (
                          <MatchCard
                            key={match.id}
                            match={match}
                            getTeamName={getTeamName}
                            onClick={() => setSelectedMatch(match)}
                            playoffLabel={match.playoffForPlace ? getPlayoffMatchLabel(match.playoffForPlace) : undefined}
                            scheduledTime={calculateMatchStartTime(match, currentTournament.matches, currentTournament)}
                            refereeTeam={refereeTeam}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Regular tournaments: Display by round */}
          {!isGroupPhase && !isKnockout && (
            Array.from(new Set(filteredMatches.map(m => m.round)))
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
                          scheduledTime={calculateMatchStartTime(match, currentTournament.matches, currentTournament)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
          )}
        </>
      )}

      {selectedMatch && (() => {
        const matchSettings = getMatchSettings();
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
