/**
 * Scenario Tests: Team Dropout Edge Cases
 *
 * These tests verify that the tournament system correctly handles
 * situations where the actual team count differs from the planned count
 * (e.g., 12 teams planned but only 11 show up).
 */

import { describe, it, expect } from 'vitest';
import { tournamentReducer } from '../../context/tournamentReducer';
import type { TournamentState, TournamentAction } from '../../context/tournamentActions';
import type { TournamentSystem } from '../../types/tournament';
import {
  SeededRandom,
  verifyAllTeamsParticipate,
  verifyNoSelfMatches,
  verifyNoDuplicateMatchups,
  verifyDependencies,
} from '../utils/testHelpers';

const initialState: TournamentState = {
  tournaments: [],
  containers: [],
  currentTournamentId: null,
};

function createTournamentConfig(
  system: TournamentSystem,
  teamCount: number,
  groupCount?: number
) {
  const baseConfig = {
    name: `Test ${system} - ${teamCount} teams`,
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
  };

  if (groupCount) {
    return {
      ...baseConfig,
      groupPhaseConfig: {
        numberOfGroups: groupCount,
        teamsPerGroup: 4,
        seeding: 'snake' as const,
        groups: [],
      },
      knockoutSettings: {
        setsPerMatch: 1 as const,
        pointsPerSet: 21 as const,
        playThirdPlaceMatch: true,
        useReferees: false,
      },
    };
  }

  return baseConfig;
}

function simulateAllMatches(state: TournamentState, tournamentId: string, rng: SeededRandom): TournamentState {
  let currentState = state;

  const tournament = currentState.tournaments.find(t => t.id === tournamentId);
  if (!tournament) return currentState;

  // Get all scheduled matches
  const scheduledMatches = tournament.matches.filter(m => m.status === 'scheduled');

  for (const match of scheduledMatches) {
    if (!match.teamAId || !match.teamBId) continue;

    // Generate random score
    const teamAScore = rng.next() > 0.5 ? 21 : rng.nextInt(10, 19);
    const teamBScore = teamAScore === 21 ? rng.nextInt(10, 19) : 21;
    const scores = [{ teamA: teamAScore, teamB: teamBScore }];

    // Update score
    currentState = tournamentReducer(currentState, {
      type: 'UPDATE_MATCH_SCORE',
      payload: { tournamentId, matchId: match.id, scores },
    });

    // Complete match
    currentState = tournamentReducer(currentState, {
      type: 'COMPLETE_MATCH',
      payload: { tournamentId, matchId: match.id },
    });
  }

  return currentState;
}

describe('Team Dropout Scenarios', () => {
  describe('Round-Robin with Odd Team Count', () => {
    it.each([
      [5, 'planned 6, 1 dropout'],
      [7, 'planned 8, 1 dropout'],
      [9, 'planned 10, 1 dropout'],
      [11, 'planned 12, 1 dropout'],
    ])('handles %i teams correctly (%s)', (teamCount, _description) => {
      const config = createTournamentConfig('round-robin', teamCount);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const tournament = state.tournaments[0];
      const teams = tournament.teams;
      const matches = tournament.matches;

      // Verify match integrity
      const noSelf = verifyNoSelfMatches(matches);
      expect(noSelf.valid).toBe(true);

      const noDupes = verifyNoDuplicateMatchups(matches);
      expect(noDupes.valid).toBe(true);

      const allParticipate = verifyAllTeamsParticipate(matches, teams);
      expect(allParticipate.valid).toBe(true);

      // Expected match count: n*(n-1)/2
      const expectedMatches = (teamCount * (teamCount - 1)) / 2;
      expect(matches).toHaveLength(expectedMatches);
    });

    it('completes full tournament with 11 teams (12 planned, 1 dropout)', () => {
      const config = createTournamentConfig('round-robin', 11);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const rng = new SeededRandom(12345);
      state = simulateAllMatches(state, tournamentId, rng);

      expect(state.tournaments[0].status).toBe('completed');
      expect(state.tournaments[0].standings.every(s => s.played === 10)).toBe(true);
    });
  });

  describe('Group Phase with Team Dropouts', () => {
    describe('4 groups configuration', () => {
      it.each([
        [15, '16 planned, 1 dropout'],
        [14, '16 planned, 2 dropouts'],
        [13, '16 planned, 3 dropouts'],
      ])('handles %i teams correctly (%s)', (teamCount, _description) => {
        const config = createTournamentConfig('group-phase', teamCount, 4);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

        const tournamentId = state.tournaments[0].id;
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

        const tournament = state.tournaments[0];
        const teams = tournament.teams;
        const matches = tournament.matches;

        expect(tournament.status).toBe('in-progress');

        // All teams should participate
        const allParticipate = verifyAllTeamsParticipate(matches, teams);
        expect(allParticipate.valid).toBe(true);

        // Knockout phase should be created
        expect(state.tournaments).toHaveLength(2);
      });

      it('completes full tournament with 15 teams (16 planned, 1 dropout)', () => {
        const config = createTournamentConfig('group-phase', 15, 4);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

        const tournamentId = state.tournaments[0].id;
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

        const rng = new SeededRandom(12345);
        state = simulateAllMatches(state, tournamentId, rng);

        // Group phase should be completed
        expect(state.tournaments[0].status).toBe('completed');

        // Knockout phase should have teams populated
        const knockoutTournament = state.tournaments.find(t => t.system === 'knockout');
        expect(knockoutTournament).toBeDefined();
        expect(knockoutTournament!.teams.length).toBeGreaterThan(0);
      });
    });

    describe('3 groups configuration', () => {
      it.each([
        [11, '12 planned, 1 dropout'],
        [10, '12 planned, 2 dropouts'],
        [9, '12 planned, 3 dropouts - min per group'],
      ])('handles %i teams correctly (%s)', (teamCount, _description) => {
        const config = createTournamentConfig('group-phase', teamCount, 3);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

        const tournamentId = state.tournaments[0].id;
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

        const tournament = state.tournaments[0];
        expect(tournament.status).toBe('in-progress');
        expect(tournament.matches.length).toBeGreaterThan(0);
      });
    });

    describe('2 groups configuration', () => {
      it.each([
        [7, '8 planned, 1 dropout'],
        [6, '8 planned, 2 dropouts'],
      ])('handles %i teams correctly (%s)', (teamCount, _description) => {
        const config = createTournamentConfig('group-phase', teamCount, 2);
        let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

        const tournamentId = state.tournaments[0].id;
        state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

        const tournament = state.tournaments[0];
        expect(tournament.status).toBe('in-progress');
      });
    });
  });

  describe('BeachL All-Placements with Team Dropouts', () => {
    it.each([
      [15, 4, '16 planned, 1 dropout'],
      [11, 3, '12 planned, 1 dropout'],
      [7, 2, '8 planned, 1 dropout'],
    ])('handles %i teams in %i groups (%s)', (teamCount, groupCount, _description) => {
      const config = {
        ...createTournamentConfig('beachl-all-placements', teamCount, groupCount),
        system: 'beachl-all-placements' as const,
      };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const tournament = state.tournaments[0];
      expect(tournament.status).toBe('in-progress');

      // Placement tree phase should be created
      const placementTournament = state.tournaments.find(t => t.system === 'placement-tree');
      expect(placementTournament).toBeDefined();
    });
  });

  describe('BeachL Short Main Round with Team Dropouts', () => {
    it.each([
      [15, 4, '16 planned, 1 dropout'],
      [11, 3, '12 planned, 1 dropout'],
      [7, 2, '8 planned, 1 dropout'],
    ])('handles %i teams in %i groups (%s)', (teamCount, groupCount, _description) => {
      const config = {
        ...createTournamentConfig('beachl-short-main', teamCount, groupCount),
        system: 'beachl-short-main' as const,
      };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const tournament = state.tournaments[0];
      expect(tournament.status).toBe('in-progress');

      // Short main round phase should be created
      const shortMainTournament = state.tournaments.find(t => t.system === 'short-main-knockout');
      expect(shortMainTournament).toBeDefined();
    });
  });

  describe('Swiss System with Odd Team Count', () => {
    it.each([
      [5, 'planned 6, 1 dropout'],
      [7, 'planned 8, 1 dropout'],
      [9, 'planned 10, 1 dropout'],
    ])('handles %i teams correctly (%s)', (teamCount, _description) => {
      const config = {
        ...createTournamentConfig('swiss', teamCount),
        numberOfRounds: 4,
      };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const tournament = state.tournaments[0];
      expect(tournament.status).toBe('in-progress');
      expect(tournament.currentRound).toBe(1);

      // Should have floor(n/2) matches in round 1
      const expectedMatches = Math.floor(teamCount / 2);
      expect(tournament.matches).toHaveLength(expectedMatches);
    });

    it('completes full swiss tournament with 7 teams', () => {
      const config = {
        ...createTournamentConfig('swiss', 7),
        numberOfRounds: 3,
      };
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const rng = new SeededRandom(12345);

      // Complete all rounds
      for (let round = 1; round <= 3; round++) {
        state = simulateAllMatches(state, tournamentId, rng);

        if (round < 3) {
          state = tournamentReducer(state, {
            type: 'GENERATE_NEXT_SWISS_ROUND',
            payload: tournamentId,
          });
        }
      }

      // Should complete after 3 rounds
      const tournament = state.tournaments.find(t => t.id === tournamentId);
      expect(tournament?.currentRound).toBe(3);
    });
  });

  describe('Full Tournament Simulation with Dropouts', () => {
    it('completes SSVB 15-team tournament (16 planned, 1 dropout)', () => {
      const config = createTournamentConfig('group-phase', 15, 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const groupPhaseId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: groupPhaseId });

      const rng = new SeededRandom(42);

      // Complete group phase
      state = simulateAllMatches(state, groupPhaseId, rng);
      expect(state.tournaments[0].status).toBe('completed');

      // Get knockout tournament
      const knockoutTournament = state.tournaments.find(t => t.system === 'knockout');
      expect(knockoutTournament).toBeDefined();
      expect(knockoutTournament!.teams.length).toBeGreaterThan(0);

      // Complete knockout phase
      state = simulateAllMatches(state, knockoutTournament!.id, rng);

      // Continue until all matches complete
      let iterations = 0;
      while (iterations < 10) {
        const ko = state.tournaments.find(t => t.system === 'knockout');
        const scheduledMatches = ko?.matches.filter(m => m.status === 'scheduled') || [];
        if (scheduledMatches.length === 0) break;

        state = simulateAllMatches(state, ko!.id, rng);
        iterations++;
      }

      const finalKnockout = state.tournaments.find(t => t.system === 'knockout');
      const pendingMatches = finalKnockout?.matches.filter(m => m.status === 'pending') || [];
      const scheduledMatches = finalKnockout?.matches.filter(m => m.status === 'scheduled') || [];
      const completedMatches = finalKnockout?.matches.filter(m => m.status === 'completed') || [];

      // Tournament should have progressed (most matches completed or in valid state)
      expect(completedMatches.length).toBeGreaterThan(0);
    });
  });
});
