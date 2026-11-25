import { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, SetScore, PlayoffSettings } from '../types/tournament';
import { ScoreEntryModal } from '../components/ScoreEntryModal';
import { MatchFilters } from '../components/MatchFilters';
import { PlayoffConfigModal } from '../components/PlayoffConfigModal';
import { BracketView } from '../components/BracketView';
import {
  calculateMatchStartTimeForPhase,
  filterPlayableMatches,
  isGroupBasedSystem,
  isKnockoutPhaseSystem,
  isProgressiveRoundSystem,
} from '../domain';
import {
  MatchesHeader,
  NextRoundPrompt,
  SwissCompleteBanner,
  PlayoffPrompt,
  ViewModeToggle,
  DelayWarningToggle,
  // Use unified match list components
  RoundMatchList,
  KnockoutRoundMatchList,
  GroupMatchList,
  ShortMainRoundMatchList,
  PlacementTreeRoundMatchList,
} from '../components/matches';
import type { Tournament } from '../types/tournament';

export function Matches() {
  const { currentTournament, dispatch, state, containerPhases } = useTournament();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showPlayoffModal, setShowPlayoffModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');
  const [showDelayWarnings, setShowDelayWarnings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!showDelayWarnings) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [showDelayWarnings]);

  const currentTimeMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

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

  const playableMatches = filterPlayableMatches(currentTournament.matches);

  const filteredMatches = playableMatches
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
    dispatch({
      type: 'UPDATE_MATCH_SCORE',
      payload: { tournamentId: currentTournament.id, matchId: selectedMatch.id, scores },
    });
    dispatch({
      type: 'COMPLETE_MATCH',
      payload: { tournamentId: currentTournament.id, matchId: selectedMatch.id },
    });
  };

  const completedCount = playableMatches.filter(m => m.status === 'completed').length;
  const totalCount = playableMatches.length;
  const isSwissSystem = isProgressiveRoundSystem(currentTournament.system);
  const currentRound = currentTournament.currentRound || 1;
  const currentRoundMatches = playableMatches.filter(m => m.round === currentRound);
  const currentRoundComplete = currentRoundMatches.length > 0 &&
    currentRoundMatches.every(m => m.status === 'completed');
  const maxRounds = currentTournament.numberOfRounds || 4;
  const canGenerateNextRound = isSwissSystem && currentRoundComplete && currentRound < maxRounds;

  const isRoundRobin = currentTournament.system === 'round-robin';
  const isPlayoffSystem = currentTournament.system === 'playoff';
  const isGroupPhase = isGroupBasedSystem(currentTournament.system);
  // Knockout phase variants (used as Phase 2 of group-based tournaments)
  const isKnockout = currentTournament.system === 'knockout';
  const isShortMainKnockout = currentTournament.system === 'short-main-knockout';
  const isPlacementTree = currentTournament.system === 'placement-tree';
  const isAnyKnockout = isKnockout || isKnockoutPhaseSystem(currentTournament.system);

  const hasFinalsAlready = state.tournaments.some(
    t => t.parentPhaseId === currentTournament.id && (t.system === 'playoff' || t.system === 'knockout')
  );
  const allMatchesComplete = playableMatches.length > 0 &&
    playableMatches.every(m => m.status === 'completed');
  const hasPreConfiguredPlayoff = !!currentTournament.knockoutSettings;
  const canGeneratePlayoff = !isPlayoffSystem && !isGroupPhase && !isKnockout &&
    !hasFinalsAlready && !hasPreConfiguredPlayoff && currentTournament.teams.length >= 2 &&
    ((isSwissSystem && currentRoundComplete) || (isRoundRobin && allMatchesComplete));

  const handleGeneratePlayoff = (settings: PlayoffSettings) => {
    dispatch({
      type: 'CREATE_FINALS_TOURNAMENT',
      payload: { parentTournamentId: currentTournament.id, settings },
    });
    setShowPlayoffModal(false);
  };

  const getRefereeTeamName = (match: Match): string | null => {
    if (match.refereeTeamId) {
      const parentTournament = currentTournament.parentPhaseId
        ? state.tournaments.find(t => t.id === currentTournament.parentPhaseId)
        : null;
      const team = currentTournament.teams.find(t => t.id === match.refereeTeamId)
        || parentTournament?.teams.find(t => t.id === match.refereeTeamId);
      return team?.name || null;
    }
    return match.refereePlaceholder || null;
  };

  const getPreviousPhases = (): Tournament[] => {
    if (!currentTournament.phaseOrder || currentTournament.phaseOrder <= 1) return [];
    return containerPhases
      .filter(phase => (phase.phaseOrder ?? 0) < (currentTournament.phaseOrder ?? 0))
      .sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
  };

  const getScheduledTime = (match: Match): string | null => {
    return calculateMatchStartTimeForPhase(
      match, currentTournament.matches, currentTournament, getPreviousPhases()
    );
  };

  const matchListProps = {
    matches: filteredMatches,
    getTeamName,
    onMatchClick: setSelectedMatch,
    getScheduledTime,
    showDelayWarning: showDelayWarnings,
    currentTimeMinutes,
  };

  return (
    <div className="space-y-6 pb-20">
      <MatchesHeader
        isSwissSystem={isSwissSystem}
        currentRound={currentRound}
        maxRounds={maxRounds}
        completedCount={completedCount}
        totalCount={totalCount}
      />

      {canGenerateNextRound && (
        <NextRoundPrompt
          currentRound={currentRound}
          onGenerateNextRound={() => dispatch({ type: 'GENERATE_NEXT_SWISS_ROUND', payload: currentTournament.id })}
        />
      )}

      {isSwissSystem && currentRound >= maxRounds && currentRoundComplete && !hasFinalsAlready && (
        <SwissCompleteBanner />
      )}

      {canGeneratePlayoff && <PlayoffPrompt onOpenModal={() => setShowPlayoffModal(true)} />}

      {isAnyKnockout && <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />}

      <MatchFilters
        filter={filter}
        onFilterChange={setFilter}
        teams={currentTournament.teams}
        selectedTeamId={selectedTeamId}
        onTeamChange={setSelectedTeamId}
      />

      {currentTournament.scheduling && (
        <DelayWarningToggle
          showDelayWarnings={showDelayWarnings}
          onToggle={() => setShowDelayWarnings(!showDelayWarnings)}
        />
      )}

      {isAnyKnockout && viewMode === 'bracket' && (
        <BracketView
          matches={playableMatches}
          teams={currentTournament.teams}
          onMatchClick={setSelectedMatch}
        />
      )}

      {(!isAnyKnockout || viewMode === 'list') && (
        <>
          {isGroupPhase && currentTournament.groupPhaseConfig && (
            <GroupMatchList
              groups={currentTournament.groupPhaseConfig.groups}
              {...matchListProps}
            />
          )}
          {isKnockout && <KnockoutRoundMatchList {...matchListProps} getRefereeTeam={getRefereeTeamName} />}
          {isShortMainKnockout && <ShortMainRoundMatchList {...matchListProps} />}
          {isPlacementTree && <PlacementTreeRoundMatchList {...matchListProps} />}
          {!isGroupPhase && !isAnyKnockout && <RoundMatchList {...matchListProps} />}
        </>
      )}

      {selectedMatch && (
        <ScoreEntryModal
          match={selectedMatch}
          setsPerMatch={currentTournament.setsPerMatch}
          pointsPerSet={currentTournament.pointsPerSet}
          pointsPerThirdSet={currentTournament.pointsPerThirdSet}
          getTeamName={getTeamName}
          onClose={() => setSelectedMatch(null)}
          onSubmit={handleSubmitScore}
        />
      )}

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
