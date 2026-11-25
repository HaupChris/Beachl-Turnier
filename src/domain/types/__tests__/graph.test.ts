/**
 * Tests for Graph-Based Bracket Types
 *
 * These tests verify that:
 * 1. TeamSlot type guards work correctly
 * 2. MatchNode utilities identify node properties
 * 3. Graph traversal functions work correctly
 * 4. Result propagation updates the correct nodes
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  type BracketGraph,
  // Team slot type guards
  isStaticSlot,
  isByeSlot,
  isDependentSlot,
  isPlaceholderSlot,
  isSlotResolved,
  // Match node utilities
  isNodeReady,
  isByeMatch,
  getTeamIdFromSlot,
  getSlotDisplayText,
  isFinalMatch,
  isThirdPlaceMatchNode,
  isConditionalMatch,
  // Factory functions
  createStaticSlot,
  createByeSlot,
  createDependentSlot,
  createPlaceholderSlot,
  createMatchEdge,
  createMatchNode,
  // Graph utilities
  findNodeById,
  getDependentMatches,
  getWinnerNextMatch,
  getLoserNextMatch,
  getRootMatches,
  getMatchesByRound,
  propagateResult,
} from '../graph';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const STATIC_SLOT = createStaticSlot('team-1');
const BYE_SLOT = createByeSlot();
const DEPENDENT_SLOT_WINNER = createDependentSlot('match-1', 'winner');
const DEPENDENT_SLOT_LOSER = createDependentSlot('match-1', 'loser');
const PLACEHOLDER_SLOT = createPlaceholderSlot('1. Platz Gruppe A');

/**
 * Create a simple 4-team single elimination bracket:
 *
 *   SF1: Team1 vs Team2  ──┐
 *                         ├── Final: Winner SF1 vs Winner SF2
 *   SF2: Team3 vs Team4  ──┘
 */
function createTestBracket(): BracketGraph {
  const sf1 = createMatchNode({
    id: 'sf-1',
    teamA: createStaticSlot('team-1'),
    teamB: createStaticSlot('team-2'),
    winnerGoesTo: createMatchEdge('final', 'A'),
    loserGoesTo: createMatchEdge('third-place', 'A'),
    round: 'semifinal',
    position: 1,
  });

  const sf2 = createMatchNode({
    id: 'sf-2',
    teamA: createStaticSlot('team-3'),
    teamB: createStaticSlot('team-4'),
    winnerGoesTo: createMatchEdge('final', 'B'),
    loserGoesTo: createMatchEdge('third-place', 'B'),
    round: 'semifinal',
    position: 2,
  });

  const final = createMatchNode({
    id: 'final',
    teamA: createDependentSlot('sf-1', 'winner'),
    teamB: createDependentSlot('sf-2', 'winner'),
    winnerGoesTo: null,
    loserGoesTo: null,
    round: 'final',
    position: 1,
    metadata: { isFinal: true },
  });

  const thirdPlace = createMatchNode({
    id: 'third-place',
    teamA: createDependentSlot('sf-1', 'loser'),
    teamB: createDependentSlot('sf-2', 'loser'),
    winnerGoesTo: null,
    loserGoesTo: null,
    round: 'third-place',
    position: 1,
    metadata: { isThirdPlace: true },
  });

  return {
    nodes: [sf1, sf2, final, thirdPlace],
    rootNodeIds: ['sf-1', 'sf-2'],
    finalNodeId: 'final',
    thirdPlaceNodeId: 'third-place',
    type: 'single-elimination',
    metadata: {
      teamCount: 4,
      totalRounds: 2,
    },
  };
}

// =============================================================================
// TEAM SLOT TYPE GUARD TESTS
// =============================================================================

describe('TeamSlot Type Guards', () => {
  describe('isStaticSlot', () => {
    it('returns TRUE for static slot', () => {
      expect(isStaticSlot(STATIC_SLOT)).toBe(true);
    });

    it('returns FALSE for bye slot', () => {
      expect(isStaticSlot(BYE_SLOT)).toBe(false);
    });

    it('returns FALSE for dependent slot', () => {
      expect(isStaticSlot(DEPENDENT_SLOT_WINNER)).toBe(false);
    });

    it('returns FALSE for placeholder slot', () => {
      expect(isStaticSlot(PLACEHOLDER_SLOT)).toBe(false);
    });
  });

  describe('isByeSlot', () => {
    it('returns TRUE for bye slot', () => {
      expect(isByeSlot(BYE_SLOT)).toBe(true);
    });

    it('returns FALSE for static slot', () => {
      expect(isByeSlot(STATIC_SLOT)).toBe(false);
    });
  });

  describe('isDependentSlot', () => {
    it('returns TRUE for dependent slot (winner)', () => {
      expect(isDependentSlot(DEPENDENT_SLOT_WINNER)).toBe(true);
    });

    it('returns TRUE for dependent slot (loser)', () => {
      expect(isDependentSlot(DEPENDENT_SLOT_LOSER)).toBe(true);
    });

    it('returns FALSE for static slot', () => {
      expect(isDependentSlot(STATIC_SLOT)).toBe(false);
    });
  });

  describe('isPlaceholderSlot', () => {
    it('returns TRUE for placeholder slot', () => {
      expect(isPlaceholderSlot(PLACEHOLDER_SLOT)).toBe(true);
    });

    it('returns FALSE for static slot', () => {
      expect(isPlaceholderSlot(STATIC_SLOT)).toBe(false);
    });
  });

  describe('isSlotResolved', () => {
    it('static slot → resolved (team is known)', () => {
      expect(isSlotResolved(STATIC_SLOT)).toBe(true);
    });

    it('bye slot → resolved (no opponent needed)', () => {
      expect(isSlotResolved(BYE_SLOT)).toBe(true);
    });

    it('dependent slot → NOT resolved (waiting for result)', () => {
      expect(isSlotResolved(DEPENDENT_SLOT_WINNER)).toBe(false);
    });

    it('placeholder slot → NOT resolved (team not determined)', () => {
      expect(isSlotResolved(PLACEHOLDER_SLOT)).toBe(false);
    });
  });
});

// =============================================================================
// SLOT UTILITY TESTS
// =============================================================================

describe('Slot Utilities', () => {
  describe('getTeamIdFromSlot', () => {
    it('static slot → returns team ID', () => {
      expect(getTeamIdFromSlot(STATIC_SLOT)).toBe('team-1');
    });

    it('bye slot → returns null', () => {
      expect(getTeamIdFromSlot(BYE_SLOT)).toBeNull();
    });

    it('dependent slot → returns null', () => {
      expect(getTeamIdFromSlot(DEPENDENT_SLOT_WINNER)).toBeNull();
    });

    it('placeholder slot → returns null', () => {
      expect(getTeamIdFromSlot(PLACEHOLDER_SLOT)).toBeNull();
    });
  });

  describe('getSlotDisplayText', () => {
    it('static slot with team name → returns team name', () => {
      expect(getSlotDisplayText(STATIC_SLOT, 'The Eagles')).toBe('The Eagles');
    });

    it('static slot without team name → returns team ID', () => {
      expect(getSlotDisplayText(STATIC_SLOT)).toBe('team-1');
    });

    it('bye slot → returns "Freilos"', () => {
      expect(getSlotDisplayText(BYE_SLOT)).toBe('Freilos');
    });

    it('dependent slot (winner) → returns "Sieger {matchId}"', () => {
      expect(getSlotDisplayText(DEPENDENT_SLOT_WINNER)).toBe('Sieger match-1');
    });

    it('dependent slot (loser) → returns "Verlierer {matchId}"', () => {
      expect(getSlotDisplayText(DEPENDENT_SLOT_LOSER)).toBe('Verlierer match-1');
    });

    it('placeholder slot → returns description', () => {
      expect(getSlotDisplayText(PLACEHOLDER_SLOT)).toBe('1. Platz Gruppe A');
    });
  });
});

// =============================================================================
// MATCH NODE UTILITY TESTS
// =============================================================================

describe('MatchNode Utilities', () => {
  describe('isNodeReady', () => {
    it('both teams static → ready', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });
      expect(isNodeReady(node)).toBe(true);
    });

    it('one team dependent → NOT ready', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createDependentSlot('prev', 'winner'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });
      expect(isNodeReady(node)).toBe(false);
    });

    it('completed match → NOT ready', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
        status: 'completed',
      });
      expect(isNodeReady(node)).toBe(false);
    });

    it('one team bye + one static → ready', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createByeSlot(),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });
      expect(isNodeReady(node)).toBe(true);
    });
  });

  describe('isByeMatch', () => {
    it('team A is bye → TRUE', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createByeSlot(),
        teamB: createStaticSlot('team-1'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });
      expect(isByeMatch(node)).toBe(true);
    });

    it('team B is bye → TRUE', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createByeSlot(),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });
      expect(isByeMatch(node)).toBe(true);
    });

    it('no byes → FALSE', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });
      expect(isByeMatch(node)).toBe(false);
    });
  });

  describe('isFinalMatch', () => {
    it('metadata.isFinal = true → TRUE', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: 'final',
        position: 1,
        metadata: { isFinal: true },
      });
      expect(isFinalMatch(node)).toBe(true);
    });

    it('no winnerGoesTo + has loserGoesTo → TRUE (implicit final)', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: createMatchEdge('third-place', 'A'),
        round: 'final',
        position: 1,
      });
      expect(isFinalMatch(node)).toBe(true);
    });
  });

  describe('isThirdPlaceMatchNode', () => {
    it('metadata.isThirdPlace = true → TRUE', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: 'third-place',
        position: 1,
        metadata: { isThirdPlace: true },
      });
      expect(isThirdPlaceMatchNode(node)).toBe(true);
    });
  });

  describe('isConditionalMatch', () => {
    it('metadata.isConditional = true → TRUE', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: 'reset',
        position: 1,
        metadata: {
          isConditional: true,
          condition: { matchId: 'grand-final', requiredWinner: 'teamB' },
        },
      });
      expect(isConditionalMatch(node)).toBe(true);
    });
  });
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe('Factory Functions', () => {
  describe('createMatchNode', () => {
    it('creates node with default values', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
      });

      expect(node.status).toBe('pending');
      expect(node.scores).toEqual([]);
      expect(node.winnerId).toBeNull();
    });

    it('allows overriding defaults', () => {
      const node = createMatchNode({
        id: 'test',
        teamA: createStaticSlot('team-1'),
        teamB: createStaticSlot('team-2'),
        winnerGoesTo: null,
        loserGoesTo: null,
        round: '1',
        position: 1,
        status: 'completed',
        winnerId: 'team-1',
        scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
      });

      expect(node.status).toBe('completed');
      expect(node.winnerId).toBe('team-1');
      expect(node.scores).toHaveLength(2);
    });
  });

  describe('createMatchEdge', () => {
    it('creates edge with correct properties', () => {
      const edge = createMatchEdge('final', 'A');
      expect(edge.matchId).toBe('final');
      expect(edge.slot).toBe('A');
    });
  });

  describe('createPlaceholderSlot', () => {
    it('creates placeholder with description only', () => {
      const slot = createPlaceholderSlot('Winner of Group A');
      expect(slot.type).toBe('placeholder');
      expect(slot.description).toBe('Winner of Group A');
      expect(slot.source).toBeUndefined();
    });

    it('creates placeholder with source', () => {
      const slot = createPlaceholderSlot('1. Platz Gruppe A', {
        type: 'group',
        groupIndex: 0,
        rank: 1,
      });
      expect(slot.source).toEqual({ type: 'group', groupIndex: 0, rank: 1 });
    });
  });
});

// =============================================================================
// GRAPH TRAVERSAL TESTS
// =============================================================================

describe('Graph Traversal', () => {
  describe('findNodeById', () => {
    it('finds existing node', () => {
      const graph = createTestBracket();
      const node = findNodeById(graph, 'sf-1');
      expect(node).toBeDefined();
      expect(node?.id).toBe('sf-1');
    });

    it('returns undefined for non-existent node', () => {
      const graph = createTestBracket();
      expect(findNodeById(graph, 'non-existent')).toBeUndefined();
    });
  });

  describe('getDependentMatches', () => {
    it('finds matches that depend on sf-1', () => {
      const graph = createTestBracket();
      const dependents = getDependentMatches(graph, 'sf-1');

      expect(dependents).toHaveLength(2);
      expect(dependents.map(n => n.id).sort()).toEqual(['final', 'third-place']);
    });

    it('returns empty array for final (nothing depends on it)', () => {
      const graph = createTestBracket();
      const dependents = getDependentMatches(graph, 'final');
      expect(dependents).toHaveLength(0);
    });
  });

  describe('getWinnerNextMatch', () => {
    it('sf-1 winner goes to final', () => {
      const graph = createTestBracket();
      const nextMatch = getWinnerNextMatch(graph, 'sf-1');
      expect(nextMatch?.id).toBe('final');
    });

    it('final has no next match for winner', () => {
      const graph = createTestBracket();
      const nextMatch = getWinnerNextMatch(graph, 'final');
      expect(nextMatch).toBeUndefined();
    });
  });

  describe('getLoserNextMatch', () => {
    it('sf-1 loser goes to third-place match', () => {
      const graph = createTestBracket();
      const nextMatch = getLoserNextMatch(graph, 'sf-1');
      expect(nextMatch?.id).toBe('third-place');
    });

    it('third-place match has no loser destination', () => {
      const graph = createTestBracket();
      const nextMatch = getLoserNextMatch(graph, 'third-place');
      expect(nextMatch).toBeUndefined();
    });
  });

  describe('getRootMatches', () => {
    it('returns first round matches', () => {
      const graph = createTestBracket();
      const roots = getRootMatches(graph);

      expect(roots).toHaveLength(2);
      expect(roots.map(n => n.id).sort()).toEqual(['sf-1', 'sf-2']);
    });
  });

  describe('getMatchesByRound', () => {
    it('groups matches by round correctly', () => {
      const graph = createTestBracket();
      const byRound = getMatchesByRound(graph);

      expect(byRound.get('semifinal')).toHaveLength(2);
      expect(byRound.get('final')).toHaveLength(1);
      expect(byRound.get('third-place')).toHaveLength(1);
    });
  });
});

// =============================================================================
// RESULT PROPAGATION TESTS
// =============================================================================

describe('Result Propagation', () => {
  describe('propagateResult', () => {
    it('propagates winner to winnerGoesTo match', () => {
      const graph = createTestBracket();

      const updated = propagateResult(graph, 'sf-1', 'team-1', 'team-2');

      // Should update final (winner) and third-place (loser)
      expect(updated).toHaveLength(2);

      const final = findNodeById(graph, 'final');
      expect(isStaticSlot(final!.teamA)).toBe(true);
      expect((final!.teamA as { teamId: string }).teamId).toBe('team-1');
    });

    it('propagates loser to loserGoesTo match', () => {
      const graph = createTestBracket();

      propagateResult(graph, 'sf-1', 'team-1', 'team-2');

      const thirdPlace = findNodeById(graph, 'third-place');
      expect(isStaticSlot(thirdPlace!.teamA)).toBe(true);
      expect((thirdPlace!.teamA as { teamId: string }).teamId).toBe('team-2');
    });

    it('returns empty array for non-existent match', () => {
      const graph = createTestBracket();
      const updated = propagateResult(graph, 'non-existent', 'team-1', 'team-2');
      expect(updated).toHaveLength(0);
    });

    it('handles match with no next matches', () => {
      const graph = createTestBracket();

      // Complete sf-1 and sf-2 first
      propagateResult(graph, 'sf-1', 'team-1', 'team-2');
      propagateResult(graph, 'sf-2', 'team-3', 'team-4');

      // Now complete the final
      const updated = propagateResult(graph, 'final', 'team-1', 'team-3');

      // Final has no next matches, so nothing to propagate
      expect(updated).toHaveLength(0);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Full Bracket Flow', () => {
  it('can simulate a complete 4-team tournament', () => {
    const graph = createTestBracket();

    // Initially: SF1 and SF2 are ready, final and 3rd place are not
    expect(isNodeReady(findNodeById(graph, 'sf-1')!)).toBe(true);
    expect(isNodeReady(findNodeById(graph, 'sf-2')!)).toBe(true);
    expect(isNodeReady(findNodeById(graph, 'final')!)).toBe(false);
    expect(isNodeReady(findNodeById(graph, 'third-place')!)).toBe(false);

    // SF1: Team 1 beats Team 2
    propagateResult(graph, 'sf-1', 'team-1', 'team-2');

    // Still waiting for SF2
    expect(isNodeReady(findNodeById(graph, 'final')!)).toBe(false);

    // SF2: Team 4 beats Team 3
    propagateResult(graph, 'sf-2', 'team-4', 'team-3');

    // Now final and 3rd place are ready
    expect(isNodeReady(findNodeById(graph, 'final')!)).toBe(true);
    expect(isNodeReady(findNodeById(graph, 'third-place')!)).toBe(true);

    // Verify final matchup
    const final = findNodeById(graph, 'final')!;
    expect(getTeamIdFromSlot(final.teamA)).toBe('team-1');
    expect(getTeamIdFromSlot(final.teamB)).toBe('team-4');

    // Verify 3rd place matchup
    const thirdPlace = findNodeById(graph, 'third-place')!;
    expect(getTeamIdFromSlot(thirdPlace.teamA)).toBe('team-2');
    expect(getTeamIdFromSlot(thirdPlace.teamB)).toBe('team-3');
  });
});
