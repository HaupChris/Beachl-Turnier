/**
 * Tests for Match Type Definitions and Type Guards
 *
 * These tests verify that:
 * 1. Type guards correctly identify each match type
 * 2. Factory functions create valid matches
 * 3. Utility functions work correctly
 * 4. Type narrowing works with discriminated unions
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  type Match,
  type StandardMatch,
  type KnockoutMatch,
  type PlacementMatch,
  type MultiBracketMatch,
  type SetScore,
  // Type guards
  isStandardMatch,
  isKnockoutMatch,
  isPlacementMatch,
  isMultiBracketMatch,
  hasDependencies,
  isMatchReady,
  isPlayoffMatch,
  isThirdPlaceMatch,
  // Factory functions
  createStandardMatch,
  createKnockoutMatch,
  createPlacementMatch,
  createMultiBracketMatch,
  // Utility functions
  getMatchTypeLabel,
  calculateWinner,
} from '../match';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createTestScores = (teamAWins: number, teamBWins: number): SetScore[] => {
  const scores: SetScore[] = [];
  for (let i = 0; i < teamAWins; i++) {
    scores.push({ teamA: 21, teamB: 15 });
  }
  for (let i = 0; i < teamBWins; i++) {
    scores.push({ teamA: 15, teamB: 21 });
  }
  return scores;
};

const STANDARD_MATCH: StandardMatch = {
  id: 'match-1',
  type: 'standard',
  round: 1,
  matchNumber: 1,
  teamAId: 'team-1',
  teamBId: 'team-2',
  courtNumber: 1,
  scores: [],
  winnerId: null,
  status: 'scheduled',
};

const KNOCKOUT_MATCH: KnockoutMatch = {
  id: 'match-2',
  type: 'knockout',
  round: 1,
  matchNumber: 1,
  teamAId: 'team-1',
  teamBId: 'team-2',
  courtNumber: 1,
  scores: [],
  winnerId: null,
  status: 'pending',
  knockoutRound: 'quarterfinal',
  bracketPosition: 1,
};

const PLACEMENT_MATCH: PlacementMatch = {
  id: 'match-3',
  type: 'placement',
  round: 1,
  matchNumber: 1,
  teamAId: 'team-1',
  teamBId: 'team-2',
  courtNumber: 1,
  scores: [],
  winnerId: null,
  status: 'pending',
  placementRound: 'placement-round-1',
  placementInterval: { start: 1, end: 8 },
  winnerInterval: { start: 1, end: 4 },
  loserInterval: { start: 5, end: 8 },
  bracketPosition: 1,
};

const MULTIBRACKET_MATCH: MultiBracketMatch = {
  id: 'match-4',
  type: 'multibracket',
  round: 1,
  matchNumber: 1,
  teamAId: 'team-1',
  teamBId: 'team-2',
  courtNumber: 1,
  scores: [],
  winnerId: null,
  status: 'pending',
  bracket: 'main',
  bracketRound: 'top-quarterfinal',
  bracketPosition: 1,
};

const ALL_MATCHES: Match[] = [
  STANDARD_MATCH,
  KNOCKOUT_MATCH,
  PLACEMENT_MATCH,
  MULTIBRACKET_MATCH,
];

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('Match Type Guards', () => {
  describe('isStandardMatch', () => {
    it('returns TRUE for standard match', () => {
      expect(isStandardMatch(STANDARD_MATCH)).toBe(true);
    });

    it('returns FALSE for knockout match', () => {
      expect(isStandardMatch(KNOCKOUT_MATCH)).toBe(false);
    });

    it('returns FALSE for placement match', () => {
      expect(isStandardMatch(PLACEMENT_MATCH)).toBe(false);
    });

    it('returns FALSE for multibracket match', () => {
      expect(isStandardMatch(MULTIBRACKET_MATCH)).toBe(false);
    });
  });

  describe('isKnockoutMatch', () => {
    it('returns TRUE for knockout match', () => {
      expect(isKnockoutMatch(KNOCKOUT_MATCH)).toBe(true);
    });

    it('returns FALSE for standard match', () => {
      expect(isKnockoutMatch(STANDARD_MATCH)).toBe(false);
    });
  });

  describe('isPlacementMatch', () => {
    it('returns TRUE for placement match', () => {
      expect(isPlacementMatch(PLACEMENT_MATCH)).toBe(true);
    });

    it('returns FALSE for knockout match', () => {
      expect(isPlacementMatch(KNOCKOUT_MATCH)).toBe(false);
    });
  });

  describe('isMultiBracketMatch', () => {
    it('returns TRUE for multibracket match', () => {
      expect(isMultiBracketMatch(MULTIBRACKET_MATCH)).toBe(true);
    });

    it('returns FALSE for standard match', () => {
      expect(isMultiBracketMatch(STANDARD_MATCH)).toBe(false);
    });
  });

  describe('Type narrowing with TypeScript', () => {
    it('narrows StandardMatch type correctly', () => {
      const match: Match = STANDARD_MATCH;

      if (isStandardMatch(match)) {
        // TypeScript should allow accessing groupId (optional on StandardMatch)
        const groupId = match.groupId;
        expect(groupId).toBeUndefined();
      }
    });

    it('narrows KnockoutMatch type correctly', () => {
      const match: Match = KNOCKOUT_MATCH;

      if (isKnockoutMatch(match)) {
        // TypeScript should allow accessing knockoutRound
        expect(match.knockoutRound).toBe('quarterfinal');
      }
    });

    it('narrows PlacementMatch type correctly', () => {
      const match: Match = PLACEMENT_MATCH;

      if (isPlacementMatch(match)) {
        // TypeScript should allow accessing placementInterval
        expect(match.placementInterval.start).toBe(1);
        expect(match.placementInterval.end).toBe(8);
      }
    });
  });
});

// =============================================================================
// DEPENDENCY AND READINESS TESTS
// =============================================================================

describe('Match Dependency Checks', () => {
  describe('hasDependencies', () => {
    it('standard match → never has dependencies', () => {
      expect(hasDependencies(STANDARD_MATCH)).toBe(false);
    });

    it('knockout match without dependsOn → no dependencies', () => {
      expect(hasDependencies(KNOCKOUT_MATCH)).toBe(false);
    });

    it('knockout match WITH dependsOn → has dependencies', () => {
      const matchWithDeps: KnockoutMatch = {
        ...KNOCKOUT_MATCH,
        dependsOn: {
          teamA: { matchId: 'prev-1', result: 'winner' },
          teamB: { matchId: 'prev-2', result: 'winner' },
        },
      };
      expect(hasDependencies(matchWithDeps)).toBe(true);
    });

    it('placement match with dependsOn → has dependencies', () => {
      const matchWithDeps: PlacementMatch = {
        ...PLACEMENT_MATCH,
        dependsOn: {
          teamA: { matchId: 'prev-1', result: 'winner' },
        },
      };
      expect(hasDependencies(matchWithDeps)).toBe(true);
    });
  });

  describe('isMatchReady', () => {
    it('match with both teams → ready', () => {
      expect(isMatchReady(STANDARD_MATCH)).toBe(true);
    });

    it('match with teamAId = null → NOT ready', () => {
      const match: Match = { ...STANDARD_MATCH, teamAId: null };
      expect(isMatchReady(match)).toBe(false);
    });

    it('match with teamBId = null → NOT ready', () => {
      const match: Match = { ...STANDARD_MATCH, teamBId: null };
      expect(isMatchReady(match)).toBe(false);
    });

    it('completed match → NOT ready (already played)', () => {
      const match: Match = { ...STANDARD_MATCH, status: 'completed' };
      expect(isMatchReady(match)).toBe(false);
    });
  });
});

// =============================================================================
// PLAYOFF/FINALS DETECTION TESTS
// =============================================================================

describe('Playoff Match Detection', () => {
  describe('isPlayoffMatch', () => {
    it('standard match with isPlayoff=true → is playoff', () => {
      const match: StandardMatch = { ...STANDARD_MATCH, isPlayoff: true };
      expect(isPlayoffMatch(match)).toBe(true);
    });

    it('standard match without isPlayoff → NOT playoff', () => {
      expect(isPlayoffMatch(STANDARD_MATCH)).toBe(false);
    });

    it('knockout semifinal → is playoff', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'semifinal' };
      expect(isPlayoffMatch(match)).toBe(true);
    });

    it('knockout final → is playoff', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'final' };
      expect(isPlayoffMatch(match)).toBe(true);
    });

    it('knockout third-place → is playoff', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'third-place' };
      expect(isPlayoffMatch(match)).toBe(true);
    });

    it('knockout intermediate round → NOT playoff', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'intermediate' };
      expect(isPlayoffMatch(match)).toBe(false);
    });

    it('placement final → is playoff', () => {
      const match: PlacementMatch = {
        ...PLACEMENT_MATCH,
        placementRound: 'placement-final',
      };
      expect(isPlayoffMatch(match)).toBe(true);
    });

    it('multibracket top-final → is playoff', () => {
      const match: MultiBracketMatch = {
        ...MULTIBRACKET_MATCH,
        bracketRound: 'top-final',
      };
      expect(isPlayoffMatch(match)).toBe(true);
    });
  });

  describe('isThirdPlaceMatch', () => {
    it('knockout third-place → is third place match', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'third-place' };
      expect(isThirdPlaceMatch(match)).toBe(true);
    });

    it('knockout final → NOT third place match', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'final' };
      expect(isThirdPlaceMatch(match)).toBe(false);
    });

    it('placement final for places 3-4 → is third place match', () => {
      const match: PlacementMatch = {
        ...PLACEMENT_MATCH,
        placementRound: 'placement-final',
        placementInterval: { start: 3, end: 4 },
      };
      expect(isThirdPlaceMatch(match)).toBe(true);
    });

    it('placement final for places 1-2 → NOT third place match', () => {
      const match: PlacementMatch = {
        ...PLACEMENT_MATCH,
        placementRound: 'placement-final',
        placementInterval: { start: 1, end: 2 },
      };
      expect(isThirdPlaceMatch(match)).toBe(false);
    });
  });
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe('Match Factory Functions', () => {
  describe('createStandardMatch', () => {
    it('creates match with type = "standard"', () => {
      const match = createStandardMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        courtNumber: 1,
      });

      expect(match.type).toBe('standard');
      expect(isStandardMatch(match)).toBe(true);
    });

    it('sets default status to "scheduled"', () => {
      const match = createStandardMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        courtNumber: 1,
      });

      expect(match.status).toBe('scheduled');
    });

    it('sets default empty scores', () => {
      const match = createStandardMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        courtNumber: 1,
      });

      expect(match.scores).toEqual([]);
    });

    it('allows overriding defaults', () => {
      const match = createStandardMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        courtNumber: 1,
        status: 'completed',
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: 'team-1',
      });

      expect(match.status).toBe('completed');
      expect(match.scores).toHaveLength(1);
      expect(match.winnerId).toBe('team-1');
    });

    it('supports optional groupId for group phase', () => {
      const match = createStandardMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        courtNumber: 1,
        groupId: 'group-A',
      });

      expect(match.groupId).toBe('group-A');
    });
  });

  describe('createKnockoutMatch', () => {
    it('creates match with type = "knockout"', () => {
      const match = createKnockoutMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        knockoutRound: 'quarterfinal',
        bracketPosition: 1,
      });

      expect(match.type).toBe('knockout');
      expect(isKnockoutMatch(match)).toBe(true);
    });

    it('sets default status to "pending"', () => {
      const match = createKnockoutMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        knockoutRound: 'semifinal',
        bracketPosition: 1,
      });

      expect(match.status).toBe('pending');
    });

    it('supports dependencies', () => {
      const match = createKnockoutMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        knockoutRound: 'semifinal',
        bracketPosition: 1,
        dependsOn: {
          teamA: { matchId: 'qf-1', result: 'winner' },
          teamB: { matchId: 'qf-2', result: 'winner' },
        },
        teamAPlaceholder: 'Sieger VF1',
        teamBPlaceholder: 'Sieger VF2',
      });

      expect(match.dependsOn).toBeDefined();
      expect(match.teamAPlaceholder).toBe('Sieger VF1');
    });
  });

  describe('createPlacementMatch', () => {
    it('creates match with type = "placement"', () => {
      const match = createPlacementMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        placementRound: 'placement-round-1',
        placementInterval: { start: 1, end: 16 },
        winnerInterval: { start: 1, end: 8 },
        loserInterval: { start: 9, end: 16 },
        bracketPosition: 1,
      });

      expect(match.type).toBe('placement');
      expect(isPlacementMatch(match)).toBe(true);
    });

    it('includes placement intervals', () => {
      const match = createPlacementMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        courtNumber: 1,
        placementRound: 'placement-round-1',
        placementInterval: { start: 1, end: 8 },
        winnerInterval: { start: 1, end: 4 },
        loserInterval: { start: 5, end: 8 },
        bracketPosition: 1,
      });

      expect(match.placementInterval).toEqual({ start: 1, end: 8 });
      expect(match.winnerInterval).toEqual({ start: 1, end: 4 });
      expect(match.loserInterval).toEqual({ start: 5, end: 8 });
    });
  });

  describe('createMultiBracketMatch', () => {
    it('creates match with type = "multibracket"', () => {
      const match = createMultiBracketMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        bracket: 'main',
        bracketRound: 'top-semifinal',
        bracketPosition: 1,
      });

      expect(match.type).toBe('multibracket');
      expect(isMultiBracketMatch(match)).toBe(true);
    });

    it('supports different brackets', () => {
      const placements58 = createMultiBracketMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        bracket: 'placement-5-8',
        bracketRound: 'placement-5-8',
        bracketPosition: 1,
      });

      expect(placements58.bracket).toBe('placement-5-8');
    });
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Match Utility Functions', () => {
  describe('getMatchTypeLabel', () => {
    it('standard match without flags → "Rundenspiel"', () => {
      expect(getMatchTypeLabel(STANDARD_MATCH)).toBe('Rundenspiel');
    });

    it('standard match with groupId → "Gruppenspiel"', () => {
      const match: StandardMatch = { ...STANDARD_MATCH, groupId: 'group-A' };
      expect(getMatchTypeLabel(match)).toBe('Gruppenspiel');
    });

    it('standard match with isPlayoff → "Platzierungsspiel"', () => {
      const match: StandardMatch = { ...STANDARD_MATCH, isPlayoff: true };
      expect(getMatchTypeLabel(match)).toBe('Platzierungsspiel');
    });

    it('knockout quarterfinal → "Viertelfinale"', () => {
      expect(getMatchTypeLabel(KNOCKOUT_MATCH)).toBe('Viertelfinale');
    });

    it('knockout final → "Finale"', () => {
      const match: KnockoutMatch = { ...KNOCKOUT_MATCH, knockoutRound: 'final' };
      expect(getMatchTypeLabel(match)).toBe('Finale');
    });

    it('placement final → "Platz 1/2"', () => {
      const match: PlacementMatch = {
        ...PLACEMENT_MATCH,
        placementRound: 'placement-final',
        placementInterval: { start: 1, end: 2 },
      };
      expect(getMatchTypeLabel(match)).toBe('Platz 1/2');
    });

    it('placement round → shows interval', () => {
      const match: PlacementMatch = {
        ...PLACEMENT_MATCH,
        placementRound: 'placement-round-1',
        placementInterval: { start: 1, end: 8 },
      };
      expect(getMatchTypeLabel(match)).toBe('Platzierungsrunde (1-8)');
    });
  });

  describe('calculateWinner', () => {
    it('team A wins 2-0 → returns teamAId', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(2, 0),
      };
      expect(calculateWinner(match)).toBe('team-1');
    });

    it('team B wins 2-0 → returns teamBId', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(0, 2),
      };
      expect(calculateWinner(match)).toBe('team-2');
    });

    it('team A wins 2-1 → returns teamAId', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(2, 1),
      };
      expect(calculateWinner(match)).toBe('team-1');
    });

    it('team B wins 2-1 → returns teamBId', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(1, 2),
      };
      expect(calculateWinner(match)).toBe('team-2');
    });

    it('1-1 (incomplete) → returns null', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(1, 1),
      };
      expect(calculateWinner(match)).toBeNull();
    });

    it('no sets played → returns null', () => {
      expect(calculateWinner(STANDARD_MATCH)).toBeNull();
    });

    it('custom requiredSets: team A wins 3-0 (best of 5) → returns teamAId', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(3, 0),
      };
      expect(calculateWinner(match, 3)).toBe('team-1');
    });

    it('custom requiredSets: 2-0 but need 3 → returns null', () => {
      const match: StandardMatch = {
        ...STANDARD_MATCH,
        scores: createTestScores(2, 0),
      };
      expect(calculateWinner(match, 3)).toBeNull();
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  describe('Matches with null teams', () => {
    it('knockout match can have null teamIds (pending population)', () => {
      const match = createKnockoutMatch({
        id: 'test-1',
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        courtNumber: null,
        knockoutRound: 'semifinal',
        bracketPosition: 1,
        dependsOn: {
          teamA: { matchId: 'qf-1', result: 'winner' },
          teamB: { matchId: 'qf-2', result: 'winner' },
        },
      });

      expect(match.teamAId).toBeNull();
      expect(match.teamBId).toBeNull();
      expect(isMatchReady(match)).toBe(false);
    });
  });

  describe('All match types in array', () => {
    it('can filter matches by type', () => {
      const standardMatches = ALL_MATCHES.filter(isStandardMatch);
      const knockoutMatches = ALL_MATCHES.filter(isKnockoutMatch);
      const placementMatches = ALL_MATCHES.filter(isPlacementMatch);
      const multiBracketMatches = ALL_MATCHES.filter(isMultiBracketMatch);

      expect(standardMatches).toHaveLength(1);
      expect(knockoutMatches).toHaveLength(1);
      expect(placementMatches).toHaveLength(1);
      expect(multiBracketMatches).toHaveLength(1);
    });
  });
});
