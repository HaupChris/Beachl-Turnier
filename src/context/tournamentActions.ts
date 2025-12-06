import type { TournamentConfig, Team, SetScore, TournamentSystem, TiebreakerOrder, PlayoffSettings } from '../types/tournament';

export interface TournamentState {
  tournaments: Tournament[];
  currentTournamentId: string | null;
}

export interface TournamentSettingsUpdate {
  tournamentId: string;
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
  tiebreakerOrder: TiebreakerOrder;
  numberOfRounds?: number;
}

export interface GeneratePlayoffPayload {
  tournamentId: string;
  settings: PlayoffSettings;
}

export type TournamentAction =
  | { type: 'LOAD_STATE'; payload: TournamentState }
  | { type: 'CREATE_TOURNAMENT'; payload: TournamentConfig }
  | { type: 'SET_CURRENT_TOURNAMENT'; payload: string | null }
  | { type: 'UPDATE_TEAMS'; payload: { tournamentId: string; teams: Team[] } }
  | { type: 'UPDATE_TOURNAMENT_SETTINGS'; payload: TournamentSettingsUpdate }
  | { type: 'START_TOURNAMENT'; payload: string }
  | { type: 'UPDATE_MATCH_SCORE'; payload: { tournamentId: string; matchId: string; scores: SetScore[] } }
  | { type: 'COMPLETE_MATCH'; payload: { tournamentId: string; matchId: string } }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'GENERATE_NEXT_SWISS_ROUND'; payload: string }
  | { type: 'GENERATE_PLAYOFF_ROUND'; payload: GeneratePlayoffPayload };

export const initialState: TournamentState = {
  tournaments: [],
  currentTournamentId: null,
};

import type { Tournament } from '../types/tournament';
