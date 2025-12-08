import type { TournamentConfig, Team, SetScore, TournamentSystem, TiebreakerOrder, PlayoffSettings, TournamentContainer, SchedulingSettings, Group, KnockoutSettings, GroupPhaseConfig } from '../types/tournament';

export interface TournamentState {
  tournaments: Tournament[];
  containers: TournamentContainer[];
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
  scheduling?: SchedulingSettings;
  // Group phase specific
  groupPhaseConfig?: Omit<GroupPhaseConfig, 'groups'>;
  groups?: Group[];
  // Knockout specific
  useReferees?: boolean;
  playThirdPlaceMatch?: boolean;
}

export interface CreateFinalsPayload {
  parentTournamentId: string;
  settings: PlayoffSettings;
}

export interface CreateKnockoutPayload {
  parentTournamentId: string;
  settings: KnockoutSettings;
}

export interface UpdateGroupsPayload {
  tournamentId: string;
  groups: Group[];
}

export type TournamentAction =
  | { type: 'LOAD_STATE'; payload: TournamentState }
  | { type: 'CREATE_TOURNAMENT'; payload: TournamentConfig }
  | { type: 'SET_CURRENT_TOURNAMENT'; payload: string | null }
  | { type: 'UPDATE_TEAMS'; payload: { tournamentId: string; teams: Team[] } }
  | { type: 'UPDATE_TOURNAMENT_SETTINGS'; payload: TournamentSettingsUpdate }
  | { type: 'START_TOURNAMENT'; payload: string }
  | { type: 'RESET_TOURNAMENT'; payload: string }
  | { type: 'UPDATE_MATCH_SCORE'; payload: { tournamentId: string; matchId: string; scores: SetScore[] } }
  | { type: 'COMPLETE_MATCH'; payload: { tournamentId: string; matchId: string } }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'GENERATE_NEXT_SWISS_ROUND'; payload: string }
  | { type: 'CREATE_FINALS_TOURNAMENT'; payload: CreateFinalsPayload }
  | { type: 'SET_CURRENT_PHASE'; payload: { containerId: string; phaseIndex: number } }
  | { type: 'DELETE_CONTAINER'; payload: string }
  // New actions for group phase and knockout
  | { type: 'UPDATE_GROUPS'; payload: UpdateGroupsPayload }
  | { type: 'CREATE_KNOCKOUT_TOURNAMENT'; payload: CreateKnockoutPayload };

export const initialState: TournamentState = {
  tournaments: [],
  containers: [],
  currentTournamentId: null,
};

import type { Tournament } from '../types/tournament';
