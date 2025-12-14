import { describe, it, expect } from 'vitest';
import { tournamentReducer } from '../tournamentReducer';
import type { TournamentState } from '../tournamentActions';
import type { TournamentSystem } from '../../types/tournament';

// Initial empty state
const initialState: TournamentState = {
  tournaments: [],
  containers: [],
  currentTournamentId: null,
};

// Helper to create tournament config
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

// Helper to create group phase config
function createGroupPhaseConfig(numberOfGroups: number) {
  return {
    numberOfGroups,
    teamsPerGroup: 4,
    seeding: 'snake' as const,
    groups: [],
  };
}

describe('tournamentReducer', () => {
  describe('CREATE_TOURNAMENT', () => {
    it('creates round-robin tournament', () => {
      const config = createTournamentConfig('round-robin', 8);
      const action: TournamentAction = { type: 'CREATE_TOURNAMENT', payload: config };

      const state = tournamentReducer(initialState, action);

      expect(state.tournaments).toHaveLength(1);
      expect(state.tournaments[0].system).toBe('round-robin');
      expect(state.tournaments[0].teams).toHaveLength(8);
      expect(state.tournaments[0].status).toBe('configuration');
    });

    it('creates swiss tournament', () => {
      const config = createTournamentConfig('swiss', 10, { numberOfRounds: 4 });
      const action: TournamentAction = { type: 'CREATE_TOURNAMENT', payload: config };

      const state = tournamentReducer(initialState, action);

      expect(state.tournaments[0].system).toBe('swiss');
      expect(state.tournaments[0].numberOfRounds).toBe(4);
    });

    it('creates group-phase tournament with groups', () => {
      const config = createTournamentConfig('group-phase', 16, {
        groupPhaseConfig: createGroupPhaseConfig(4),
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      const action: TournamentAction = { type: 'CREATE_TOURNAMENT', payload: config };

      const state = tournamentReducer(initialState, action);

      expect(state.tournaments[0].system).toBe('group-phase');
      expect(state.tournaments[0].groupPhaseConfig).toBeDefined();
      expect(state.tournaments[0].groupPhaseConfig?.groups).toHaveLength(4);
    });

    it('creates container for tournament', () => {
      const config = createTournamentConfig('round-robin', 6);
      const action: TournamentAction = { type: 'CREATE_TOURNAMENT', payload: config };

      const state = tournamentReducer(initialState, action);

      expect(state.containers).toHaveLength(1);
      expect(state.containers[0].phases).toHaveLength(1);
    });

    it('sets currentTournamentId to new tournament', () => {
      const config = createTournamentConfig('round-robin', 6);
      const action: TournamentAction = { type: 'CREATE_TOURNAMENT', payload: config };

      const state = tournamentReducer(initialState, action);

      expect(state.currentTournamentId).toBe(state.tournaments[0].id);
    });
  });

  describe('START_TOURNAMENT', () => {
    it('generates matches for round-robin', () => {
      // Create tournament
      const config = createTournamentConfig('round-robin', 6);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      // Start tournament
      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // 6 teams = 15 matches
      expect(state.tournaments[0].matches).toHaveLength(15);
      expect(state.tournaments[0].status).toBe('in-progress');
    });

    it('generates swiss round 1 matches', () => {
      const config = createTournamentConfig('swiss', 8, { numberOfRounds: 4 });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // 8 teams, round 1 = 4 matches
      expect(state.tournaments[0].matches).toHaveLength(4);
      expect(state.tournaments[0].currentRound).toBe(1);
    });

    it('generates group phase matches and knockout placeholder', () => {
      const config = createTournamentConfig('group-phase', 16, {
        groupPhaseConfig: createGroupPhaseConfig(4),
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // 4 groups * 6 matches = 24 matches
      expect(state.tournaments[0].matches).toHaveLength(24);
      expect(state.tournaments[0].groupStandings).toBeDefined();

      // Knockout phase created
      expect(state.tournaments).toHaveLength(2);
      expect(state.tournaments[1].system).toBe('knockout');
    });

    it('generates placement tree placeholder for beachl-all-placements', () => {
      const config = createTournamentConfig('beachl-all-placements', 16, {
        groupPhaseConfig: createGroupPhaseConfig(4),
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments).toHaveLength(2);
      expect(state.tournaments[1].system).toBe('placement-tree');
    });
  });

  describe('UPDATE_MATCH_SCORE', () => {
    it('updates match scores', () => {
      const config = createTournamentConfig('round-robin', 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const matchId = state.tournaments[0].matches[0].id;
      const scores = [{ teamA: 21, teamB: 15 }];

      state = tournamentReducer(state, {
        type: 'UPDATE_MATCH_SCORE',
        payload: { tournamentId, matchId, scores },
      });

      expect(state.tournaments[0].matches[0].scores).toEqual(scores);
      expect(state.tournaments[0].matches[0].status).toBe('in-progress');
    });
  });

  describe('COMPLETE_MATCH', () => {
    it('marks match as completed with winner', () => {
      const config = createTournamentConfig('round-robin', 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const matchId = state.tournaments[0].matches[0].id;
      const scores = [{ teamA: 21, teamB: 15 }];

      // Update score first
      state = tournamentReducer(state, {
        type: 'UPDATE_MATCH_SCORE',
        payload: { tournamentId, matchId, scores },
      });

      // Complete match
      state = tournamentReducer(state, {
        type: 'COMPLETE_MATCH',
        payload: { tournamentId, matchId },
      });

      const match = state.tournaments[0].matches.find(m => m.id === matchId);
      expect(match?.status).toBe('completed');
      expect(match?.winnerId).toBe(match?.teamAId); // TeamA won 21-15
    });

    it('updates standings after match completion', () => {
      const config = createTournamentConfig('round-robin', 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const matchId = state.tournaments[0].matches[0].id;
      const teamAId = state.tournaments[0].matches[0].teamAId;
      const scores = [{ teamA: 21, teamB: 15 }];

      state = tournamentReducer(state, {
        type: 'UPDATE_MATCH_SCORE',
        payload: { tournamentId, matchId, scores },
      });

      state = tournamentReducer(state, {
        type: 'COMPLETE_MATCH',
        payload: { tournamentId, matchId },
      });

      const winnerStanding = state.tournaments[0].standings.find(s => s.teamId === teamAId);
      expect(winnerStanding?.won).toBe(1);
      expect(winnerStanding?.played).toBe(1);
    });

    it('marks tournament as completed when all matches done', () => {
      const config = createTournamentConfig('round-robin', 2); // Only 1 match
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      const matchId = state.tournaments[0].matches[0].id;
      const scores = [{ teamA: 21, teamB: 15 }];

      state = tournamentReducer(state, {
        type: 'UPDATE_MATCH_SCORE',
        payload: { tournamentId, matchId, scores },
      });

      state = tournamentReducer(state, {
        type: 'COMPLETE_MATCH',
        payload: { tournamentId, matchId },
      });

      expect(state.tournaments[0].status).toBe('completed');
    });
  });

  describe('GENERATE_NEXT_SWISS_ROUND', () => {
    it('generates next round after completing current round', () => {
      const config = createTournamentConfig('swiss', 4, { numberOfRounds: 2 });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // Complete all round 1 matches
      for (const match of state.tournaments[0].matches) {
        state = tournamentReducer(state, {
          type: 'UPDATE_MATCH_SCORE',
          payload: { tournamentId, matchId: match.id, scores: [{ teamA: 21, teamB: 15 }] },
        });
        state = tournamentReducer(state, {
          type: 'COMPLETE_MATCH',
          payload: { tournamentId, matchId: match.id },
        });
      }

      // Generate next round
      state = tournamentReducer(state, { type: 'GENERATE_NEXT_SWISS_ROUND', payload: tournamentId });

      expect(state.tournaments[0].currentRound).toBe(2);
      expect(state.tournaments[0].matches.length).toBe(4); // 2 + 2 matches
    });
  });

  describe('RESET_TOURNAMENT', () => {
    it('resets tournament to configuration', () => {
      const config = createTournamentConfig('round-robin', 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // Reset
      state = tournamentReducer(state, { type: 'RESET_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments[0].status).toBe('configuration');
      expect(state.tournaments[0].matches).toHaveLength(0);
    });

    it('removes knockout phase when resetting group phase', () => {
      const config = createTournamentConfig('group-phase', 16, {
        groupPhaseConfig: createGroupPhaseConfig(4),
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments).toHaveLength(2);

      // Reset
      state = tournamentReducer(state, { type: 'RESET_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments).toHaveLength(1);
      expect(state.containers[0].phases).toHaveLength(1);
    });
  });

  describe('DELETE_TOURNAMENT', () => {
    it('deletes tournament and container', () => {
      const config = createTournamentConfig('round-robin', 4);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;

      state = tournamentReducer(state, { type: 'DELETE_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments).toHaveLength(0);
      expect(state.containers).toHaveLength(0);
    });

    it('deletes all phases in container', () => {
      const config = createTournamentConfig('group-phase', 16, {
        groupPhaseConfig: createGroupPhaseConfig(4),
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments).toHaveLength(2);

      // Delete (will delete both group phase and knockout)
      state = tournamentReducer(state, { type: 'DELETE_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments).toHaveLength(0);
      expect(state.containers).toHaveLength(0);
    });
  });

  describe('edge cases - team dropouts', () => {
    it('handles 15 teams in 4 groups (one team short)', () => {
      const config = createTournamentConfig('group-phase', 15, {
        groupPhaseConfig: {
          numberOfGroups: 4,
          teamsPerGroup: 4,
          seeding: 'snake' as const,
          groups: [],
        },
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // Should still work with 15 teams
      expect(state.tournaments[0].status).toBe('in-progress');
      expect(state.tournaments[0].matches.length).toBeGreaterThan(0);
    });

    it('handles 11 teams in 3 groups', () => {
      const config = createTournamentConfig('group-phase', 11, {
        groupPhaseConfig: {
          numberOfGroups: 3,
          teamsPerGroup: 4,
          seeding: 'snake' as const,
          groups: [],
        },
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      expect(state.tournaments[0].status).toBe('in-progress');
    });

    it('handles 7 teams in round-robin (odd count)', () => {
      const config = createTournamentConfig('round-robin', 7);
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // 7 teams = 21 matches
      expect(state.tournaments[0].matches).toHaveLength(21);
    });
  });

  describe('phase transitions', () => {
    it('populates knockout teams when group phase completes', () => {
      const config = createTournamentConfig('group-phase', 8, {
        groupPhaseConfig: createGroupPhaseConfig(2),
        knockoutSettings: {
          setsPerMatch: 1,
          pointsPerSet: 21,
          playThirdPlaceMatch: true,
          useReferees: false,
        },
      });
      let state = tournamentReducer(initialState, { type: 'CREATE_TOURNAMENT', payload: config });

      const tournamentId = state.tournaments[0].id;
      state = tournamentReducer(state, { type: 'START_TOURNAMENT', payload: tournamentId });

      // Complete all group phase matches
      for (const match of state.tournaments[0].matches) {
        state = tournamentReducer(state, {
          type: 'UPDATE_MATCH_SCORE',
          payload: { tournamentId, matchId: match.id, scores: [{ teamA: 21, teamB: 15 }] },
        });
        state = tournamentReducer(state, {
          type: 'COMPLETE_MATCH',
          payload: { tournamentId, matchId: match.id },
        });
      }

      // Group phase should be completed
      expect(state.tournaments[0].status).toBe('completed');

      // Knockout phase should have teams
      const knockoutTournament = state.tournaments.find(t => t.system === 'knockout');
      expect(knockoutTournament?.teams.length).toBeGreaterThan(0);
    });
  });
});
