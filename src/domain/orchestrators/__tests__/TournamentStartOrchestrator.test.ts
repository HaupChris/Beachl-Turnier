/**
 * Tests for Tournament Start Orchestrator
 *
 * These tests verify that:
 * 1. Match generation works for all systems
 * 2. Standings initialization is correct
 * 3. Knockout phase placeholders are created properly
 * 4. Swiss round generation works
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TournamentStartOrchestrator,
  SwissRoundOrchestrator,
  createTournamentStartOrchestrator,
  createSwissRoundOrchestrator,
  calculateRoundRobinMatchCount,
  calculateRoundRobinRoundCount,
  calculateGroupPhaseMatchCount,
  type TournamentStartConfig,
  type TeamData,
  type GroupPhaseConfig,
  type InitialStanding,
} from '../TournamentStartOrchestrator';

// =============================================================================
// TEST FIXTURES
// =============================================================================

let idCounter = 0;
const mockIdGenerator = () => `id-${++idCounter}`;

function createTeams(count: number): TeamData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

function createGroupConfig(teamCount: number, groupCount: number): GroupPhaseConfig {
  const teamsPerGroup = Math.ceil(teamCount / groupCount);
  const teams = createTeams(teamCount);
  const groups = [];

  for (let g = 0; g < groupCount; g++) {
    const start = g * teamsPerGroup;
    const end = Math.min(start + teamsPerGroup, teamCount);
    groups.push({
      id: String.fromCharCode(65 + g), // A, B, C, D
      name: `Group ${String.fromCharCode(65 + g)}`,
      teamIds: teams.slice(start, end).map(t => t.id),
    });
  }

  return {
    numberOfGroups: groupCount,
    teamsPerGroup,
    groups,
  };
}

function createConfig(overrides: Partial<TournamentStartConfig> = {}): TournamentStartConfig {
  return {
    id: 'tournament1',
    system: 'round-robin',
    teams: createTeams(4),
    numberOfCourts: 2,
    ...overrides,
  };
}

beforeEach(() => {
  idCounter = 0;
});

// =============================================================================
// ROUND-ROBIN TESTS
// =============================================================================

describe('TournamentStartOrchestrator - Round Robin', () => {
  const orchestrator = new TournamentStartOrchestrator(mockIdGenerator);

  describe('match generation', () => {
    it('generates correct number of matches for 4 teams', () => {
      const config = createConfig({ teams: createTeams(4) });

      const result = orchestrator.start(config);

      // 4 teams = 6 matches (4*3/2)
      expect(result.matches.length).toBe(6);
    });

    it('generates correct number of matches for 6 teams', () => {
      const config = createConfig({ teams: createTeams(6) });

      const result = orchestrator.start(config);

      // 6 teams = 15 matches
      expect(result.matches.length).toBe(15);
    });

    it('handles odd number of teams with bye', () => {
      const config = createConfig({ teams: createTeams(5) });

      const result = orchestrator.start(config);

      // 5 teams = 10 matches (each team has 4 opponents)
      expect(result.matches.length).toBe(10);

      // No BYE in any match
      expect(result.matches.every(m => m.teamAId !== 'BYE' && m.teamBId !== 'BYE')).toBe(true);
    });

    it('assigns courts to matches', () => {
      const config = createConfig({ teams: createTeams(4), numberOfCourts: 2 });

      const result = orchestrator.start(config);

      // All matches should have court 1 or 2
      expect(result.matches.every(m => m.court === 1 || m.court === 2)).toBe(true);
    });

    it('assigns rounds to matches', () => {
      const config = createConfig({ teams: createTeams(4) });

      const result = orchestrator.start(config);

      // 4 teams = 3 rounds
      const rounds = new Set(result.matches.map(m => m.round));
      expect(rounds.size).toBe(3);
    });

    it('each team plays every other team exactly once', () => {
      const teams = createTeams(6);
      const config = createConfig({ teams });

      const result = orchestrator.start(config);

      // Check each team appears in correct number of matches
      for (const team of teams) {
        const teamMatches = result.matches.filter(
          m => m.teamAId === team.id || m.teamBId === team.id
        );
        expect(teamMatches.length).toBe(teams.length - 1);
      }
    });
  });

  describe('standings initialization', () => {
    it('initializes standings for all teams', () => {
      const teams = createTeams(4);
      const config = createConfig({ teams });

      const result = orchestrator.start(config);

      expect(result.standings.length).toBe(4);
      expect(result.standings.every(s => s.played === 0 && s.points === 0)).toBe(true);
    });
  });
});

// =============================================================================
// SWISS TESTS
// =============================================================================

describe('TournamentStartOrchestrator - Swiss', () => {
  const orchestrator = new TournamentStartOrchestrator(mockIdGenerator);

  describe('round 1 generation', () => {
    it('pairs top seeds with bottom seeds', () => {
      const teams = createTeams(8);
      const config = createConfig({
        system: 'swiss',
        teams,
      });

      const result = orchestrator.start(config);

      // 8 teams = 4 matches in round 1
      expect(result.matches.length).toBe(4);
      expect(result.currentRound).toBe(1);
    });

    it('handles odd number of teams', () => {
      const teams = createTeams(7);
      const config = createConfig({
        system: 'swiss',
        teams,
      });

      const result = orchestrator.start(config);

      // 7 teams = 3 matches (one bye)
      expect(result.matches.length).toBe(3);
    });

    it('initializes standings', () => {
      const teams = createTeams(8);
      const config = createConfig({
        system: 'swiss',
        teams,
      });

      const result = orchestrator.start(config);

      expect(result.standings.length).toBe(8);
    });
  });
});

// =============================================================================
// GROUP PHASE TESTS
// =============================================================================

describe('TournamentStartOrchestrator - Group Phase', () => {
  const orchestrator = new TournamentStartOrchestrator(mockIdGenerator);

  describe('match generation', () => {
    it('generates matches for each group', () => {
      const groupConfig = createGroupConfig(8, 2); // 2 groups of 4
      const config = createConfig({
        system: 'groups-only',
        teams: createTeams(8),
        groupPhaseConfig: groupConfig,
      });

      const result = orchestrator.start(config);

      // 2 groups of 4 = 2 * 6 = 12 matches
      expect(result.matches.length).toBe(12);
    });

    it('assigns group to each match', () => {
      const groupConfig = createGroupConfig(8, 2);
      const config = createConfig({
        system: 'groups-only',
        teams: createTeams(8),
        groupPhaseConfig: groupConfig,
      });

      const result = orchestrator.start(config);

      const groupA = result.matches.filter(m => m.group === 'A');
      const groupB = result.matches.filter(m => m.group === 'B');

      expect(groupA.length).toBe(6);
      expect(groupB.length).toBe(6);
    });
  });

  describe('group standings initialization', () => {
    it('initializes group standings for all teams', () => {
      const groupConfig = createGroupConfig(12, 3);
      const config = createConfig({
        system: 'groups-full-placement',
        teams: createTeams(12),
        groupPhaseConfig: groupConfig,
      });

      const result = orchestrator.start(config);

      expect(result.groupStandings.length).toBe(12);
      expect(result.groupStandings.filter(s => s.groupId === 'A').length).toBe(4);
      expect(result.groupStandings.filter(s => s.groupId === 'B').length).toBe(4);
      expect(result.groupStandings.filter(s => s.groupId === 'C').length).toBe(4);
    });
  });
});

// =============================================================================
// KNOCKOUT PHASE PLACEHOLDER TESTS
// =============================================================================

describe('TournamentStartOrchestrator - Knockout Phase', () => {
  const orchestrator = new TournamentStartOrchestrator(mockIdGenerator);

  describe('placeholder creation', () => {
    it('creates knockout placeholder for group-based system', () => {
      const groupConfig = createGroupConfig(12, 3);
      const config = createConfig({
        system: 'groups-ssvb-knockout',
        teams: createTeams(12),
        groupPhaseConfig: groupConfig,
        knockoutSettings: { useReferees: true },
      });

      const result = orchestrator.start(config);

      expect(result.knockoutPhase).toBeDefined();
      expect(result.knockoutPhase?.system).toBe('knockout');
      expect(result.knockoutPhase?.phaseName).toBe('K.O.-Phase');
    });

    it('creates placement-tree for groups-full-placement', () => {
      const groupConfig = createGroupConfig(16, 4);
      const config = createConfig({
        system: 'groups-full-placement',
        teams: createTeams(16),
        groupPhaseConfig: groupConfig,
        knockoutSettings: {},
      });

      const result = orchestrator.start(config);

      expect(result.knockoutPhase?.system).toBe('placement-tree');
      expect(result.knockoutPhase?.phaseName).toBe('Platzierungsbaum');
    });

    it('creates short-main-knockout for groups-split-bracket', () => {
      const groupConfig = createGroupConfig(16, 4);
      const config = createConfig({
        system: 'groups-split-bracket',
        teams: createTeams(16),
        groupPhaseConfig: groupConfig,
        knockoutSettings: {},
      });

      const result = orchestrator.start(config);

      expect(result.knockoutPhase?.system).toBe('short-main-knockout');
      expect(result.knockoutPhase?.phaseName).toBe('Hauptrunde');
    });

    it('creates playoff for round-robin with knockoutSettings', () => {
      const config = createConfig({
        system: 'round-robin',
        teams: createTeams(6),
        knockoutSettings: {},
      });

      const result = orchestrator.start(config);

      expect(result.knockoutPhase?.system).toBe('playoff');
      expect(result.knockoutPhase?.phaseName).toBe('Finale');
    });

    it('does not create knockout phase without knockoutSettings', () => {
      const groupConfig = createGroupConfig(8, 2);
      const config = createConfig({
        system: 'groups-only',
        teams: createTeams(8),
        groupPhaseConfig: groupConfig,
        // No knockoutSettings
      });

      const result = orchestrator.start(config);

      expect(result.knockoutPhase).toBeUndefined();
    });
  });
});

// =============================================================================
// SWISS ROUND ORCHESTRATOR TESTS
// =============================================================================

describe('SwissRoundOrchestrator', () => {
  const orchestrator = new SwissRoundOrchestrator(mockIdGenerator);

  describe('generateNextRound', () => {
    it('pairs teams with similar points', () => {
      const standings: InitialStanding[] = [
        { teamId: 't1', points: 3, played: 1, won: 1, lost: 0, setsWon: 2, setsLost: 0, pointsWon: 42, pointsLost: 30 },
        { teamId: 't2', points: 3, played: 1, won: 1, lost: 0, setsWon: 2, setsLost: 0, pointsWon: 42, pointsLost: 30 },
        { teamId: 't3', points: 0, played: 1, won: 0, lost: 1, setsWon: 0, setsLost: 2, pointsWon: 30, pointsLost: 42 },
        { teamId: 't4', points: 0, played: 1, won: 0, lost: 1, setsWon: 0, setsLost: 2, pointsWon: 30, pointsLost: 42 },
      ];
      const previousMatches = [
        { id: 'm1', teamAId: 't1', teamBId: 't3', status: 'completed' as const, round: 1 },
        { id: 'm2', teamAId: 't2', teamBId: 't4', status: 'completed' as const, round: 1 },
      ];

      const result = orchestrator.generateNextRound(standings, previousMatches as any, 2, 2);

      expect(result.length).toBe(2);
      // Top teams should play each other
      expect(result.some(m =>
        (m.teamAId === 't1' && m.teamBId === 't2') ||
        (m.teamAId === 't2' && m.teamBId === 't1')
      )).toBe(true);
    });

    it('avoids rematches from previous rounds', () => {
      const standings: InitialStanding[] = [
        { teamId: 't1', points: 3, played: 1, won: 1, lost: 0, setsWon: 2, setsLost: 0, pointsWon: 42, pointsLost: 30 },
        { teamId: 't2', points: 0, played: 1, won: 0, lost: 1, setsWon: 0, setsLost: 2, pointsWon: 30, pointsLost: 42 },
      ];
      const previousMatches = [
        { id: 'm1', teamAId: 't1', teamBId: 't2', status: 'completed' as const, round: 1 },
      ];

      const result = orchestrator.generateNextRound(standings, previousMatches as any, 2, 1);

      // Can't pair t1 with t2 again
      expect(result.length).toBe(0);
    });

    it('assigns round number and courts', () => {
      const standings: InitialStanding[] = [
        { teamId: 't1', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
        { teamId: 't2', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
        { teamId: 't3', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
        { teamId: 't4', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
      ];

      const result = orchestrator.generateNextRound(standings, [], 3, 2);

      expect(result.every(m => m.round === 3)).toBe(true);
      expect(result.every(m => m.court === 1 || m.court === 2)).toBe(true);
    });
  });

  describe('canGenerateMoreRounds', () => {
    it('returns true when valid pairings exist', () => {
      const standings: InitialStanding[] = [
        { teamId: 't1', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
        { teamId: 't2', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
      ];

      expect(orchestrator.canGenerateMoreRounds(standings, [], 1, 5)).toBe(true);
    });

    it('returns false when max rounds reached', () => {
      const standings: InitialStanding[] = [
        { teamId: 't1', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
        { teamId: 't2', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
      ];

      expect(orchestrator.canGenerateMoreRounds(standings, [], 5, 5)).toBe(false);
    });

    it('returns false when all pairings exhausted', () => {
      const standings: InitialStanding[] = [
        { teamId: 't1', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
        { teamId: 't2', points: 0, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 },
      ];
      const previousMatches = [
        { id: 'm1', teamAId: 't1', teamBId: 't2', status: 'completed' as const, round: 1 },
      ];

      expect(orchestrator.canGenerateMoreRounds(standings, previousMatches as any, 1, 5)).toBe(false);
    });
  });
});

// =============================================================================
// CONVENIENCE FUNCTION TESTS
// =============================================================================

describe('Convenience Functions', () => {
  describe('createTournamentStartOrchestrator', () => {
    it('creates orchestrator instance', () => {
      const orchestrator = createTournamentStartOrchestrator();
      expect(orchestrator).toBeInstanceOf(TournamentStartOrchestrator);
    });

    it('accepts custom id generator', () => {
      const customGenerator = vi.fn(() => 'custom-id');
      const orchestrator = createTournamentStartOrchestrator(customGenerator);
      const result = orchestrator.start(createConfig({ teams: createTeams(2) }));

      expect(customGenerator).toHaveBeenCalled();
      expect(result.matches[0].id).toBe('custom-id');
    });
  });

  describe('createSwissRoundOrchestrator', () => {
    it('creates orchestrator instance', () => {
      const orchestrator = createSwissRoundOrchestrator();
      expect(orchestrator).toBeInstanceOf(SwissRoundOrchestrator);
    });
  });

  describe('calculateRoundRobinMatchCount', () => {
    it.each([
      [2, 1],
      [3, 3],
      [4, 6],
      [5, 10],
      [6, 15],
      [8, 28],
    ])('%d teams -> %d matches', (teamCount, expectedMatches) => {
      expect(calculateRoundRobinMatchCount(teamCount)).toBe(expectedMatches);
    });
  });

  describe('calculateRoundRobinRoundCount', () => {
    it.each([
      [2, 1],
      [3, 3],
      [4, 3],
      [5, 5],
      [6, 5],
      [8, 7],
    ])('%d teams -> %d rounds', (teamCount, expectedRounds) => {
      expect(calculateRoundRobinRoundCount(teamCount)).toBe(expectedRounds);
    });
  });

  describe('calculateGroupPhaseMatchCount', () => {
    it('calculates total matches for all groups', () => {
      const groups = [
        { id: 'A', name: 'A', teamIds: ['t1', 't2', 't3', 't4'] }, // 6 matches
        { id: 'B', name: 'B', teamIds: ['t5', 't6', 't7'] }, // 3 matches
      ];

      expect(calculateGroupPhaseMatchCount(groups)).toBe(9);
    });

    it('handles empty groups', () => {
      expect(calculateGroupPhaseMatchCount([])).toBe(0);
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('TournamentStartOrchestrator - Edge Cases', () => {
  const orchestrator = new TournamentStartOrchestrator(mockIdGenerator);

  it('handles 2 teams', () => {
    const config = createConfig({ teams: createTeams(2) });

    const result = orchestrator.start(config);

    expect(result.matches.length).toBe(1);
  });

  it('handles 1 team (no matches)', () => {
    const config = createConfig({ teams: createTeams(1) });

    const result = orchestrator.start(config);

    expect(result.matches.length).toBe(0);
  });

  it('handles 0 teams', () => {
    const config = createConfig({ teams: [] });

    const result = orchestrator.start(config);

    expect(result.matches.length).toBe(0);
    expect(result.standings.length).toBe(0);
  });

  it('handles single court', () => {
    const config = createConfig({
      teams: createTeams(6),
      numberOfCourts: 1,
    });

    const result = orchestrator.start(config);

    expect(result.matches.every(m => m.court === 1)).toBe(true);
  });

  it('handles many courts (more than teams)', () => {
    const config = createConfig({
      teams: createTeams(4),
      numberOfCourts: 10,
    });

    const result = orchestrator.start(config);

    // Courts should cycle 1-6 (matches per round)
    const courts = new Set(result.matches.map(m => m.court));
    expect(courts.size).toBeLessThanOrEqual(6);
  });

  it('sets status to in-progress', () => {
    const config = createConfig();

    const result = orchestrator.start(config);

    expect(result.status).toBe('in-progress');
  });
});
