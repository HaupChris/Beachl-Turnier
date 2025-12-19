import { useState, useEffect, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem, TiebreakerOrder, SchedulingSettings, Group, KnockoutSettings } from '../types/tournament';
import { DEFAULT_SCHEDULING } from '../utils/scheduling';
import { generateGroups } from '../utils/groupPhase';
import { calculateTimeEstimation, calculateEndTime, formatDuration } from '../utils/timeEstimation';
import { useConfigureFormHandlers } from './useConfigureFormHandlers';
import { calculateGroupConfiguration } from '../utils/groupConfiguration';

export function useConfigureForm() {
  const { currentTournament } = useTournament();

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
  const [teamsPerGroup, setTeamsPerGroup] = useState<3 | 4 | 5>(4);

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

  // Check if system uses group phase
  const isGroupBasedSystem = system === 'group-phase' || system === 'beachl-all-placements' || system === 'beachl-short-main';

  // Calculate group configuration with bye support
  const groupConfig = useMemo(() => {
    if (!isGroupBasedSystem) return null;
    return calculateGroupConfiguration(teams.length, teamsPerGroup);
  }, [isGroupBasedSystem, teams.length, teamsPerGroup]);

  // Calculate number of groups for group-phase (using the new configuration)
  const numberOfGroups = groupConfig?.numberOfGroups ?? Math.floor(teams.length / teamsPerGroup);
  const byesNeeded = groupConfig?.byesNeeded ?? 0;
  const groupConfigError = groupConfig?.isValid === false ? groupConfig.errorMessage : undefined;

  // Generate preview groups when teams change (for group-based systems)
  const previewGroups = useMemo(() => {
    if (!isGroupBasedSystem || !groupConfig?.isValid || numberOfGroups < 2) return [];
    return generateGroups(teams, numberOfGroups, groupSeeding, byesNeeded);
  }, [teams, isGroupBasedSystem, numberOfGroups, groupSeeding, groupConfig?.isValid, byesNeeded]);

  // Update groups when preview changes (only if not manually edited)
  useEffect(() => {
    if (isGroupBasedSystem && previewGroups.length > 0 && groupSeeding !== 'manual') {
      setGroups(previewGroups);
    }
  }, [previewGroups, isGroupBasedSystem, groupSeeding]);

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
    return calculateTimeEstimation({
      teamsCount: teams.length,
      system,
      isGroupBasedSystem,
      teamsPerGroup,
      numberOfCourts,
      numberOfRounds,
      setsPerMatch,
      pointsPerSet,
      pointsPerThirdSet,
      knockoutSettings,
      enablePlayoff,
      scheduling,
    });
  }, [teams.length, system, isGroupBasedSystem, numberOfCourts, numberOfRounds, setsPerMatch, pointsPerSet, pointsPerThirdSet, knockoutSettings, enablePlayoff, scheduling, teamsPerGroup]);

  // Calculate end time
  const getEndTime = () => {
    return calculateEndTime(timeEstimation, scheduling.startTime);
  };

  // Use handlers hook
  const {
    handleAddTeam,
    handleTogglePresent,
    handleRemoveTeam,
    handleMoveTeam,
    handleUpdateTeamName,
    handleCreateTournament,
    handleUpdateTournament,
    handleStartTournament,
  } = useConfigureFormHandlers({
    teams,
    setTeams,
    newTeamName,
    setNewTeamName,
    name,
    system,
    numberOfCourts,
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    tiebreakerOrder,
    numberOfRounds,
    scheduling,
    isGroupBasedSystem,
    numberOfGroups,
    teamsPerGroup,
    groupSeeding,
    enablePlayoff,
    knockoutSettings,
  });

  // Validation messages
  const getValidationMessages = (): string[] => {
    const messages: string[] = [];
    if (!name.trim()) {
      messages.push('Turniername fehlt');
    }
    if (teams.length < 2) {
      messages.push(`Mindestens 2 Teams erforderlich (aktuell: ${teams.length})`);
    }
    // Validation for group-based systems - error is shown inline at group config section
    if (isGroupBasedSystem && groupConfigError) {
      messages.push(groupConfigError);
    }
    return messages;
  };

  const validationMessages = getValidationMessages();
  const canCreate = validationMessages.length === 0;

  return {
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
    setTeams,
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
  };
}
