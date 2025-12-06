import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentPhoto } from '../types/tournament';
import type { TournamentState, TournamentAction } from './tournamentActions';
import { generateSwissRoundMatches } from '../utils/swissSystem';
import { generateRoundRobinMatches } from '../utils/roundRobin';
import { calculateStandings } from '../utils/standings';

export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'CREATE_TOURNAMENT': {
      const config = action.payload;
      const teams = config.teams.map((t, index) => ({
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

          let matches = t.matches;
          let currentRound = t.currentRound;

          if (t.system === 'round-robin') {
            matches = generateRoundRobinMatches(t.teams, t.numberOfCourts);
          } else if (t.system === 'swiss') {
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
