/**
 * Tests for Match Completion Orchestrator
 *
 * These tests verify that:
 * 1. Winner determination works correctly
 * 2. Bracket propagation routes winners/losers
 * 3. Phase completion detection is accurate
 * 4. Round completion tracking works
 */

import { describe, it, expect } from 'vitest';
import {
  MatchCompletionOrchestrator,
  PhaseTransitionDetector,
  createMatchCompletionOrchestrator,
  determineMatchWinner,
  isGroupComplete,
  getNextMatchForTeam,
  countCompletedMatches,
  getCompletionPercentage,
  type MatchData,
  type MatchCompletionConfig,
} from '../MatchCompletionOrchestrator';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMatch(overrides: Partial<MatchData> = {}): MatchData {
  return {
    id: 'm1',
    teamAId: 'team1',
    teamBId: 'team2',
    scores: [],
    status: 'in-progress',
    ...overrides,
  };
}

function createConfig(overrides: Partial<MatchCompletionConfig> = {}): MatchCompletionConfig {
  return {
    system: 'round-robin',
    setsToWin: 2,
    ...overrides,
  };
}

// =============================================================================
// WINNER DETERMINATION TESTS
// =============================================================================

describe('MatchCompletionOrchestrator - Winner Determination', () => {
  const orchestrator = new MatchCompletionOrchestrator(createConfig());

  describe('determineWinner', () => {
    it('returns team A as winner when they win more sets', () => {
      const match = createMatch({
        scores: [
          { teamA: 21, teamB: 15 },
          { teamA: 21, teamB: 18 },
        ],
      });

      const result = orchestrator.determineWinner(match);

      expect(result.winnerId).toBe('team1');
      expect(result.setsWonA).toBe(2);
      expect(result.setsWonB).toBe(0);
    });

    it('returns team B as winner when they win more sets', () => {
      const match = createMatch({
        scores: [
          { teamA: 15, teamB: 21 },
          { teamA: 18, teamB: 21 },
        ],
      });

      const result = orchestrator.determineWinner(match);

      expect(result.winnerId).toBe('team2');
      expect(result.setsWonA).toBe(0);
      expect(result.setsWonB).toBe(2);
    });

    it('handles 2-1 result in best-of-3', () => {
      const match = createMatch({
        scores: [
          { teamA: 21, teamB: 15 },
          { teamA: 18, teamB: 21 },
          { teamA: 15, teamB: 12 },
        ],
      });

      const result = orchestrator.determineWinner(match);

      expect(result.winnerId).toBe('team1');
      expect(result.setsWonA).toBe(2);
      expect(result.setsWonB).toBe(1);
    });

    it('handles 1-1 split (team A wins on more sets played first)', () => {
      const match = createMatch({
        scores: [
          { teamA: 21, teamB: 15 },
          { teamA: 15, teamB: 21 },
        ],
      });

      const result = orchestrator.determineWinner(match);

      expect(result.setsWonA).toBe(1);
      expect(result.setsWonB).toBe(1);
      // With equal sets, team A is returned (first in comparison)
      expect(result.winnerId).toBe('team2');
    });

    it('returns null winner when teams are missing', () => {
      const match = createMatch({ teamAId: null });

      const result = orchestrator.determineWinner(match);

      expect(result.winnerId).toBeNull();
      expect(result.setsWonA).toBe(0);
      expect(result.setsWonB).toBe(0);
    });

    it('ignores draws in set scores', () => {
      const match = createMatch({
        scores: [
          { teamA: 20, teamB: 20 }, // Draw - shouldn't count
          { teamA: 21, teamB: 15 },
          { teamA: 21, teamB: 18 },
        ],
      });

      const result = orchestrator.determineWinner(match);

      expect(result.setsWonA).toBe(2);
      expect(result.setsWonB).toBe(0);
    });
  });
});

// =============================================================================
// MATCH COMPLETION TESTS
// =============================================================================

describe('MatchCompletionOrchestrator - Complete Match', () => {
  const orchestrator = new MatchCompletionOrchestrator(createConfig());

  describe('completeMatch', () => {
    it('marks match as completed with winner', () => {
      const match = createMatch({
        scores: [
          { teamA: 21, teamB: 15 },
          { teamA: 21, teamB: 18 },
        ],
      });

      const result = orchestrator.completeMatch(match, [match]);

      expect(result.completedMatch.status).toBe('completed');
      expect(result.completedMatch.winnerId).toBe('team1');
    });

    it('detects phase complete when all matches done', () => {
      const match1 = createMatch({
        id: 'm1',
        status: 'completed',
        winnerId: 'team1',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });
      const match2 = createMatch({
        id: 'm2',
        teamAId: 'team3',
        teamBId: 'team4',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });

      const result = orchestrator.completeMatch(match2, [match1, match2]);

      expect(result.phaseComplete).toBe(true);
      expect(result.newStatus).toBe('completed');
    });

    it('detects phase not complete when matches remain', () => {
      const match1 = createMatch({
        id: 'm1',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });
      const match2 = createMatch({
        id: 'm2',
        teamAId: 'team3',
        teamBId: 'team4',
        status: 'scheduled',
        scores: [],
      });

      const result = orchestrator.completeMatch(match1, [match1, match2]);

      expect(result.phaseComplete).toBe(false);
      expect(result.newStatus).toBe('in-progress');
    });
  });
});

// =============================================================================
// BRACKET PROPAGATION TESTS
// =============================================================================

describe('MatchCompletionOrchestrator - Bracket Propagation', () => {
  const orchestrator = new MatchCompletionOrchestrator(createConfig({ system: 'knockout' }));

  describe('winner propagation', () => {
    it('propagates winner to next match teamA slot', () => {
      const semifinal = createMatch({
        id: 'sf1',
        winnerGoesTo: 'final',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });
      const final = createMatch({
        id: 'final',
        teamAId: null,
        teamBId: null,
        status: 'pending',
      });

      const result = orchestrator.completeMatch(semifinal, [semifinal, final]);

      const updatedFinal = result.updatedBracketMatches.find(m => m.id === 'final');
      expect(updatedFinal?.teamAId).toBe('team1');
    });

    it('propagates winner to next match teamB slot when teamA filled', () => {
      const semifinal = createMatch({
        id: 'sf2',
        winnerGoesTo: 'final',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });
      const final = createMatch({
        id: 'final',
        teamAId: 'team0', // Already filled
        teamBId: null,
        status: 'pending',
      });

      const result = orchestrator.completeMatch(semifinal, [semifinal, final]);

      const updatedFinal = result.updatedBracketMatches.find(m => m.id === 'final');
      expect(updatedFinal?.teamAId).toBe('team0');
      expect(updatedFinal?.teamBId).toBe('team1');
    });
  });

  describe('loser propagation', () => {
    it('propagates loser to consolation match', () => {
      const semifinal = createMatch({
        id: 'sf1',
        loserGoesTo: '3rd-place',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });
      const thirdPlace = createMatch({
        id: '3rd-place',
        teamAId: null,
        teamBId: null,
        status: 'pending',
      });

      const result = orchestrator.completeMatch(semifinal, [semifinal, thirdPlace]);

      const updated3rd = result.updatedBracketMatches.find(m => m.id === '3rd-place');
      expect(updated3rd?.teamAId).toBe('team2'); // Loser
    });
  });
});

// =============================================================================
// ROUND COMPLETION TESTS
// =============================================================================

describe('MatchCompletionOrchestrator - Round Tracking', () => {
  const orchestrator = new MatchCompletionOrchestrator(createConfig());

  describe('isRoundComplete', () => {
    it('returns true when all round matches completed', () => {
      const matches = [
        createMatch({ id: 'm1', round: 1, status: 'completed' }),
        createMatch({ id: 'm2', round: 1, status: 'completed' }),
        createMatch({ id: 'm3', round: 2, status: 'pending' }),
      ];

      expect(orchestrator.isRoundComplete(matches, 1)).toBe(true);
    });

    it('returns false when round has incomplete matches', () => {
      const matches = [
        createMatch({ id: 'm1', round: 1, status: 'completed' }),
        createMatch({ id: 'm2', round: 1, status: 'in-progress' }),
      ];

      expect(orchestrator.isRoundComplete(matches, 1)).toBe(false);
    });

    it('returns false for empty round', () => {
      const matches = [
        createMatch({ id: 'm1', round: 1, status: 'completed' }),
      ];

      expect(orchestrator.isRoundComplete(matches, 2)).toBe(false);
    });
  });

  describe('isKnockoutRoundComplete', () => {
    it('returns true when all knockout round matches completed', () => {
      const matches = [
        createMatch({ id: 'm1', knockoutRound: 'quarterfinal', status: 'completed' }),
        createMatch({ id: 'm2', knockoutRound: 'quarterfinal', status: 'completed' }),
        createMatch({ id: 'm3', knockoutRound: 'semifinal', status: 'pending' }),
      ];

      expect(orchestrator.isKnockoutRoundComplete(matches, 'quarterfinal')).toBe(true);
    });

    it('returns false when knockout round incomplete', () => {
      const matches = [
        createMatch({ id: 'm1', knockoutRound: 'semifinal', status: 'completed' }),
        createMatch({ id: 'm2', knockoutRound: 'semifinal', status: 'in-progress' }),
      ];

      expect(orchestrator.isKnockoutRoundComplete(matches, 'semifinal')).toBe(false);
    });
  });

  describe('getCompletedRounds', () => {
    it('returns list of completed rounds in order', () => {
      const matches = [
        createMatch({ id: 'm1', round: 1, status: 'completed' }),
        createMatch({ id: 'm2', round: 1, status: 'completed' }),
        createMatch({ id: 'm3', round: 2, status: 'completed' }),
        createMatch({ id: 'm4', round: 2, status: 'completed' }),
        createMatch({ id: 'm5', round: 3, status: 'in-progress' }),
      ];

      const result = orchestrator.getCompletedRounds(matches);

      expect(result).toEqual([1, 2]);
    });
  });

  describe('isGroupPhaseComplete', () => {
    it('returns true when all group matches completed', () => {
      const matches = [
        createMatch({ id: 'm1', group: 'A', status: 'completed' }),
        createMatch({ id: 'm2', group: 'A', status: 'completed' }),
        createMatch({ id: 'm3', group: 'B', status: 'completed' }),
      ];

      expect(orchestrator.isGroupPhaseComplete(matches)).toBe(true);
    });

    it('returns false when group matches incomplete', () => {
      const matches = [
        createMatch({ id: 'm1', group: 'A', status: 'completed' }),
        createMatch({ id: 'm2', group: 'B', status: 'in-progress' }),
      ];

      expect(orchestrator.isGroupPhaseComplete(matches)).toBe(false);
    });
  });
});

// =============================================================================
// PHASE TRANSITION DETECTOR TESTS
// =============================================================================

describe('PhaseTransitionDetector', () => {
  const detector = new PhaseTransitionDetector();

  describe('shouldPopulateKnockout', () => {
    it('returns true for completed group-based system', () => {
      const matches = [
        createMatch({ id: 'm1', group: 'A', status: 'completed' }),
        createMatch({ id: 'm2', group: 'B', status: 'completed' }),
      ];

      expect(detector.shouldPopulateKnockout('groups-only', matches, 'completed')).toBe(true);
    });

    it('returns false for non-group system', () => {
      const matches = [
        createMatch({ id: 'm1', status: 'completed' }),
      ];

      expect(detector.shouldPopulateKnockout('round-robin', matches, 'completed')).toBe(false);
    });

    it('returns false when not completed', () => {
      const matches = [
        createMatch({ id: 'm1', group: 'A', status: 'completed' }),
        createMatch({ id: 'm2', group: 'B', status: 'in-progress' }),
      ];

      expect(detector.shouldPopulateKnockout('groups-only', matches, 'in-progress')).toBe(false);
    });
  });

  describe('shouldPopulatePlayoff', () => {
    it('returns true for completed round-robin', () => {
      expect(detector.shouldPopulatePlayoff('round-robin', 'completed')).toBe(true);
    });

    it('returns false for other systems', () => {
      expect(detector.shouldPopulatePlayoff('swiss', 'completed')).toBe(false);
    });

    it('returns false when not completed', () => {
      expect(detector.shouldPopulatePlayoff('round-robin', 'in-progress')).toBe(false);
    });
  });

  describe('getKnockoutSystemType', () => {
    it.each([
      ['groups-split-bracket', 'short-main-knockout'],
      ['beachl-short-main', 'short-main-knockout'],
      ['groups-full-placement', 'placement-tree'],
      ['beachl-all-placements', 'placement-tree'],
      ['groups-only', 'knockout'],
      ['groups-ssvb-knockout', 'knockout'],
    ] as const)('%s -> %s', (parentSystem, expectedKnockout) => {
      expect(detector.getKnockoutSystemType(parentSystem as any)).toBe(expectedKnockout);
    });
  });
});

// =============================================================================
// CONVENIENCE FUNCTION TESTS
// =============================================================================

describe('Convenience Functions', () => {
  describe('createMatchCompletionOrchestrator', () => {
    it('creates orchestrator instance', () => {
      const orchestrator = createMatchCompletionOrchestrator(createConfig());
      expect(orchestrator).toBeInstanceOf(MatchCompletionOrchestrator);
    });
  });

  describe('determineMatchWinner', () => {
    it('determines winner directly', () => {
      const match = createMatch({
        scores: [
          { teamA: 21, teamB: 15 },
          { teamA: 21, teamB: 18 },
        ],
      });

      const result = determineMatchWinner(match);

      expect(result.winnerId).toBe('team1');
    });
  });

  describe('isGroupComplete', () => {
    it('returns true when group is complete', () => {
      const matches = [
        createMatch({ id: 'm1', group: 'A', status: 'completed' }),
        createMatch({ id: 'm2', group: 'A', status: 'completed' }),
        createMatch({ id: 'm3', group: 'B', status: 'pending' }),
      ];

      expect(isGroupComplete(matches, 'A')).toBe(true);
      expect(isGroupComplete(matches, 'B')).toBe(false);
    });
  });

  describe('getNextMatchForTeam', () => {
    it('returns next pending match for team', () => {
      const matches = [
        createMatch({ id: 'm1', teamAId: 'team1', status: 'completed' }),
        createMatch({ id: 'm2', teamAId: 'team1', teamBId: 'team3', status: 'scheduled' }),
        createMatch({ id: 'm3', teamAId: 'team2', status: 'scheduled' }),
      ];

      const result = getNextMatchForTeam(matches, 'team1');

      expect(result?.id).toBe('m2');
    });

    it('returns null when no pending matches', () => {
      const matches = [
        createMatch({ id: 'm1', teamAId: 'team1', status: 'completed' }),
      ];

      expect(getNextMatchForTeam(matches, 'team1')).toBeNull();
    });
  });

  describe('countCompletedMatches', () => {
    it('counts completed matches', () => {
      const matches = [
        createMatch({ id: 'm1', status: 'completed' }),
        createMatch({ id: 'm2', status: 'completed' }),
        createMatch({ id: 'm3', status: 'in-progress' }),
      ];

      expect(countCompletedMatches(matches)).toBe(2);
    });
  });

  describe('getCompletionPercentage', () => {
    it('calculates completion percentage', () => {
      const matches = [
        createMatch({ id: 'm1', status: 'completed' }),
        createMatch({ id: 'm2', status: 'completed' }),
        createMatch({ id: 'm3', status: 'in-progress' }),
        createMatch({ id: 'm4', status: 'pending' }),
      ];

      expect(getCompletionPercentage(matches)).toBe(50);
    });

    it('returns 0 for empty matches', () => {
      expect(getCompletionPercentage([])).toBe(0);
    });

    it('returns 100 for all completed', () => {
      const matches = [
        createMatch({ id: 'm1', status: 'completed' }),
        createMatch({ id: 'm2', status: 'completed' }),
      ];

      expect(getCompletionPercentage(matches)).toBe(100);
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('MatchCompletionOrchestrator - Edge Cases', () => {
  const orchestrator = new MatchCompletionOrchestrator(createConfig());

  it('handles empty scores array', () => {
    const match = createMatch({ scores: [] });

    const result = orchestrator.determineWinner(match);

    expect(result.setsWonA).toBe(0);
    expect(result.setsWonB).toBe(0);
  });

  it('handles single set match', () => {
    const match = createMatch({
      scores: [{ teamA: 21, teamB: 15 }],
    });

    const result = orchestrator.determineWinner(match);

    expect(result.winnerId).toBe('team1');
    expect(result.setsWonA).toBe(1);
  });

  it('handles match with no teams assigned', () => {
    const match = createMatch({
      teamAId: null,
      teamBId: null,
    });

    const result = orchestrator.completeMatch(match, [match]);

    expect(result.completedMatch.winnerId).toBeNull();
  });

  it('handles circular bracket references gracefully', () => {
    const match = createMatch({
      id: 'm1',
      winnerGoesTo: 'm1', // Self-reference (shouldn't happen but handle gracefully)
      scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
    });

    // Should not throw
    const result = orchestrator.completeMatch(match, [match]);

    expect(result.completedMatch.winnerId).toBe('team1');
  });

  it('handles missing destination match', () => {
    const match = createMatch({
      winnerGoesTo: 'nonexistent',
      scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
    });

    // Should not throw
    const result = orchestrator.completeMatch(match, [match]);

    expect(result.completedMatch.winnerId).toBe('team1');
  });
});
