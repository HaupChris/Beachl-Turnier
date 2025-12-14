/**
 * Scenario Tests: Team Dropout Edge Cases - Part 1
 * Round-Robin and Group Phase tournaments
 */

import { describe, it, expect } from 'vitest';
import { tournamentReducer } from '../../context/tournamentReducer';
import type { TournamentState } from '../../context/tournamentActions';
import type { TournamentSystem } from '../../types/tournament';
import { SeededRandom, verifyAllTeamsParticipate, verifyNoSelfMatches, verifyNoDuplicateMatchups } from '../utils/testHelpers';

const initialState: TournamentState = { tournaments: [], containers: [], currentTournamentId: null };

function createTournamentConfig(system: TournamentSystem, teamCount: number, groupCount?: number) {
  const baseConfig = {
    name: `Test ${system} - ${teamCount} teams`, system, numberOfCourts: 4,
    setsPerMatch: 1 as const, pointsPerSet: 21 as const, tiebreakerOrder: 'head-to-head-first' as const,
    teams: Array.from({ length: teamCount }, (_, i) => ({ id: '', name: `Team ${i + 1}`, seedPosition: i + 1 })),
  };
  if (groupCount) {
    return {
      ...baseConfig,
      groupPhaseConfig: { numberOfGroups: groupCount, teamsPerGroup: 4, seeding: 'snake' as const, groups: [] },
      knockoutSettings: { setsPerMatch: 1 as const, pointsPerSet: 21 as const, playThirdPlaceMatch: true, useReferees: false },
    };
  }
  return baseConfig;
}

function simulateAllMatches(state: TournamentState, tournamentId: string, rng: SeededRandom): TournamentState {
  let currentState = state;
  const tournament = currentState.tournaments.find(t => t.id === tournamentId);
  if (!tournament) return currentState;

  for (const match of tournament.matches.filter(m => m.status === 'scheduled')) {
    if (!match.teamAId || !match.teamBId) continue;
    const teamAScore = rng.next() > 0.5 ? 21 : rng.nextInt(10, 19);
    const teamBScore = teamAScore === 21 ? rng.nextInt(10, 19) : 21;
    currentState = tournamentReducer(currentState, { type: 'UPDATE_MATCH_SCORE', payload: { tournamentId, matchId: match.id, scores: [{ teamA: teamAScore, teamB: teamBScore }] } });
    currentState = tournamentReducer(currentState, { type: 'COMPLETE_MATCH', payload: { tournamentId, matchId: match.id } });
  }
  return currentState;
}

describe('Team Dropout Scenarios - Round-Robin', () => {
  it.each([[5, 'planned 6, 1 dropout'], [7, 'planned 8, 1 dropout'], [9, 'planned 10, 1 dropout'], [11, 'planned 12, 1 dropout']])(
    'handles %i teams correctly (%s)', (teamCount, _description) => {
      const config = createTournamentConfig('round-robin', teamCount);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });

      const { teams, matches } = state.tournaments[0];
      expect(verifyNoSelfMatches(matches).valid).toBe(true);
      expect(verifyNoDuplicateMatchups(matches).valid).toBe(true);
      expect(verifyAllTeamsParticipate(matches, teams).valid).toBe(true);
      expect(matches).toHaveLength((teamCount * (teamCount - 1)) / 2);
    });

  it('completes full tournament with 11 teams (12 planned, 1 dropout)', () => {
    const config = createTournamentConfig('round-robin', 11);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
    state = simulateAllMatches(state, state.tournaments[0].id, new SeededRandom(12345));

    expect(state.tournaments[0].status).toBe('completed');
    expect(state.tournaments[0].standings.every(s => s.played === 10)).toBe(true);
  });
});

describe('Team Dropout Scenarios - Group Phase', () => {
  describe('4 groups configuration', () => {
    it.each([[15, '16 planned, 1 dropout'], [14, '16 planned, 2 dropouts'], [13, '16 planned, 3 dropouts']])(
      'handles %i teams correctly (%s)', (teamCount, _description) => {
        const config = createTournamentConfig('group-phase', teamCount, 4);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });

        const { status, teams, matches } = state.tournaments[0];
        expect(status).toBe('in-progress');
        expect(verifyAllTeamsParticipate(matches, teams).valid).toBe(true);
        expect(state.tournaments).toHaveLength(2);
      });

    it('completes full tournament with 15 teams (16 planned, 1 dropout)', () => {
      const config = createTournamentConfig('group-phase', 15, 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });
      state = simulateAllMatches(state, tournamentId, new SeededRandom(12345));

      expect(state.tournaments[0].status).toBe('completed');
      const knockoutTournament = state.tournaments.find(t => t.system === 'knockout');
      expect(knockoutTournament).toBeDefined();
      expect(knockoutTournament!.teams.length).toBeGreaterThan(0);
    });
  });

  describe('3 groups configuration', () => {
    it.each([[11, '12 planned, 1 dropout'], [10, '12 planned, 2 dropouts'], [9, '12 planned, 3 dropouts - min per group']])(
      'handles %i teams correctly (%s)', (teamCount, _description) => {
        const config = createTournamentConfig('group-phase', teamCount, 3);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
        expect(state.tournaments[0].status).toBe('in-progress');
        expect(state.tournaments[0].matches.length).toBeGreaterThan(0);
      });
  });

  describe('2 groups configuration', () => {
    it.each([[7, '8 planned, 1 dropout'], [6, '8 planned, 2 dropouts']])(
      'handles %i teams correctly (%s)', (teamCount, _description) => {
        const config = createTournamentConfig('group-phase', teamCount, 2);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });
        expect(state.tournaments[0].status).toBe('in-progress');
      });
  });
});
