import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Tournament, TournamentContainer } from '../types/tournament';
import { initialState, type TournamentState, type TournamentAction } from './tournamentActions';
import { tournamentReducer } from './tournamentReducer';

interface TournamentContextValue {
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
  currentTournament: Tournament | null;
  currentContainer: TournamentContainer | null;
  containerPhases: Tournament[];
  setCurrentTournamentByUrl: (containerId: string, tournamentId?: string) => void;
  getTournamentUrl: (path: string) => string;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

const STORAGE_KEY = 'beachvolleyball-tournament-state';

// Helper to get state without currentTournamentId for persistence
function getStateForStorage(state: TournamentState): Omit<TournamentState, 'currentTournamentId'> & { currentTournamentId: null } {
  return {
    ...state,
    currentTournamentId: null, // Don't persist currentTournamentId - it's now URL-based
  };
}

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear currentTournamentId from loaded state - we use URL now
        dispatch({ type: 'LOAD_STATE', payload: { ...parsed, currentTournamentId: null } });
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save state to localStorage on change (without currentTournamentId)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateForStorage(state)));
  }, [state]);

  // Cross-tab synchronization: Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // Preserve the current tournament ID when syncing from other tabs
          dispatch({ type: 'LOAD_STATE', payload: { ...parsed, currentTournamentId: state.currentTournamentId } });
        } catch (err) {
          console.error('Failed to sync state from other tab:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [state.currentTournamentId]);

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

  // Helper function to set current tournament based on URL params
  const setCurrentTournamentByUrl = useCallback((containerId: string, tournamentId?: string) => {
    if (tournamentId) {
      // Direct tournament ID provided
      dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: tournamentId });
    } else {
      // Find the container and use its current phase
      const container = state.containers.find(c => c.id === containerId);
      if (container && container.phases.length > 0) {
        const currentPhase = container.phases[container.currentPhaseIndex] || container.phases[0];
        dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: currentPhase.tournamentId });
      }
    }
  }, [state.containers]);

  // Helper to generate tournament-specific URLs
  const getTournamentUrl = useCallback((path: string): string => {
    if (!currentContainer) return path;
    const basePath = `/tournament/${currentContainer.id}`;
    if (path === '/' || path === '') return basePath;
    return `${basePath}${path}`;
  }, [currentContainer]);

  return (
    <TournamentContext.Provider value={{
      state,
      dispatch,
      currentTournament,
      currentContainer,
      containerPhases,
      setCurrentTournamentByUrl,
      getTournamentUrl
    }}>
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

// Hook to sync tournament selection with URL parameters
// eslint-disable-next-line react-refresh/only-export-components
export function useTournamentFromUrl() {
  const { containerId, tournamentId } = useParams<{ containerId?: string; tournamentId?: string }>();
  const { state, dispatch, currentTournament, currentContainer } = useTournament();
  const navigate = useNavigate();

  // Sync URL params with tournament context
  useEffect(() => {
    if (containerId) {
      // We have a container ID in the URL - find and set the tournament
      const container = state.containers.find(c => c.id === containerId);
      if (container) {
        if (tournamentId) {
          // Specific tournament ID provided
          const tournament = state.tournaments.find(t => t.id === tournamentId);
          if (tournament && tournament.containerId === containerId) {
            if (currentTournament?.id !== tournamentId) {
              dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: tournamentId });
            }
          }
        } else {
          // Use the container's current phase
          const currentPhase = container.phases[container.currentPhaseIndex] || container.phases[0];
          if (currentPhase && currentTournament?.id !== currentPhase.tournamentId) {
            dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: currentPhase.tournamentId });
          }
        }
      }
    }
  }, [containerId, tournamentId, state.containers, state.tournaments, currentTournament?.id, dispatch]);

  // Helper to navigate while preserving tournament context
  const navigateWithTournament = useCallback((path: string) => {
    const effectiveContainerId = containerId || currentContainer?.id;
    if (effectiveContainerId) {
      navigate(`/tournament/${effectiveContainerId}${path}`);
    } else {
      navigate(path);
    }
  }, [containerId, currentContainer?.id, navigate]);

  return {
    containerId,
    tournamentId,
    navigateWithTournament,
    isUrlBased: !!containerId,
  };
}
