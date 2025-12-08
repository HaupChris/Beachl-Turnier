import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem, TiebreakerOrder, SchedulingSettings, Group, KnockoutSettings } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';
import { TeamsList } from '../components/TeamsList';
import { GroupEditor } from '../components/GroupEditor';
import { SchedulingSection } from '../components/SchedulingSection';
import { DEFAULT_SCHEDULING, estimateTournamentDuration, estimateSSVBTournamentDuration } from '../utils/scheduling';
import { generateGroups } from '../utils/groupPhase';

export function Configure() {
  const navigate = useNavigate();
  const { dispatch, currentTournament } = useTournament();

  // Basic settings
  const [name, setName] = useState('');
  const [system, setSystem] = useState<TournamentSystem>('round-robin');
  const [numberOfCourtsInput, setNumberOfCourtsInput] = useState('2');

  // Phase 1 settings (Vorrunde / Gruppenphase)
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [pointsPerThirdSet, setPointsPerThirdSet] = useState(15);
  const [tiebreakerOrder, setTiebreakerOrder] = useState<TiebreakerOrder>('head-to-head-first');
  const [numberOfRoundsInput, setNumberOfRoundsInput] = useState('4');

  // Group phase settings
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSeeding, setGroupSeeding] = useState<'snake' | 'random' | 'manual'>('snake');

  // Phase 2 settings (Finale / K.O.-Phase)
  const [enablePlayoff, setEnablePlayoff] = useState(false); // For RR/Swiss
  const [knockoutSettings, setKnockoutSettings] = useState<KnockoutSettings>({
    setsPerMatch: 1,
    pointsPerSet: 21,
    pointsPerThirdSet: 15,
    playThirdPlaceMatch: true,
    useReferees: true,
  });

  // Scheduling settings
  const [scheduling, setScheduling] = useState<SchedulingSettings>(DEFAULT_SCHEDULING);

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');

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
      setGroups(previewGroups);
    }
  }, [previewGroups, system, groupSeeding]);

  useEffect(() => {
    if (isEditing && currentTournament) {
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
      if (currentTournament.knockoutSettings) {
        setKnockoutSettings(currentTournament.knockoutSettings);
        setEnablePlayoff(true);
      }
    }
  }, [currentTournament, isEditing]);

  // Time estimation calculation
  const timeEstimation = useMemo(() => {
    if (teams.length < 2) return null;

    if (system === 'group-phase' && teams.length >= 8 && teams.length % 4 === 0) {
      const result = estimateSSVBTournamentDuration(
        teams.length,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        knockoutSettings.setsPerMatch,
        knockoutSettings.pointsPerSet,
        knockoutSettings.setsPerMatch === 2 ? knockoutSettings.pointsPerThirdSet : undefined,
        knockoutSettings.playThirdPlaceMatch,
        scheduling
      );
      return {
        phase1Name: 'Gruppenphase',
        phase1Matches: result.groupPhaseMatchCount,
        phase1Minutes: result.groupPhaseMinutes,
        phase2Name: 'K.O.-Phase',
        phase2Matches: result.knockoutMatchCount,
        phase2Minutes: result.knockoutMinutes,
        totalMinutes: result.totalMinutes,
        hasPhase2: true,
      };
    }

    // For round-robin and swiss
    const phase1Result = estimateTournamentDuration(
      teams.length,
      system,
      numberOfCourts,
      numberOfRounds,
      setsPerMatch,
      pointsPerSet,
      pointsPerThirdSet,
      scheduling
    );

    if (!enablePlayoff) {
      return {
        phase1Name: system === 'swiss' ? 'Swiss Runden' : 'Vorrunde',
        phase1Matches: phase1Result.matchCount,
        phase1Minutes: phase1Result.totalMinutes,
        phase2Name: null,
        phase2Matches: 0,
        phase2Minutes: 0,
        totalMinutes: phase1Result.totalMinutes,
        hasPhase2: false,
      };
    }

    // Calculate playoff matches (simplified: teams/2 matches for bracket)
    const playoffMatches = Math.ceil(teams.length / 2);
    const playoffMinutesPerMatch = knockoutSettings.pointsPerSet === 21
      ? scheduling.minutesPer21PointSet
      : scheduling.minutesPer15PointSet;
    const playoffMinutes = Math.ceil(playoffMatches / numberOfCourts) *
      (playoffMinutesPerMatch * (knockoutSettings.setsPerMatch === 2 ? 2 : 1) + scheduling.minutesBetweenMatches);

    return {
      phase1Name: system === 'swiss' ? 'Swiss Runden' : 'Vorrunde',
      phase1Matches: phase1Result.matchCount,
      phase1Minutes: phase1Result.totalMinutes,
      phase2Name: 'Finale',
      phase2Matches: playoffMatches,
      phase2Minutes: playoffMinutes,
      totalMinutes: phase1Result.totalMinutes + scheduling.minutesBetweenPhases + playoffMinutes,
      hasPhase2: true,
    };
  }, [teams.length, system, numberOfCourts, numberOfRounds, setsPerMatch, pointsPerSet, pointsPerThirdSet, knockoutSettings, enablePlayoff, scheduling]);

  // Calculate end time
  const getEndTime = () => {
    if (!timeEstimation || !scheduling.startTime) return null;
    const [hours, minutes] = scheduling.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + timeEstimation.totalMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

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
        // Knockout settings for SSVB or optional playoff
        knockoutSettings: (system === 'group-phase' || enablePlayoff) ? knockoutSettings : undefined,
      },
    });

    navigate('/');
  };

  const handleUpdateTournament = () => {
    if (!currentTournament || teams.length < 2) return;

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

    if (absentTeams.length > 0) {
      const absentNames = absentTeams.map(t => t.name).join(', ');
      const confirmed = confirm(
        `${absentTeams.length} Team(s) sind nicht anwesend:\n${absentNames}\n\n` +
        `Das Turnier wird nur mit den ${presentTeams.length} anwesenden Teams gestartet.\n\n` +
        `Fortfahren?`
      );
      if (!confirmed) return;
    }

    const teamsToUse = presentTeams.map((t, index) => ({
      ...t,
      seedPosition: index + 1,
    }));

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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} Std. ${mins} Min.` : `${mins} Min.`;
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold text-gray-800">
        {isEditing ? 'Turnier bearbeiten' : 'Neues Turnier erstellen'}
      </h2>

      {/* Section 1: Basic Settings + Teams */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
        {/* Basic Settings */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-700">Grundeinstellungen</h3>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Turniername
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="z.B. Sommerturnier 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Turniersystem
            </label>
            <select
              value={system}
              onChange={e => setSystem(e.target.value as TournamentSystem)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="round-robin">Jeder gegen Jeden</option>
              <option value="swiss">Swiss System</option>
              <option value="group-phase">Gruppenphase + K.O. (SSVB)</option>
            </select>
            {system === 'swiss' && (
              <p className="text-xs text-gray-500 mt-1">
                Teams mit ähnlicher Punktzahl spielen gegeneinander.
              </p>
            )}
            {system === 'group-phase' && (
              <p className="text-xs text-gray-500 mt-1">
                4er-Gruppen, dann K.O.-Phase mit Zwischenrunde.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Anzahl Felder
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={numberOfCourtsInput}
              onChange={e => setNumberOfCourtsInput(e.target.value)}
              onBlur={() => setNumberOfCourtsInput(String(Math.max(1, Math.min(10, numberOfCourts))))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Teams List */}
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
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-700">
          {system === 'group-phase' ? 'Phase 1: Gruppenphase' : system === 'swiss' ? 'Phase 1: Swiss Runden' : 'Phase 1: Vorrunde'}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {system === 'swiss' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Anzahl Runden
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={numberOfRoundsInput}
                onChange={e => setNumberOfRoundsInput(e.target.value)}
                onBlur={() => setNumberOfRoundsInput(String(Math.max(1, Math.min(20, numberOfRounds))))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Sätze pro Spiel
            </label>
            <select
              value={setsPerMatch}
              onChange={e => setSetsPerMatch(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value={1}>1 Satz</option>
              <option value={2}>2 Sätze</option>
              <option value={3}>Best of 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Punkte pro Satz
            </label>
            <select
              value={pointsPerSet}
              onChange={e => setPointsPerSet(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value={15}>15 Punkte</option>
              <option value={21}>21 Punkte</option>
            </select>
          </div>

          {setsPerMatch === 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Punkte 3. Satz
              </label>
              <select
                value={pointsPerThirdSet}
                onChange={e => setPointsPerThirdSet(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value={15}>15 Punkte</option>
                <option value={21}>21 Punkte</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Tiebreaker
            </label>
            <select
              value={tiebreakerOrder}
              onChange={e => setTiebreakerOrder(e.target.value as TiebreakerOrder)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="head-to-head-first">Direkter Vergleich zuerst</option>
              <option value="point-diff-first">Punktedifferenz zuerst</option>
            </select>
          </div>
        </div>

        {setsPerMatch === 2 && (
          <p className="text-xs text-gray-500">
            Bei 2 Sätzen werden gewonnene Sätze statt Matches in der Tabelle gezählt.
          </p>
        )}

        {/* Group Editor (only for group-phase) */}
        {system === 'group-phase' && teams.length >= 8 && teams.length % 4 === 0 && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700">Gruppeneinteilung</h4>
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
          </div>
        )}
      </div>

      {/* Section 3: Phase 2 Configuration */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        {system === 'group-phase' ? (
          // SSVB: K.O.-Phase is mandatory
          <>
            <h3 className="font-semibold text-gray-700">Phase 2: K.O.-Phase</h3>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-sky-800">
                <strong>SSVB-Format:</strong> Gruppensieger ins Viertelfinale, 2. und 3. in die Zwischenrunde, Gruppenletzte scheiden aus.
              </p>
            </div>
          </>
        ) : (
          // RR/Swiss: Finale is optional
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Phase 2: Finale (optional)</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePlayoff}
                  onChange={e => setEnablePlayoff(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                />
                <span className="text-sm text-gray-700">Finale aktivieren</span>
              </label>
            </div>
            {!enablePlayoff && (
              <p className="text-sm text-gray-500">
                Aktiviere die Finale-Phase, um nach der Vorrunde Platzierungsspiele durchzuführen.
              </p>
            )}
          </>
        )}

        {/* K.O./Finale Settings (shown when enabled or for SSVB) */}
        {(system === 'group-phase' || enablePlayoff) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Sätze pro Spiel
                </label>
                <select
                  value={knockoutSettings.setsPerMatch}
                  onChange={e => setKnockoutSettings(prev => ({
                    ...prev,
                    setsPerMatch: parseInt(e.target.value),
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={1}>1 Satz</option>
                  <option value={2}>Best of 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Punkte pro Satz
                </label>
                <select
                  value={knockoutSettings.pointsPerSet}
                  onChange={e => setKnockoutSettings(prev => ({
                    ...prev,
                    pointsPerSet: parseInt(e.target.value),
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={15}>15 Punkte</option>
                  <option value={21}>21 Punkte</option>
                </select>
              </div>

              {knockoutSettings.setsPerMatch === 2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Punkte 3. Satz
                  </label>
                  <select
                    value={knockoutSettings.pointsPerThirdSet || 15}
                    onChange={e => setKnockoutSettings(prev => ({
                      ...prev,
                      pointsPerThirdSet: parseInt(e.target.value),
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value={15}>15 Punkte</option>
                    <option value={21}>21 Punkte</option>
                  </select>
                </div>
              )}
            </div>

            {system === 'group-phase' && (
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={knockoutSettings.playThirdPlaceMatch}
                    onChange={e => setKnockoutSettings(prev => ({
                      ...prev,
                      playThirdPlaceMatch: e.target.checked,
                    }))}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Spiel um Platz 3</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={knockoutSettings.useReferees}
                    onChange={e => setKnockoutSettings(prev => ({
                      ...prev,
                      useReferees: e.target.checked,
                    }))}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Schiedsrichter-Zuweisung</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Time Planning */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-700">Zeitplanung</h3>

        <SchedulingSection
          scheduling={scheduling}
          onSchedulingChange={setScheduling}
          estimation={null} // We'll show our own estimation below
        />

        {/* Combined Time Estimation */}
        {timeEstimation && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-amber-800">Geschätzte Turnierdauer (gesamt)</span>
              <span className="font-bold text-amber-900 text-lg">
                ca. {formatDuration(timeEstimation.totalMinutes)}
              </span>
            </div>

            <div className="border-t border-amber-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">
                  {timeEstimation.phase1Name} ({timeEstimation.phase1Matches} Spiele)
                </span>
                <span className="text-amber-800">{formatDuration(timeEstimation.phase1Minutes)}</span>
              </div>

              {timeEstimation.hasPhase2 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">
                    {timeEstimation.phase2Name} ({timeEstimation.phase2Matches} Spiele)
                  </span>
                  <span className="text-amber-800">{formatDuration(timeEstimation.phase2Minutes)}</span>
                </div>
              )}
            </div>

            {scheduling.startTime && (
              <div className="border-t border-amber-200 pt-3 flex justify-between">
                <span className="text-amber-700">
                  Start: {scheduling.startTime} Uhr
                </span>
                <span className="font-medium text-amber-800">
                  Ende: ca. {getEndTime()} Uhr
                </span>
              </div>
            )}
          </div>
        )}
      </div>

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
