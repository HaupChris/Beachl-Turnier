import type { TournamentState } from '../tournamentActions';

export function handleLoadState(
  _state: TournamentState,
  payload: TournamentState
): TournamentState {
  return payload;
}

export function handleSetCurrentTournament(
  state: TournamentState,
  tournamentId: string | null
): TournamentState {
  return { ...state, currentTournamentId: tournamentId };
}

export function handleSetCurrentPhase(
  state: TournamentState,
  payload: { containerId: string; phaseIndex: number }
): TournamentState {
  const { containerId, phaseIndex } = payload;
  const container = (state.containers || []).find(c => c.id === containerId);
  if (!container || phaseIndex < 0 || phaseIndex >= container.phases.length) {
    return state;
  }

  const phase = container.phases[phaseIndex];

  return {
    ...state,
    containers: (state.containers || []).map(c =>
      c.id === containerId
        ? { ...c, currentPhaseIndex: phaseIndex, updatedAt: new Date().toISOString() }
        : c
    ),
    currentTournamentId: phase.tournamentId,
  };
}
