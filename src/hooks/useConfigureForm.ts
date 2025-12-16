import { useState, useEffect, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem, TiebreakerOrder, SchedulingSettings, Group, KnockoutSettings } from '../types/tournament';
import { DEFAULT_SCHEDULING } from '../utils/scheduling';
import { generateGroups } from '../utils/groupPhase';
import { calculateTimeEstimation, calculateEndTime, formatDuration } from '../utils/timeEstimation';
import { useConfigureFormHandlers } from './useConfigureFormHandlers';

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

  // Calculate number of groups for group-phase (dynamic teams per group)
  const numberOfGroups = Math.floor(teams.length / teamsPerGroup);

  // Check if system uses group phase
  const isGroupBasedSystem = system === 'group-phase' || system === 'beachl-all-placements' || system === 'beachl-short-main';

  // Generate preview groups when teams change (for group-based systems)
  const previewGroups = useMemo(() => {
    const minTeams = teamsPerGroup * 2;
    if (!isGroupBasedSystem || teams.length < minTeams || teams.length % teamsPerGroup !== 0) return [];
    return generateGroups(teams, numberOfGroups, groupSeeding);
  }, [teams, isGroupBasedSystem, numberOfGroups, groupSeeding, teamsPerGroup]);

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
    // Validation for group-based systems
    if (isGroupBasedSystem) {
      const minTeams = teamsPerGroup * 2; // Minimum 2 groups
      const maxTeams = teamsPerGroup * 8; // Maximum 8 groups
      if (teams.length < minTeams) {
        messages.push(`Gruppenphase benötigt mindestens ${minTeams} Teams für ${teamsPerGroup}er-Gruppen (aktuell: ${teams.length})`);
      } else if (teams.length % teamsPerGroup !== 0) {
        messages.push(`Teamanzahl muss durch ${teamsPerGroup} teilbar sein für ${teamsPerGroup}er-Gruppen (aktuell: ${teams.length})`);
      } else if (teams.length > maxTeams) {
        messages.push(`Maximal ${maxTeams} Teams (8 Gruppen à ${teamsPerGroup}) unterstützt (aktuell: ${teams.length})`);
      }
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
