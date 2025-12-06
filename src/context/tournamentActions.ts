import type { TournamentConfig, Team, SetScore, TournamentPhoto } from '../types/tournament';

export interface TournamentState {
  tournaments: Tournament[];
  currentTournamentId: string | null;
}

export type TournamentAction =
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

export const initialState: TournamentState = {
  tournaments: [],
  currentTournamentId: null,
};

import type { Tournament } from '../types/tournament';
