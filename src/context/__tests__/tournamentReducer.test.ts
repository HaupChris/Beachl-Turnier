import { describe, it, expect } from 'vitest';
import { tournamentReducer } from '../tournamentReducer';
import type { TournamentState } from '../tournamentActions';
import type { TournamentSystem } from '../../types/tournament';

const initialState: TournamentState = {
  tournaments: [],
  containers: [],
  currentTournamentId: null,
};

function createTournamentConfig(
  system: TournamentSystem,
  teamCount: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    name: `Test ${system} Tournament`,
    system,
    numberOfCourts: 4,
    setsPerMatch: 1 as const,
    pointsPerSet: 21 as const,
    tiebreakerOrder: 'head-to-head-first' as const,
    teams: Array.from({ length: teamCount }, (_, i) => ({
      id: '',
      name: `Team ${i + 1}`,
      seedPosition: i + 1,
    })),
    ...overrides,
  };
}

function createGroupPhaseConfig(numberOfGroups: number) {
  return {
    numberOfGroups,
    teamsPerGroup: 4,
    seeding: 'snake' as const,
    groups: [],
  };
}

describe('tournamentReducer - CREATE_TOURNAMENT', () => {
  it('creates round-robin tournament', () => {
    const config = createTournamentConfig('round-robin', 8);
    const state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    expect(state.tournaments).toHaveLength(1);
    expect(state.tournaments[0].system).toBe('round-robin');
    expect(state.tournaments[0].teams).toHaveLength(8);
    expect(state.tournaments[0].status).toBe('configuration');
  });

  it('creates swiss tournament', () => {
    const config = createTournamentConfig('swiss', 10, { numberOfRounds: 4 });
    const state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    expect(state.tournaments[0].system).toBe('swiss');
    expect(state.tournaments[0].numberOfRounds).toBe(4);
  });

  it('creates group-phase tournament with groups', () => {
    const config = createTournamentConfig('group-phase', 16, {
      groupPhaseConfig: createGroupPhaseConfig(4),
      knockoutSettings: { setsPerMatch: 1, pointsPerSet: 21, playThirdPlaceMatch: true, useReferees: false },
    });
    const state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    expect(state.tournaments[0].system).toBe('group-phase');
    expect(state.tournaments[0].groupPhaseConfig?.groups).toHaveLength(4);
  });

  it('creates container and sets currentTournamentId', () => {
    const config = createTournamentConfig('round-robin', 6);
    const state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    expect(state.containers).toHaveLength(1);
    expect(state.currentTournamentId).toBe(state.tournaments[0].id);
  });
});

describe('tournamentReducer - START_TOURNAMENT', () => {
  it('generates matches for round-robin', () => {
    const config = createTournamentConfig('round-robin', 6);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
    expect(state.tournaments[0].matches).toHaveLength(15);
    expect(state.tournaments[0].status).toBe('in-progress');
  });

  it('generates swiss round 1 matches', () => {
    const config = createTournamentConfig('swiss', 8, { numberOfRounds: 4 });
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
    expect(state.tournaments[0].matches).toHaveLength(4);
    expect(state.tournaments[0].currentRound).toBe(1);
  });

  it('generates group phase matches and knockout placeholder', () => {
    const config = createTournamentConfig('group-phase', 16, {
      groupPhaseConfig: createGroupPhaseConfig(4),
      knockoutSettings: { setsPerMatch: 1, pointsPerSet: 21, playThirdPlaceMatch: true, useReferees: false },
    });
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
    expect(state.tournaments[0].matches).toHaveLength(24);
    expect(state.tournaments).toHaveLength(2);
    expect(state.tournaments[1].system).toBe('knockout');
  });

  it('generates placement tree placeholder for beachl-all-placements', () => {
    const config = createTournamentConfig('beachl-all-placements', 16, {
      groupPhaseConfig: createGroupPhaseConfig(4),
      knockoutSettings: { setsPerMatch: 1, pointsPerSet: 21, playThirdPlaceMatch: true, useReferees: false },
    });
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
    expect(state.tournaments[1].system).toBe('placement-tree');
  });
});

describe('tournamentReducer - MATCH_OPERATIONS', () => {
  it('updates match scores', () => {
    const config = createTournamentConfig('round-robin', 4);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const tournamentId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });
    const matchId = state.tournaments[0].matches[0].id;
    const scores = [{ teamA: 21, teamB: 15 }];
    state = tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { tournamentId, matchId, scores } });
    expect(state.tournaments[0].matches[0].scores).toEqual(scores);
    expect(state.tournaments[0].matches[0].status).toBe('in-progress');
  });

  it('marks match as completed with winner', () => {
    const config = createTournamentConfig('round-robin', 4);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const tournamentId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });
    const matchId = state.tournaments[0].matches[0].id;
    state = tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { tournamentId, matchId, scores: [{ teamA: 21, teamB: 15 }] } });
    state = tournamentReducer(state, { type: 'COMPLETE_MATCH', payload: { tournamentId, matchId } });
    const match = state.tournaments[0].matches.find(m => m.id === matchId);
    expect(match?.status).toBe('completed');
    expect(match?.winnerId).toBe(match?.teamAId);
  });

  it('updates standings after match completion', () => {
    const config = createTournamentConfig('round-robin', 4);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const tournamentId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });
    const matchId = state.tournaments[0].matches[0].id;
    const teamAId = state.tournaments[0].matches[0].teamAId;
    state = tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { tournamentId, matchId, scores: [{ teamA: 21, teamB: 15 }] } });
    state = tournamentReducer(state, { type: 'COMPLETE_MATCH', payload: { tournamentId, matchId } });
    const winnerStanding = state.tournaments[0].standings.find(s => s.teamId === teamAId);
    expect(winnerStanding?.won).toBe(1);
  });

  it('marks tournament completed when all matches done', () => {
    const config = createTournamentConfig('round-robin', 2);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const tournamentId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });
    const matchId = state.tournaments[0].matches[0].id;
    state = tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { tournamentId, matchId, scores: [{ teamA: 21, teamB: 15 }] } });
    state = tournamentReducer(state, { type: 'COMPLETE_MATCH', payload: { tournamentId, matchId } });
    expect(state.tournaments[0].status).toBe('completed');
  });
});

describe('tournamentReducer - SWISS_ROUND', () => {
  it('generates next round after completing current round', () => {
    const config = createTournamentConfig('swiss', 4, { numberOfRounds: 2 });
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const tournamentId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });
    for (const match of state.tournaments[0].matches) {
      state = tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { tournamentId, matchId: match.id, scores: [{ teamA: 21, teamB: 15 }] } });
      state = tournamentReducer(state, { type: 'COMPLETE_MATCH', payload: { tournamentId, matchId: match.id } });
    }
    state = tournamentReducer(state, { type: 'GENERATE_NEXT_SWISS_ROUND', payload: tournamentId });
    expect(state.tournaments[0].currentRound).toBe(2);
    expect(state.tournaments[0].matches.length).toBe(4);
  });
});
