/**
 * Tournament Lifecycle Hook
 *
 * Handles tournament creation, update, and start operations.
 * Extracted from useConfigureFormHandlers to reduce complexity.
 */

import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import type {
  Team,
  TournamentSystem,
  TiebreakerOrder,
  SchedulingSettings,
  KnockoutSettings,
} from '../types/tournament';

/**
 * Tournament configuration for create/update operations
 */
export interface TournamentConfig {
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet: number;
  tiebreakerOrder: TiebreakerOrder;
  numberOfRounds: number;
  scheduling: SchedulingSettings;
}

/**
 * Group phase configuration
 */
export interface GroupConfig {
  isGroupBasedSystem: boolean;
  numberOfGroups: number;
  teamsPerGroup: 3 | 4 | 5;
  groupSeeding: 'snake' | 'random' | 'manual';
}

/**
 * Playoff/knockout configuration
 */
export interface PlayoffConfig {
  enablePlayoff: boolean;
  knockoutSettings: KnockoutSettings;
}

interface UseTournamentLifecycleParams {
  teams: Team[];
  tournamentConfig: TournamentConfig;
  groupConfig: GroupConfig;
  playoffConfig: PlayoffConfig;
}

export function useTournamentLifecycle({
  teams,
  tournamentConfig,
  groupConfig,
  playoffConfig,
}: UseTournamentLifecycleParams) {
  const navigate = useNavigate();
  const { dispatch, currentTournament } = useTournament();

  const {
    name,
    system,
    numberOfCourts,
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    tiebreakerOrder,
    numberOfRounds,
    scheduling,
  } = tournamentConfig;

  const { isGroupBasedSystem, numberOfGroups, teamsPerGroup, groupSeeding } = groupConfig;
  const { enablePlayoff, knockoutSettings } = playoffConfig;

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
        groupPhaseConfig: isGroupBasedSystem
          ? {
              numberOfGroups,
              teamsPerGroup,
              seeding: groupSeeding,
            }
          : undefined,
        knockoutSettings: isGroupBasedSystem || enablePlayoff ? knockoutSettings : undefined,
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

  return {
    handleCreateTournament,
    handleUpdateTournament,
    handleStartTournament,
  };
}
