/**
 * Scenario Tests: Team Dropout Edge Cases - Part 2
 * BeachL variants, Swiss system, and full simulation
 */

import { describe, it, expect } from 'vitest';
import { tournamentReducer } from '../../context/tournamentReducer';
import type { TournamentState } from '../../context/tournamentActions';
import type { TournamentSystem } from '../../types/tournament';
import { SeededRandom } from '../utils/testHelpers';

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

describe('Team Dropout Scenarios - BeachL All-Placements', () => {
  it.each([[15, 4, '16 planned, 1 dropout'], [11, 3, '12 planned, 1 dropout'], [7, 2, '8 planned, 1 dropout']])(
    'handles %i teams in %i groups (%s)', (teamCount, groupCount, _description) => {
      const config = { ...createTournamentConfig('beachl-all-placements', teamCount, groupCount), system: 'beachl-all-placements' as const };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });

      expect(state.tournaments[0].status).toBe('in-progress');
      expect(state.tournaments.find(t => t.system === 'placement-tree')).toBeDefined();
    });
});

describe('Team Dropout Scenarios - BeachL Short Main Round', () => {
  it.each([[15, 4, '16 planned, 1 dropout'], [11, 3, '12 planned, 1 dropout'], [7, 2, '8 planned, 1 dropout']])(
    'handles %i teams in %i groups (%s)', (teamCount, groupCount, _description) => {
      const config = { ...createTournamentConfig('beachl-short-main', teamCount, groupCount), system: 'beachl-short-main' as const };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });

      expect(state.tournaments[0].status).toBe('in-progress');
      expect(state.tournaments.find(t => t.system === 'short-main-knockout')).toBeDefined();
    });
});

describe('Team Dropout Scenarios - Swiss System', () => {
  it.each([[5, 'planned 6, 1 dropout'], [7, 'planned 8, 1 dropout'], [9, 'planned 10, 1 dropout']])(
    'handles %i teams correctly (%s)', (teamCount, _description) => {
      const config = { ...createTournamentConfig('swiss', teamCount), numberOfRounds: 4 };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: state.tournaments[0].id });

      const tournament = state.tournaments[0];
      expect(tournament.status).toBe('in-progress');
      expect(tournament.currentRound).toBe(1);
      expect(tournament.matches).toHaveLength(Math.floor(teamCount / 2));
    });

  it('completes full swiss tournament with 7 teams', () => {
    const config = { ...createTournamentConfig('swiss', 7), numberOfRounds: 3 };
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const tournamentId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

    const rng = new SeededRandom(12345);
    for (let round = 1; round <= 3; round++) {
      state = simulateAllMatches(state, tournamentId, rng);
      if (round < 3) state = tournamentReducer(state, { type: 'GENERATE_NEXT_SWISS_ROUND', payload: tournamentId });
    }

    expect(state.tournaments.find(t => t.id === tournamentId)?.currentRound).toBe(3);
  });
});

describe('Full Tournament Simulation with Dropouts', () => {
  it('completes SSVB 15-team tournament (16 planned, 1 dropout)', () => {
    const config = createTournamentConfig('group-phase', 15, 4);
    let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });
    const groupPhaseId = state.tournaments[0].id;
    state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: groupPhaseId });

    const rng = new SeededRandom(42);
    state = simulateAllMatches(state, groupPhaseId, rng);
    expect(state.tournaments[0].status).toBe('completed');

    const knockoutTournament = state.tournaments.find(t => t.system === 'knockout');
    expect(knockoutTournament).toBeDefined();
    expect(knockoutTournament!.teams.length).toBeGreaterThan(0);

    state = simulateAllMatches(state, knockoutTournament!.id, rng);

    let iterations = 0;
    while (iterations < 10) {
      const ko = state.tournaments.find(t => t.system === 'knockout');
      if (!ko?.matches.filter(m => m.status === 'scheduled').length) break;
      state = simulateAllMatches(state, ko!.id, rng);
      iterations++;
    }

    const finalKnockout = state.tournaments.find(t => t.system === 'knockout');
    expect(finalKnockout?.matches.filter(m => m.status === 'completed').length).toBeGreaterThan(0);
  });
});
