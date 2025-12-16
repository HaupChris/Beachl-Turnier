import type { TournamentState, TournamentAction } from './tournamentActions';
import {
  handleCreateTournament,
  handleDeleteTournament,
  handleUpdateTournamentSettings,
  handleUpdateTeams,
  handleStartTournament,
  handleResetTournament,
  handleDeleteContainer,
  handleUpdateGroups,
} from './reducerActions/tournamentActions';
import {
  handleUpdateMatchScore,
  handleCompleteMatch,
} from './reducerActions/matchActions';
import {
  handleGenerateNextSwissRound,
  handleCreateFinalsPhase,
  handleTransitionToKnockout,
} from './reducerActions/phaseActions';
import {
  handleLoadState,
  handleSetCurrentTournament,
  handleSetCurrentPhase,
} from './reducerActions/loadActions';

export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'LOAD_STATE':
      return handleLoadState(state, action.payload);

    case 'CREATE_TOURNAMENT':
      return handleCreateTournament(state, action.payload);

    case 'SET_CURRENT_TOURNAMENT':
      return handleSetCurrentTournament(state, action.payload);

    case 'UPDATE_TEAMS':
      return handleUpdateTeams(state, action.payload);

    case 'UPDATE_TOURNAMENT_SETTINGS':
      return handleUpdateTournamentSettings(state, action.payload);

    case 'START_TOURNAMENT':
      return handleStartTournament(state, action.payload);

    case 'RESET_TOURNAMENT':
      return handleResetTournament(state, action.payload);

    case 'UPDATE_MATCH_SCORE':
      return handleUpdateMatchScore(state, action.payload);

    case 'COMPLETE_MATCH':
      return handleCompleteMatch(state, action.payload);

    case 'DELETE_TOURNAMENT':
      return handleDeleteTournament(state, action.payload);

    case 'GENERATE_NEXT_SWISS_ROUND':
      return handleGenerateNextSwissRound(state, action.payload);

    case 'CREATE_FINALS_TOURNAMENT':
      return handleCreateFinalsPhase(state, action.payload);

    case 'SET_CURRENT_PHASE':
      return handleSetCurrentPhase(state, action.payload);

    case 'DELETE_CONTAINER':
      return handleDeleteContainer(state, action.payload);

    case 'UPDATE_GROUPS':
      return handleUpdateGroups(state, action.payload);

    case 'CREATE_KNOCKOUT_TOURNAMENT':
      return handleTransitionToKnockout(state, action.payload);

    default:
      return state;
  }
}
