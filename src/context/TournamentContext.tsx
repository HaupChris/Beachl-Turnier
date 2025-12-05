import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentConfig, Match, Team, SetScore, StandingEntry, TournamentPhoto } from '../types/tournament';

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
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'ADD_PHOTO'; payload: { tournamentId: string; photo: Omit<TournamentPhoto, 'id' | 'createdAt'> } }
  | { type: 'DELETE_PHOTO'; payload: { tournamentId: string; photoId: string } }
  | { type: 'UPDATE_PHOTO_CAPTION'; payload: { tournamentId: string; photoId: string; caption: string } }
  | { type: 'GENERATE_NEXT_SWISS_ROUND'; payload: string };

const initialState: TournamentState = {
  tournaments: [],
  currentTournamentId: null,
};

function generateSwissRoundMatches(
  teams: Team[],
  standings: StandingEntry[],
  previousMatches: Match[],
  roundNumber: number,
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];

  // Sort teams by current standings (points, then tiebreakers)
  const sortedTeams = [...teams].sort((a, b) => {
    const standingA = standings.find(s => s.teamId === a.id);
    const standingB = standings.find(s => s.teamId === b.id);
    if (!standingA || !standingB) return 0;

    if (standingB.points !== standingA.points) return standingB.points - standingA.points;
    const setDiffA = standingA.setsWon - standingA.setsLost;
    const setDiffB = standingB.setsWon - standingB.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    return (standingB.pointsWon - standingB.pointsLost) - (standingA.pointsWon - standingA.pointsLost);
  });

  // Track which teams have already played each other
  const playedPairs = new Set<string>();
  previousMatches.forEach(m => {
    if (m.teamAId && m.teamBId) {
      playedPairs.add(`${m.teamAId}-${m.teamBId}`);
      playedPairs.add(`${m.teamBId}-${m.teamAId}`);
    }
  });

  // Greedy pairing: pair teams with similar standings who haven't played yet
  const paired = new Set<string>();
  const matchPairs: [Team, Team][] = [];

  for (let i = 0; i < sortedTeams.length; i++) {
    const teamA = sortedTeams[i];
    if (paired.has(teamA.id)) continue;

    for (let j = i + 1; j < sortedTeams.length; j++) {
      const teamB = sortedTeams[j];
      if (paired.has(teamB.id)) continue;

      const pairKey = `${teamA.id}-${teamB.id}`;
      if (!playedPairs.has(pairKey)) {
        matchPairs.push([teamA, teamB]);
        paired.add(teamA.id);
        paired.add(teamB.id);
        break;
      }
    }
  }

  // If odd number of teams, one gets a bye
  // Handle unpaired teams (they already played everyone available at their level)
  const unpaired = sortedTeams.filter(t => !paired.has(t.id));
  for (let i = 0; i < unpaired.length - 1; i += 2) {
    matchPairs.push([unpaired[i], unpaired[i + 1]]);
  }

  // Create matches
  const startMatchNumber = previousMatches.length + 1;
  matchPairs.forEach((pair, index) => {
    matches.push({
      id: uuidv4(),
      round: roundNumber,
      matchNumber: startMatchNumber + index,
      teamAId: pair[0].id,
      teamBId: pair[1].id,
      courtNumber: index < numberOfCourts ? index + 1 : null,
      scores: [],
      winnerId: null,
      status: 'scheduled',
    });
  });

  return matches;
}

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
        numberOfRounds: config.numberOfRounds,
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
        photos: [],
        currentRound: config.system === 'swiss' ? 0 : undefined,
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
          let currentRound = t.currentRound;

          if (t.system === 'round-robin') {
            matches = generateRoundRobinMatches(t.teams, t.numberOfCourts);
          } else if (t.system === 'swiss') {
            // Generate first round based on seeding
            matches = generateSwissRoundMatches(t.teams, t.standings, [], 1, t.numberOfCourts);
            currentRound = 1;
          }

          return {
            ...t,
            matches,
            currentRound,
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

    case 'ADD_PHOTO': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload.tournamentId) return t;
          const newPhoto: TournamentPhoto = {
            id: uuidv4(),
            dataUrl: action.payload.photo.dataUrl,
            caption: action.payload.photo.caption,
            createdAt: new Date().toISOString(),
          };
          return {
            ...t,
            photos: [...(t.photos || []), newPhoto],
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'DELETE_PHOTO': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload.tournamentId) return t;
          return {
            ...t,
            photos: (t.photos || []).filter(p => p.id !== action.payload.photoId),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'UPDATE_PHOTO_CAPTION': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload.tournamentId) return t;
          return {
            ...t,
            photos: (t.photos || []).map(p =>
              p.id === action.payload.photoId ? { ...p, caption: action.payload.caption } : p
            ),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'GENERATE_NEXT_SWISS_ROUND': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload) return t;
          if (t.system !== 'swiss') return t;

          const currentRound = t.currentRound || 0;
          const nextRound = currentRound + 1;

          // Check if we've reached the maximum number of rounds
          if (t.numberOfRounds && nextRound > t.numberOfRounds) {
            return { ...t, status: 'completed', updatedAt: new Date().toISOString() };
          }

          const newMatches = generateSwissRoundMatches(
            t.teams,
            t.standings,
            t.matches,
            nextRound,
            t.numberOfCourts
          );

          // If no more matches can be generated, tournament is complete
          if (newMatches.length === 0) {
            return { ...t, status: 'completed', updatedAt: new Date().toISOString() };
          }

          return {
            ...t,
            matches: [...t.matches, ...newMatches],
            currentRound: nextRound,
            updatedAt: new Date().toISOString(),
          };
        }),
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
