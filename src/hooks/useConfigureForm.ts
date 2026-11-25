/**
 * Configure Form Hook
 *
 * Orchestrates the tournament configuration form state and handlers.
 * Uses smaller specialized hooks for each concern:
 * - useTeamHandlers: Team CRUD operations
 * - useGroupPhaseConfig: Group phase settings
 * - useTimeEstimation: Duration calculations
 * - useTournamentLifecycle: Create/update/start operations
 */

import { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import type {
  Team,
  TournamentSystem,
  TiebreakerOrder,
  SchedulingSettings,
  KnockoutSettings,
} from '../types/tournament';
import {
  DEFAULT_SCHEDULING,
  formatDuration,
  isGroupBasedSystem as checkIsGroupBasedSystem,
} from '../domain';
import { useTeamHandlers } from './useTeamHandlers';
import { useGroupPhaseConfig } from './useGroupPhaseConfig';
import { useTimeEstimation } from './useTimeEstimation';
import { useTournamentLifecycle } from './useTournamentLifecycle';

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

  // Phase 2 settings (Finale / K.O.-Phase)
  const [enablePlayoff, setEnablePlayoff] = useState(false);
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

  // Computed values
  const numberOfCourts = parseInt(numberOfCourtsInput) || 1;
  const numberOfRounds = parseInt(numberOfRoundsInput) || 4;
  const isEditing = !!(currentTournament && currentTournament.status === 'configuration');
  const isGroupBasedSystem = checkIsGroupBasedSystem(system);

  // Group phase configuration
  const {
    groups,
    setGroups,
    groupSeeding,
    setGroupSeeding,
    teamsPerGroup,
    setTeamsPerGroup,
    numberOfGroups,
    byesNeeded,
    groupConfigError,
  } = useGroupPhaseConfig({ teams, isGroupBasedSystem });

  // Team handlers
  const {
    handleAddTeam,
    handleTogglePresent,
    handleRemoveTeam,
    handleMoveTeam,
    handleUpdateTeamName,
    handleAddMultipleTeams,
  } = useTeamHandlers({
    teams,
    setTeams,
    newTeamName,
    setNewTeamName,
  });

  // Time estimation
  const { timeEstimation, getEndTime } = useTimeEstimation({
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

  // Tournament lifecycle handlers
  const { handleCreateTournament, handleUpdateTournament, handleStartTournament } =
    useTournamentLifecycle({
      teams,
      tournamentConfig: {
        name,
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet,
        tiebreakerOrder,
        numberOfRounds,
        scheduling,
      },
      groupConfig: {
        isGroupBasedSystem,
        numberOfGroups,
        teamsPerGroup,
        groupSeeding,
      },
      playoffConfig: {
        enablePlayoff,
        knockoutSettings,
      },
    });

  // Initialize form from existing tournament
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

  // Validation
  const getValidationMessages = (): string[] => {
    const messages: string[] = [];
    if (!name.trim()) {
      messages.push('Turniername fehlt');
    }
    if (teams.length < 2) {
      messages.push(`Mindestens 2 Teams erforderlich (aktuell: ${teams.length})`);
    }
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
    handleAddMultipleTeams,
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
