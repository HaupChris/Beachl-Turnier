import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TeamsList } from '../components/TeamsList';
import { ConfigureBasicSettings } from '../components/ConfigureBasicSettings';
import { ConfigurePhase1Settings } from '../components/ConfigurePhase1Settings';
import { ConfigurePhase2Settings } from '../components/ConfigurePhase2Settings';
import { ConfigureTimeEstimation } from '../components/ConfigureTimeEstimation';
import { useConfigureForm } from '../hooks/useConfigureForm';
import { useTournament } from '../context/TournamentContext';

export function Configure() {
  const { state, dispatch, currentTournament } = useTournament();
  const { containerId } = useParams<{ containerId?: string }>();

  // Sync URL container ID with tournament context
  useEffect(() => {
    if (containerId) {
      const container = state.containers.find(c => c.id === containerId);
      if (container) {
        const currentPhase = container.phases[container.currentPhaseIndex] || container.phases[0];
        if (currentPhase && currentTournament?.id !== currentPhase.tournamentId) {
          dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: currentPhase.tournamentId });
        }
      }
    }
  }, [containerId, state.containers, currentTournament?.id, dispatch]);
  const {
    // State
    name,
    setName,
    system,
    setSystem,
    numberOfCourtsInput,
    setNumberOfCourtsInput,
    setsPerMatch,
    setSetsPerMatch,
    pointsPerSet,
    setPointsPerSet,
    pointsPerThirdSet,
    setPointsPerThirdSet,
    tiebreakerOrder,
    setTiebreakerOrder,
    numberOfRoundsInput,
    setNumberOfRoundsInput,
    groups,
    setGroups,
    groupSeeding,
    setGroupSeeding,
    teamsPerGroup,
    setTeamsPerGroup,
    enablePlayoff,
    setEnablePlayoff,
    knockoutSettings,
    setKnockoutSettings,
    scheduling,
    setScheduling,
    teams,
    newTeamName,
    setNewTeamName,

    // Computed values
    numberOfCourts,
    numberOfRounds,
    isEditing,
    numberOfGroups,
    isGroupBasedSystem,
    byesNeeded,
    groupConfigError,
    timeEstimation,
    validationMessages,
    canCreate,

    // Handlers
    handleAddTeam,
    handleTogglePresent,
    handleRemoveTeam,
    handleMoveTeam,
    handleUpdateTeamName,
    handleCreateTournament,
    handleUpdateTournament,
    handleStartTournament,

    // Helpers
    getEndTime,
    formatDuration,
  } = useConfigureForm();

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold text-gray-800">
        {isEditing ? 'Turnier bearbeiten' : 'Neues Turnier erstellen'}
      </h2>

      {/* Section 1: Basic Settings + Teams */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
        <ConfigureBasicSettings
          name={name}
          onNameChange={setName}
          system={system}
          onSystemChange={setSystem}
          numberOfCourtsInput={numberOfCourtsInput}
          onNumberOfCourtsInputChange={setNumberOfCourtsInput}
          numberOfCourts={numberOfCourts}
        />

        <TeamsList
          teams={teams}
          newTeamName={newTeamName}
          onNewTeamNameChange={setNewTeamName}
          onAddTeam={handleAddTeam}
          onRemoveTeam={handleRemoveTeam}
          onMoveTeam={handleMoveTeam}
          onUpdateTeamName={handleUpdateTeamName}
          onTogglePresent={handleTogglePresent}
          system={system}
          numberOfRounds={numberOfRounds}
        />
      </div>

      {/* Section 2: Phase 1 Configuration */}
      <ConfigurePhase1Settings
        system={system}
        isGroupBasedSystem={isGroupBasedSystem}
        numberOfRoundsInput={numberOfRoundsInput}
        onNumberOfRoundsInputChange={setNumberOfRoundsInput}
        numberOfRounds={numberOfRounds}
        setsPerMatch={setsPerMatch}
        onSetsPerMatchChange={setSetsPerMatch}
        pointsPerSet={pointsPerSet}
        onPointsPerSetChange={setPointsPerSet}
        pointsPerThirdSet={pointsPerThirdSet}
        onPointsPerThirdSetChange={setPointsPerThirdSet}
        tiebreakerOrder={tiebreakerOrder}
        onTiebreakerOrderChange={setTiebreakerOrder}
        teamsPerGroup={teamsPerGroup}
        onTeamsPerGroupChange={setTeamsPerGroup}
        groupSeeding={groupSeeding}
        onGroupSeedingChange={setGroupSeeding}
        numberOfGroups={numberOfGroups}
        groups={groups}
        onGroupsChange={setGroups}
        teams={teams}
        byesNeeded={byesNeeded}
        groupConfigError={groupConfigError}
      />

      {/* Section 3: Phase 2 Configuration */}
      <ConfigurePhase2Settings
        system={system}
        isGroupBasedSystem={isGroupBasedSystem}
        enablePlayoff={enablePlayoff}
        onEnablePlayoffChange={setEnablePlayoff}
        knockoutSettings={knockoutSettings}
        onKnockoutSettingsChange={setKnockoutSettings}
        teamsPerGroup={teamsPerGroup}
      />

      {/* Section 4: Time Planning */}
      <ConfigureTimeEstimation
        scheduling={scheduling}
        onSchedulingChange={setScheduling}
        timeEstimation={timeEstimation}
        getEndTime={getEndTime}
        formatDuration={formatDuration}
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-center space-y-3 sm:space-y-0 sm:space-x-4 lg:max-w-xl lg:mx-auto">
        {isEditing ? (
          <>
            <button
              onClick={handleUpdateTournament}
              disabled={!canCreate}
              className="w-full sm:w-auto sm:px-8 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Änderungen speichern
            </button>
            <button
              onClick={handleStartTournament}
              disabled={!canCreate}
              className="w-full sm:w-auto sm:px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Turnier starten
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleCreateTournament}
              disabled={!canCreate}
              className="w-full sm:w-auto sm:px-12 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Turnier erstellen
            </button>
            {!canCreate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:max-w-md">
                <p className="text-sm font-medium text-amber-800 mb-1">Bitte ergänzen:</p>
                <ul className="text-sm text-amber-700 list-disc list-inside">
                  {validationMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
