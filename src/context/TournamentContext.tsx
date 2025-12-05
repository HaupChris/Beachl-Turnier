import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentConfig, Match, Team, SetScore, StandingEntry } from '../types/tournament';

interface TournamentState {
  tournaments: Tournament[];
  currentTournamentId: string | null;
}

type TournamentAction =
  | { type: 'LOAD_STATE'; payload: TournamentState }
  | { type: 'CREATE_TOURNAMENT'; payload: TournamentConfig }
  | { type: 'SET_CURRENT_TOURNAMENT'; payload: string | null }
  | { type: 'UPDATE_TEAMS'; payload: { tournamentId: string; teams: Team[] } }
  | { type: 'START_TOURNAMENT'; payload: string }
  | { type: 'UPDATE_MATCH_SCORE'; payload: { tournamentId: string; matchId: string; scores: SetScore[] } }
  | { type: 'COMPLETE_MATCH'; payload: { tournamentId: string; matchId: string } }
  | { type: 'DELETE_TOURNAMENT'; payload: string };

const initialState: TournamentState = {
  tournaments: [],
  currentTournamentId: null,
};

function generateRoundRobinMatches(teams: Team[], numberOfCourts: number): Match[] {
  const matches: Match[] = [];
  const n = teams.length;

  // For odd number of teams, add a "bye" placeholder
  const teamList = [...teams];
  if (n % 2 !== 0) {
    teamList.push({ id: 'bye', name: 'Freilos', seedPosition: n + 1 });
  }

  const numTeams = teamList.length;
  const rounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  // Circle method for round-robin scheduling
  const fixed = teamList[0];
  const rotating = teamList.slice(1);

  let matchNumber = 1;

  for (let round = 0; round < rounds; round++) {
    const currentTeams = [fixed, ...rotating];
    let courtNumber = 1;

    for (let i = 0; i < matchesPerRound; i++) {
      const teamA = currentTeams[i];
      const teamB = currentTeams[numTeams - 1 - i];

      // Skip matches with "bye"
      if (teamA.id === 'bye' || teamB.id === 'bye') {
        continue;
      }

      matches.push({
        id: uuidv4(),
        round: round + 1,
        matchNumber: matchNumber++,
        teamAId: teamA.id,
        teamBId: teamB.id,
        courtNumber: courtNumber <= numberOfCourts ? courtNumber : null,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      });

      courtNumber++;
    }

    // Rotate teams (keep first fixed, rotate the rest)
    rotating.unshift(rotating.pop()!);
  }

  return matches;
}

function calculateStandings(teams: Team[], matches: Match[]): StandingEntry[] {
  const standings: Map<string, StandingEntry> = new Map();

  // Initialize standings for all teams
  teams.forEach(team => {
    standings.set(team.id, {
      teamId: team.id,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      points: 0,
    });
  });

  // Process completed matches
  matches
    .filter(m => m.status === 'completed' && m.teamAId && m.teamBId)
    .forEach(match => {
      const teamAStats = standings.get(match.teamAId!)!;
      const teamBStats = standings.get(match.teamBId!)!;

      let setsWonA = 0;
      let setsWonB = 0;
      let pointsA = 0;
      let pointsB = 0;

      match.scores.forEach(score => {
        if (score.teamA > score.teamB) {
          setsWonA++;
        } else if (score.teamB > score.teamA) {
          setsWonB++;
        }
        pointsA += score.teamA;
        pointsB += score.teamB;
      });

      teamAStats.played++;
      teamBStats.played++;
      teamAStats.setsWon += setsWonA;
      teamAStats.setsLost += setsWonB;
      teamBStats.setsWon += setsWonB;
      teamBStats.setsLost += setsWonA;
      teamAStats.pointsWon += pointsA;
      teamAStats.pointsLost += pointsB;
      teamBStats.pointsWon += pointsB;
      teamBStats.pointsLost += pointsA;

      if (match.winnerId === match.teamAId) {
        teamAStats.won++;
        teamAStats.points += 2;
        teamBStats.lost++;
        teamBStats.points += 1;
      } else {
        teamBStats.won++;
        teamBStats.points += 2;
        teamAStats.lost++;
        teamAStats.points += 1;
      }
    });

  // Sort by points, then set difference, then point difference
  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    const pointDiffA = a.pointsWon - a.pointsLost;
    const pointDiffB = b.pointsWon - b.pointsLost;
    return pointDiffB - pointDiffA;
  });
}

function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'CREATE_TOURNAMENT': {
      const config = action.payload;
      const teams: Team[] = config.teams.map((t, index) => ({
        ...t,
        id: uuidv4(),
        seedPosition: index + 1,
      }));

      const newTournament: Tournament = {
        id: uuidv4(),
        name: config.name,
        system: config.system,
        numberOfCourts: config.numberOfCourts,
        setsPerMatch: config.setsPerMatch,
        pointsPerSet: config.pointsPerSet,
        teams,
        matches: [],
        standings: teams.map(t => ({
          teamId: t.id,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
        })),
        status: 'configuration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        tournaments: [...state.tournaments, newTournament],
        currentTournamentId: newTournament.id,
      };
    }

    case 'SET_CURRENT_TOURNAMENT':
      return { ...state, currentTournamentId: action.payload };

    case 'UPDATE_TEAMS': {
      return {
        ...state,
        tournaments: state.tournaments.map(t =>
          t.id === action.payload.tournamentId
            ? { ...t, teams: action.payload.teams, updatedAt: new Date().toISOString() }
            : t
        ),
      };
    }

    case 'START_TOURNAMENT': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload) return t;

          let matches: Match[] = [];

          if (t.system === 'round-robin') {
            matches = generateRoundRobinMatches(t.teams, t.numberOfCourts);
          }

          return {
            ...t,
            matches,
            status: 'in-progress',
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'UPDATE_MATCH_SCORE': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload.tournamentId) return t;

          const updatedMatches = t.matches.map(m =>
            m.id === action.payload.matchId
              ? { ...m, scores: action.payload.scores, status: 'in-progress' as const }
              : m
          );

          return {
            ...t,
            matches: updatedMatches,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'COMPLETE_MATCH': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload.tournamentId) return t;

          const updatedMatches = t.matches.map(m => {
            if (m.id !== action.payload.matchId) return m;

            // Determine winner
            let setsWonA = 0;
            let setsWonB = 0;
            m.scores.forEach(score => {
              if (score.teamA > score.teamB) setsWonA++;
              else if (score.teamB > score.teamA) setsWonB++;
            });

            const winnerId = setsWonA > setsWonB ? m.teamAId : m.teamBId;

            return { ...m, winnerId, status: 'completed' as const };
          });

          const standings = calculateStandings(t.teams, updatedMatches);

          // Check if tournament is completed
          const allCompleted = updatedMatches.every(m => m.status === 'completed');

          return {
            ...t,
            matches: updatedMatches,
            standings,
            status: allCompleted ? 'completed' : 'in-progress',
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'DELETE_TOURNAMENT': {
      const newTournaments = state.tournaments.filter(t => t.id !== action.payload);
      return {
        ...state,
        tournaments: newTournaments,
        currentTournamentId: state.currentTournamentId === action.payload
          ? (newTournaments.length > 0 ? newTournaments[0].id : null)
          : state.currentTournamentId,
      };
    }

    default:
      return state;
  }
}

const TournamentContext = createContext<{
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
  currentTournament: Tournament | null;
} | null>(null);

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

  return (
    <TournamentContext.Provider value={{ state, dispatch, currentTournament }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
