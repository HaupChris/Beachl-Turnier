import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem, TiebreakerOrder, SchedulingSettings, Group } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';
import { BasicSettingsForm } from '../components/BasicSettingsForm';
import { TeamsList } from '../components/TeamsList';
import { GroupEditor } from '../components/GroupEditor';
import { DEFAULT_SCHEDULING } from '../utils/scheduling';
import { generateGroups } from '../utils/groupPhase';

export function Configure() {
  const navigate = useNavigate();
  const { dispatch, currentTournament } = useTournament();

  const [name, setName] = useState('');
  const [system, setSystem] = useState<TournamentSystem>('round-robin');
  const [numberOfCourtsInput, setNumberOfCourtsInput] = useState('2');
  const [numberOfRoundsInput, setNumberOfRoundsInput] = useState('4');
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [pointsPerThirdSet, setPointsPerThirdSet] = useState(15);
  const [tiebreakerOrder, setTiebreakerOrder] = useState<TiebreakerOrder>('head-to-head-first');
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');

  // Scheduling settings
  const [scheduling, setScheduling] = useState<SchedulingSettings>(DEFAULT_SCHEDULING);

  // Group phase settings
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSeeding, setGroupSeeding] = useState<'snake' | 'random' | 'manual'>('snake');

  const numberOfCourts = parseInt(numberOfCourtsInput) || 1;
  const numberOfRounds = parseInt(numberOfRoundsInput) || 4;
  const isEditing = !!(currentTournament && currentTournament.status === 'configuration');

  // Calculate number of groups for group-phase (4 teams per group)
  const numberOfGroups = Math.floor(teams.length / 4);

  // Generate preview groups when teams change (for group-phase system)
  const previewGroups = useMemo(() => {
    if (system !== 'group-phase' || teams.length < 8) return [];
    return generateGroups(teams, numberOfGroups, groupSeeding);
  }, [teams, system, numberOfGroups, groupSeeding]);

  // Update groups when preview changes (only if not manually edited)
  useEffect(() => {
    if (system === 'group-phase' && previewGroups.length > 0 && groupSeeding !== 'manual') {
      /* eslint-disable react-hooks/set-state-in-effect */
      setGroups(previewGroups);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [previewGroups, system, groupSeeding]);

  useEffect(() => {
    if (isEditing && currentTournament) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(currentTournament.name);
      setSystem(currentTournament.system);
      setNumberOfCourtsInput(String(currentTournament.numberOfCourts));
      setNumberOfRoundsInput(String(currentTournament.numberOfRounds || 4));
      setSetsPerMatch(currentTournament.setsPerMatch);
      setPointsPerSet(currentTournament.pointsPerSet);
      setPointsPerThirdSet(currentTournament.pointsPerThirdSet || 15);
      setTiebreakerOrder(currentTournament.tiebreakerOrder || 'head-to-head-first');
      setScheduling(currentTournament.scheduling || DEFAULT_SCHEDULING);
      setTeams(currentTournament.teams);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [currentTournament, isEditing]);

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: uuidv4(),
        name: newTeamName.trim(),
        seedPosition: teams.length + 1,
        isPresent: false,
      };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
    }
  };

  const handleTogglePresent = (id: string) => {
    setTeams(teams.map(t => (t.id === id ? { ...t, isPresent: !t.isPresent } : t)));
  };

  const handleRemoveTeam = (id: string) => {
    const updatedTeams = teams
      .filter(t => t.id !== id)
      .map((t, index) => ({ ...t, seedPosition: index + 1 }));
    setTeams(updatedTeams);
  };

  const handleMoveTeam = (index: number, direction: 'up' | 'down') => {
    const newTeams = [...teams];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= teams.length) return;

    [newTeams[index], newTeams[targetIndex]] = [newTeams[targetIndex], newTeams[index]];
    setTeams(newTeams.map((t, i) => ({ ...t, seedPosition: i + 1 })));
  };

  const handleUpdateTeamName = (id: string, newName: string) => {
    setTeams(teams.map(t => (t.id === id ? { ...t, name: newName } : t)));
  };

  const handleCreateTournament = () => {
    if (!name.trim() || teams.length < 2) {
      return;
    }

    dispatch({
      type: 'CREATE_TOURNAMENT',
      payload: {
        name: name.trim(),
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        tiebreakerOrder,
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
        scheduling,
        teams: teams.map(t => ({ name: t.name, seedPosition: t.seedPosition })),
        // Group phase specific config
        groupPhaseConfig: system === 'group-phase' ? {
          numberOfGroups,
          teamsPerGroup: 4,
          seeding: groupSeeding,
        } : undefined,
      },
    });

    navigate('/');
  };

  const handleUpdateTournament = () => {
    if (!currentTournament || teams.length < 2) return;

    // Update settings
    dispatch({
      type: 'UPDATE_TOURNAMENT_SETTINGS',
      payload: {
        tournamentId: currentTournament.id,
        name: name.trim(),
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        tiebreakerOrder,
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
        scheduling,
      },
    });

    // Update teams
    dispatch({
      type: 'UPDATE_TEAMS',
      payload: { tournamentId: currentTournament.id, teams },
    });

    alert('Turnier aktualisiert!');
  };

  // Validation messages
  const getValidationMessages = (): string[] => {
    const messages: string[] = [];
    if (!name.trim()) {
      messages.push('Turniername fehlt');
    }
    if (teams.length < 2) {
      messages.push(`Mindestens 2 Teams erforderlich (aktuell: ${teams.length})`);
    }
    // Group phase specific validation
    if (system === 'group-phase') {
      if (teams.length < 8) {
        messages.push(`Gruppenphase benötigt mindestens 8 Teams (aktuell: ${teams.length})`);
      } else if (teams.length % 4 !== 0) {
        messages.push(`Teamanzahl muss durch 4 teilbar sein für 4er-Gruppen (aktuell: ${teams.length})`);
      } else if (teams.length > 16) {
        messages.push(`Maximal 16 Teams (4 Gruppen) unterstützt (aktuell: ${teams.length})`);
      }
    }
    return messages;
  };

  const validationMessages = getValidationMessages();
  const canCreate = validationMessages.length === 0;

  const handleStartTournament = () => {
    if (!currentTournament) return;

    const presentTeams = teams.filter(t => t.isPresent);
    const absentTeams = teams.filter(t => !t.isPresent);

    if (presentTeams.length < 2) {
      alert('Mindestens 2 anwesende Teams benötigt!');
      return;
    }

    // Warn if not all teams are present
    if (absentTeams.length > 0) {
      const absentNames = absentTeams.map(t => t.name).join(', ');
      const confirmed = confirm(
        `${absentTeams.length} Team(s) sind nicht anwesend:\n${absentNames}\n\n` +
        `Das Turnier wird nur mit den ${presentTeams.length} anwesenden Teams gestartet.\n\n` +
        `Fortfahren?`
      );
      if (!confirmed) return;
    }

    // Recalculate seed positions for present teams only
    const teamsToUse = presentTeams.map((t, index) => ({
      ...t,
      seedPosition: index + 1,
    }));

    // Save changes before starting
    dispatch({
      type: 'UPDATE_TOURNAMENT_SETTINGS',
      payload: {
        tournamentId: currentTournament.id,
        name: name.trim(),
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        tiebreakerOrder,
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
        scheduling,
      },
    });

    dispatch({
      type: 'UPDATE_TEAMS',
      payload: { tournamentId: currentTournament.id, teams: teamsToUse },
    });

    dispatch({ type: 'START_TOURNAMENT', payload: currentTournament.id });
    navigate('/matches');
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold text-gray-800">
        {isEditing ? 'Turnier bearbeiten' : 'Neues Turnier erstellen'}
      </h2>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
        <BasicSettingsForm
          name={name}
          onNameChange={setName}
          system={system}
          onSystemChange={setSystem}
          numberOfCourtsInput={numberOfCourtsInput}
          onNumberOfCourtsInputChange={setNumberOfCourtsInput}
          onNumberOfCourtsBlur={() =>
            setNumberOfCourtsInput(String(Math.max(1, Math.min(10, numberOfCourts))))
          }
          numberOfRoundsInput={numberOfRoundsInput}
          onNumberOfRoundsInputChange={setNumberOfRoundsInput}
          onNumberOfRoundsBlur={() =>
            setNumberOfRoundsInput(String(Math.max(1, Math.min(20, numberOfRounds))))
          }
          setsPerMatch={setsPerMatch}
          onSetsPerMatchChange={setSetsPerMatch}
          pointsPerSet={pointsPerSet}
          onPointsPerSetChange={setPointsPerSet}
          pointsPerThirdSet={pointsPerThirdSet}
          onPointsPerThirdSetChange={setPointsPerThirdSet}
          tiebreakerOrder={tiebreakerOrder}
          onTiebreakerOrderChange={setTiebreakerOrder}
          scheduling={scheduling}
          onSchedulingChange={setScheduling}
          teamCount={teams.length}
          numberOfCourts={numberOfCourts}
          numberOfRounds={numberOfRounds}
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

      {/* Group Phase Configuration */}
      {system === 'group-phase' && teams.length >= 8 && teams.length % 4 === 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Gruppeneinteilung</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Seeding:</label>
              <select
                value={groupSeeding}
                onChange={e => setGroupSeeding(e.target.value as 'snake' | 'random' | 'manual')}
                className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="snake">Snake-Draft</option>
                <option value="random">Zufällig</option>
                <option value="manual">Manuell</option>
              </select>
            </div>
          </div>

          <GroupEditor
            groups={groups}
            teams={teams}
            onGroupsChange={(newGroups) => {
              setGroups(newGroups);
              setGroupSeeding('manual');
            }}
            disabled={false}
          />

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
            <p className="text-sm text-sky-800">
              <strong>SSVB-Format:</strong> Nach der Gruppenphase folgt die K.O.-Phase.
              Gruppensieger sind direkt im Viertelfinale, 2. und 3. spielen in der
              Zwischenrunde, Gruppenletzte scheiden aus.
            </p>
          </div>
        </div>
      )}

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
