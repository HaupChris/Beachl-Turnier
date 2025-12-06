import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Tournament, TournamentContainer } from '../types/tournament';
import { initialState, type TournamentState, type TournamentAction } from './tournamentActions';
import { tournamentReducer } from './tournamentReducer';

interface TournamentContextValue {
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
  currentTournament: Tournament | null;
  currentContainer: TournamentContainer | null;
  containerPhases: Tournament[];
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

const STORAGE_KEY = 'beachvolleyball-tournament-state';

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const currentTournament = state.currentTournamentId
    ? state.tournaments.find(t => t.id === state.currentTournamentId) ?? null
    : null;

  // Find container for current tournament (if any)
  const currentContainer = currentTournament?.containerId
    ? (state.containers || []).find(c => c.id === currentTournament.containerId) ?? null
    : null;

  // Get all tournaments in the current container, sorted by phase order
  const containerPhases = currentContainer
    ? currentContainer.phases
        .map(phase => state.tournaments.find(t => t.id === phase.tournamentId))
        .filter((t): t is Tournament => t !== undefined)
        .sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0))
    : [];

  return (
    <TournamentContext.Provider value={{ state, dispatch, currentTournament, currentContainer, containerPhases }}>
      {children}
    </TournamentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
