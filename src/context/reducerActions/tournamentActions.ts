import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentContainer, TournamentConfig, Team, GroupPhaseConfig, Group } from '../../types/tournament';
import type { TournamentState } from '../tournamentActions';
import { generateGroups } from '../../utils/groupPhase';
import { isGroupBasedSystem } from './helpers';
export { handleStartTournament } from './startTournamentHelper';

export function handleCreateTournament(
  state: TournamentState,
  payload: TournamentConfig
): TournamentState {
  const config = payload;
  const teams = config.teams.map((t: Omit<Team, 'id'>, index: number) => ({
    ...t,
    id: uuidv4(),
    seedPosition: index + 1,
  }));
  const now = new Date().toISOString();
  const tournamentId = uuidv4();
  const containerId = uuidv4();
  // Determine phase name based on system
  const phaseName = config.system === 'swiss' ? 'Swiss Vorrunde'
    : config.system === 'round-robin' ? 'Vorrunde'
    : isGroupBasedSystem(config.system) ? 'Gruppenphase'
    : 'Hauptrunde';
  // Generate group phase config if applicable (for all group-based systems)
  let groupPhaseConfig: GroupPhaseConfig | undefined;
  if (isGroupBasedSystem(config.system) && config.groupPhaseConfig) {
    const groups = generateGroups(teams, config.groupPhaseConfig.numberOfGroups, config.groupPhaseConfig.seeding);
    groupPhaseConfig = { ...config.groupPhaseConfig, groups };
  }

  const newTournament: Tournament = {
    id: tournamentId,
    name: config.name,
    system: config.system,
    numberOfCourts: config.numberOfCourts,
    setsPerMatch: config.setsPerMatch,
    pointsPerSet: config.pointsPerSet,
    pointsPerThirdSet: config.pointsPerThirdSet,
    tiebreakerOrder: config.tiebreakerOrder,
    numberOfRounds: config.numberOfRounds,
    scheduling: config.scheduling,
    teams,
    matches: [],
    standings: teams.map((t: Team) => ({
      teamId: t.id, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0,
      pointsWon: 0, pointsLost: 0, points: 0,
    })),
    currentRound: config.system === 'swiss' ? 0 : undefined,
    status: 'configuration',
    createdAt: now,
    updatedAt: now,
    containerId,
    phaseOrder: 1,
    phaseName,
    groupPhaseConfig,
    knockoutConfig: config.knockoutConfig,
    knockoutSettings: config.knockoutSettings,
  };
  const newContainer: TournamentContainer = {
    id: containerId,
    name: config.name,
    phases: [{ tournamentId, order: 1, name: phaseName }],
    currentPhaseIndex: 0,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...state,
    tournaments: [...state.tournaments, newTournament],
    containers: [...(state.containers || []), newContainer],
    currentTournamentId: newTournament.id,
  };
}

export function handleDeleteTournament(
  state: TournamentState,
  tournamentId: string
): TournamentState {
  const tournamentToDelete = state.tournaments.find(t => t.id === tournamentId);
  if (!tournamentToDelete) return state;
  if (tournamentToDelete.containerId) {
    const container = (state.containers || []).find(c => c.id === tournamentToDelete.containerId);
    if (container) {
      const tournamentIdsToDelete = container.phases.map(p => p.tournamentId);
      const newTournaments = state.tournaments.filter(t => !tournamentIdsToDelete.includes(t.id));
      return {
        ...state,
        tournaments: newTournaments,
        containers: (state.containers || []).filter(c => c.id !== tournamentToDelete.containerId),
        currentTournamentId: state.currentTournamentId && tournamentIdsToDelete.includes(state.currentTournamentId)
          ? (newTournaments.length > 0 ? newTournaments[0].id : null)
          : state.currentTournamentId,
      };
    }
  }
  const newTournaments = state.tournaments.filter(t => t.id !== tournamentId);
  return {
    ...state,
    tournaments: newTournaments,
    currentTournamentId: state.currentTournamentId === tournamentId
      ? (newTournaments.length > 0 ? newTournaments[0].id : null)
      : state.currentTournamentId,
  };
}

interface UpdateTournamentSettingsPayload {
  tournamentId: string;
  name: string;
  system: Tournament['system'];
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
  tiebreakerOrder: Tournament['tiebreakerOrder'];
  numberOfRounds?: number;
  scheduling?: Tournament['scheduling'];
}

export function handleUpdateTournamentSettings(
  state: TournamentState,
  payload: UpdateTournamentSettingsPayload
): TournamentState {
  const settings = payload;
  const tournament = state.tournaments.find(t => t.id === settings.tournamentId);

  // Determine new phase name based on system
  const phaseName = settings.system === 'swiss'
    ? 'Swiss Vorrunde'
    : settings.system === 'round-robin'
      ? 'Vorrunde'
      : 'Hauptrunde';

  return {
    ...state,
    tournaments: state.tournaments.map(t => {
      if (t.id !== settings.tournamentId) return t;
      // Only allow updates if tournament is in configuration status
      if (t.status !== 'configuration') return t;

      return {
        ...t,
        name: settings.name,
        system: settings.system,
        numberOfCourts: settings.numberOfCourts,
        setsPerMatch: settings.setsPerMatch,
        pointsPerSet: settings.pointsPerSet,
        pointsPerThirdSet: settings.pointsPerThirdSet,
        tiebreakerOrder: settings.tiebreakerOrder,
        numberOfRounds: settings.numberOfRounds,
        scheduling: settings.scheduling,
        phaseName,
        updatedAt: new Date().toISOString(),
      };
    }),
    // Update container name if tournament name changed
    containers: (state.containers || []).map(c => {
      if (c.id !== tournament?.containerId) return c;
      return {
        ...c,
        name: settings.name,
        phases: c.phases.map(p =>
          p.tournamentId === settings.tournamentId
            ? { ...p, name: phaseName }
            : p
        ),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function handleUpdateTeams(
  state: TournamentState,
  payload: { tournamentId: string; teams: Team[] }
): TournamentState {
  return {
    ...state,
    tournaments: state.tournaments.map(t =>
      t.id === payload.tournamentId
        ? { ...t, teams: payload.teams, updatedAt: new Date().toISOString() }
        : t
    ),
  };
}

export function handleResetTournament(
  state: TournamentState,
  tournamentId: string
): TournamentState {
  const tournamentToReset = state.tournaments.find(t => t.id === tournamentId);
  if (!tournamentToReset) return state;
  let newTournaments = state.tournaments;
  let newContainers = state.containers || [];
  if (tournamentToReset.containerId) {
    const container = newContainers.find(c => c.id === tournamentToReset.containerId);
    if (container) {
      const childPhaseIds = container.phases
        .filter(p => p.tournamentId !== tournamentToReset.id)
        .map(p => p.tournamentId);
      newTournaments = newTournaments.filter(t => !childPhaseIds.includes(t.id));
      newContainers = newContainers.map(c => {
        if (c.id !== tournamentToReset.containerId) return c;
        return {
          ...c,
          phases: c.phases.filter(p => p.tournamentId === tournamentToReset.id),
          currentPhaseIndex: 0,
          status: 'in-progress' as const,
          updatedAt: new Date().toISOString(),
        };
      });
    }
  }
  newTournaments = newTournaments.map(t => {
    if (t.id !== tournamentId) return t;
    const resetStandings = t.teams.map(team => ({
      teamId: team.id, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0,
      pointsWon: 0, pointsLost: 0, points: 0,
    }));
    return {
      ...t,
      matches: [],
      standings: resetStandings,
      currentRound: t.system === 'swiss' ? 0 : undefined,
      status: 'configuration' as const,
      parentPhaseId: undefined,
      updatedAt: new Date().toISOString(),
    };
  });
  return { ...state, tournaments: newTournaments, containers: newContainers };
}

export function handleDeleteContainer(
  state: TournamentState,
  containerId: string
): TournamentState {
  const container = (state.containers || []).find(c => c.id === containerId);
  if (!container) return state;
  const tournamentIdsToDelete = container.phases.map(p => p.tournamentId);
  const newTournaments = state.tournaments.filter(t => !tournamentIdsToDelete.includes(t.id));
  return {
    ...state,
    tournaments: newTournaments,
    containers: (state.containers || []).filter(c => c.id !== containerId),
    currentTournamentId: state.currentTournamentId && tournamentIdsToDelete.includes(state.currentTournamentId)
      ? (newTournaments.length > 0 ? newTournaments[0].id : null)
      : state.currentTournamentId,
  };
}

export function handleUpdateGroups(
  state: TournamentState,
  payload: { tournamentId: string; groups: Group[] }
): TournamentState {
  const { tournamentId, groups } = payload;
  return {
    ...state,
    tournaments: state.tournaments.map(t => {
      if (t.id !== tournamentId) return t;
      if (t.system !== 'group-phase' || !t.groupPhaseConfig) return t;

      return {
        ...t,
        groupPhaseConfig: {
          ...t.groupPhaseConfig,
          groups,
          seeding: 'manual' as const, // Mark as manually adjusted
        },
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}
