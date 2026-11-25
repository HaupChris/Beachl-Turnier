/**
 * Tests for SSVB Knockout Generator (Mode 3C)
 *
 * These tests verify that:
 * 1. Group 4ths are eliminated before knockout
 * 2. Intermediate round has correct cross-group pairings
 * 3. QF losers are eliminated (no consolation)
 * 4. Only 3rd place match exists as consolation
 *
 * @see docs/tournament-modes-specification.md Section 3C
 */

import { describe, it, expect } from 'vitest';
import {
  SSVBKnockoutGenerator,
  validateSSVBKnockoutConfig,
  getEliminatedTeams,
  type SSVBKnockoutConfig,
  type SSVBBracketMatch,
  type SSVBGenerationResult,
} from '../SSVBKnockoutGenerator';
import type { GroupStanding } from '../SplitBracketGenerator';

// =============================================================================
// TEST HELPERS
// =============================================================================

function create4GroupStandings(): GroupStanding[] {
  const standings: GroupStanding[] = [];
  const groups = ['A', 'B', 'C', 'D'];

  for (const group of groups) {
    for (let pos = 1; pos <= 4; pos++) {
      standings.push({
        groupId: group,
        position: pos,
        teamId: `${group}${pos}`,
      });
    }
  }

  return standings;
}

function defaultConfig(numberOfGroups: number): SSVBKnockoutConfig {
  return {
    courts: 4,
    numberOfGroups,
    teamsPerGroup: 4,
  };
}

// =============================================================================
// GENERATOR TESTS
// =============================================================================

describe('SSVBKnockoutGenerator', () => {
  const generator = new SSVBKnockoutGenerator();

  describe('name', () => {
    it('has correct name', () => {
      expect(generator.name).toBe('ssvb-knockout');
    });
  });

  describe('elimination of group 4ths', () => {
    it('eliminates all group 4ths', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(
        standings,
        defaultConfig(4)
      ) as SSVBGenerationResult;

      expect(result.eliminatedTeams).toHaveLength(4);

      const eliminatedIds = result.eliminatedTeams.map((e) => e.teamId);
      expect(eliminatedIds).toContain('A4');
      expect(eliminatedIds).toContain('B4');
      expect(eliminatedIds).toContain('C4');
      expect(eliminatedIds).toContain('D4');
    });

    it('group 4ths have shared placement 13-16', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(
        standings,
        defaultConfig(4)
      ) as SSVBGenerationResult;

      for (const eliminated of result.eliminatedTeams) {
        expect(eliminated.reason).toBe('group-4th');
        expect(eliminated.sharedPlacement.start).toBe(13);
        expect(eliminated.sharedPlacement.end).toBe(16);
      }
    });

    it('group 4ths do not appear in any match', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(
        standings,
        defaultConfig(4)
      );

      const allTeamIds = new Set<string>();
      for (const match of result.matches) {
        if (match.teamAId) allTeamIds.add(match.teamAId);
        if (match.teamBId) allTeamIds.add(match.teamBId);
      }

      expect(allTeamIds.has('A4')).toBe(false);
      expect(allTeamIds.has('B4')).toBe(false);
      expect(allTeamIds.has('C4')).toBe(false);
      expect(allTeamIds.has('D4')).toBe(false);
    });
  });

  describe('intermediate round', () => {
    it('creates correct IR pairings for 4 groups', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const irMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'intermediate'
      );

      expect(irMatches).toHaveLength(4);

      // A2-D3, B2-C3, C2-B3, D2-A3
      const expectedPairings = [
        ['A2', 'D3'],
        ['B2', 'C3'],
        ['C2', 'B3'],
        ['D2', 'A3'],
      ];

      for (let i = 0; i < 4; i++) {
        expect(irMatches[i].teamAId).toBe(expectedPairings[i][0]);
        expect(irMatches[i].teamBId).toBe(expectedPairings[i][1]);
      }
    });

    it('IR losers have no routing (eliminated)', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const irMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'intermediate'
      );

      for (const match of irMatches) {
        expect(match.loserGoesTo).toBeNull();
        expect(match.loserInterval).toBeNull();
      }
    });

    it('IR winners advance to quarterfinals', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const irMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'intermediate'
      );

      for (const match of irMatches) {
        expect(match.winnerGoesTo).not.toBeNull();
      }
    });
  });

  describe('quarterfinals', () => {
    it('group winners have static team slots', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const qfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'quarterfinal'
      );

      expect(qfMatches).toHaveLength(4);

      const groupWinners = new Set(['A1', 'B1', 'C1', 'D1']);
      for (const match of qfMatches) {
        expect(groupWinners.has(match.teamAId!)).toBe(true);
      }
    });

    it('QF losers have no routing (eliminated)', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const qfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'quarterfinal'
      );

      for (const match of qfMatches) {
        expect(match.loserGoesTo).toBeNull();
        expect(match.loserInterval).toBeNull();
      }
    });

    it('QF winners advance to semifinals', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const qfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'quarterfinal'
      );

      for (const match of qfMatches) {
        expect(match.winnerGoesTo).not.toBeNull();
      }
    });
  });

  describe('semifinals', () => {
    it('creates 2 semifinal matches', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const sfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'semifinal'
      );

      expect(sfMatches).toHaveLength(2);
    });

    it('SF winners go to final', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const sfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'semifinal'
      );

      const final = (result.matches as SSVBBracketMatch[]).find(
        (m) => m.stage === 'final'
      );

      for (const match of sfMatches) {
        expect(match.winnerGoesTo?.matchId).toBe(final?.id);
      }
    });

    it('SF losers go to 3rd place match', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const sfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'semifinal'
      );

      const thirdPlace = (result.matches as SSVBBracketMatch[]).find(
        (m) => m.stage === '3rd-place'
      );

      for (const match of sfMatches) {
        expect(match.loserGoesTo?.matchId).toBe(thirdPlace?.id);
      }
    });
  });

  describe('finals', () => {
    it('creates final for 1st/2nd place', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const final = (result.matches as SSVBBracketMatch[]).find(
        (m) => m.playoffForPlace === 1
      );

      expect(final).toBeDefined();
      expect(final?.stage).toBe('final');
    });

    it('creates 3rd place match', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const thirdPlace = (result.matches as SSVBBracketMatch[]).find(
        (m) => m.playoffForPlace === 3
      );

      expect(thirdPlace).toBeDefined();
      expect(thirdPlace?.stage).toBe('3rd-place');
    });

    it('only 3rd place match exists as consolation', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      // Check for absence of other placement matches
      const placementMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.playoffForPlace !== undefined && m.playoffForPlace > 4
      );

      // SSVB format: no 5th, 7th, 9th, 11th place matches
      expect(placementMatches).toHaveLength(0);
    });
  });

  describe('total match count', () => {
    it('generates 12 matches for 16 teams (4 groups)', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      // IR: 4, QF: 4, SF: 2, Final: 1, 3rd: 1 = 12
      expect(result.totalMatches).toBe(12);
    });
  });

  describe('no consolation except 3rd place', () => {
    it('IR losers are eliminated, not in further matches', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const irMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'intermediate'
      );

      // IR losers should not be in any match dependencies
      const dependencyMatchIds = new Set<string>();
      for (const match of result.matches) {
        if (match.dependsOn?.teamA?.matchId) {
          if (match.dependsOn.teamA.result === 'loser') {
            dependencyMatchIds.add(match.dependsOn.teamA.matchId);
          }
        }
        if (match.dependsOn?.teamB?.matchId) {
          if (match.dependsOn.teamB.result === 'loser') {
            dependencyMatchIds.add(match.dependsOn.teamB.matchId);
          }
        }
      }

      // IR match IDs should not appear as loser dependencies
      // (except SF losers going to 3rd place)
      for (const irMatch of irMatches) {
        expect(dependencyMatchIds.has(irMatch.id)).toBe(false);
      }
    });

    it('QF losers are eliminated, not in further matches', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const qfMatches = (result.matches as SSVBBracketMatch[]).filter(
        (m) => m.stage === 'quarterfinal'
      );

      // QF losers should not be in any match dependencies
      const loserDependencies = new Set<string>();
      for (const match of result.matches) {
        if (match.dependsOn?.teamA?.result === 'loser') {
          loserDependencies.add(match.dependsOn.teamA.matchId);
        }
        if (match.dependsOn?.teamB?.result === 'loser') {
          loserDependencies.add(match.dependsOn.teamB.matchId);
        }
      }

      // QF match IDs should not appear as loser dependencies
      for (const qfMatch of qfMatches) {
        expect(loserDependencies.has(qfMatch.id)).toBe(false);
      }
    });
  });

  describe('dependencies', () => {
    it('all dependencies reference valid match IDs', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const matchIds = new Set(result.matches.map((m) => m.id));

      for (const match of result.matches) {
        if (match.dependsOn?.teamA) {
          expect(matchIds.has(match.dependsOn.teamA.matchId)).toBe(true);
        }
        if (match.dependsOn?.teamB) {
          expect(matchIds.has(match.dependsOn.teamB.matchId)).toBe(true);
        }
      }
    });
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('getEliminatedTeams', () => {
  it('returns group 4ths as eliminated', () => {
    const standings = create4GroupStandings();
    const config = defaultConfig(4);

    const eliminated = getEliminatedTeams(standings, config);

    expect(eliminated).toHaveLength(4);
    expect(eliminated.every((e) => e.reason === 'group-4th')).toBe(true);
  });

  it('returns empty array when teamsPerGroup < 4', () => {
    const standings = create4GroupStandings().filter((s) => s.position <= 3);
    const config = { ...defaultConfig(4), teamsPerGroup: 3 };

    const eliminated = getEliminatedTeams(standings, config);

    expect(eliminated).toHaveLength(0);
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateSSVBKnockoutConfig', () => {
  it('valid 4-group config returns no errors', () => {
    const standings = create4GroupStandings();
    const config = defaultConfig(4);

    const validation = validateSSVBKnockoutConfig(standings, config);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('rejects unsupported group count', () => {
    const standings = create4GroupStandings();
    const config = { ...defaultConfig(4), numberOfGroups: 3 };

    const validation = validateSSVBKnockoutConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('SSVB knockout requires 2 or 4 groups, got 3');
  });

  it('rejects insufficient teams per group', () => {
    const standings = create4GroupStandings().filter((s) => s.position <= 2);
    const config = { ...defaultConfig(4), teamsPerGroup: 2 };

    const validation = validateSSVBKnockoutConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('SSVB knockout requires at least 3 teams per group');
  });

  it('detects missing positions', () => {
    const standings = create4GroupStandings().filter(
      (s) => !(s.groupId === 'A' && s.position === 2)
    );
    const config = defaultConfig(4);

    const validation = validateSSVBKnockoutConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Group A missing position 2'))).toBe(
      true
    );
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  it('complete bracket only has finals for 1st and 3rd', () => {
    const standings = create4GroupStandings();
    const generator = new SSVBKnockoutGenerator();
    const result = generator.generateFromGroups(standings, defaultConfig(4));

    const playoffMatches = (result.matches as SSVBBracketMatch[]).filter(
      (m) => m.playoffForPlace !== undefined
    );

    expect(playoffMatches).toHaveLength(2);
    expect(playoffMatches.map((m) => m.playoffForPlace).sort()).toEqual([1, 3]);
  });

  it('elimination path is strict', () => {
    const standings = create4GroupStandings();
    const generator = new SSVBKnockoutGenerator();
    const result = generator.generateFromGroups(standings, defaultConfig(4));

    // Count matches where losers have routing
    let loserRoutingCount = 0;
    for (const match of result.matches as SSVBBracketMatch[]) {
      if (match.loserGoesTo !== null) {
        loserRoutingCount++;
      }
    }

    // Only SF losers should have routing (to 3rd place)
    expect(loserRoutingCount).toBe(2);
  });

  it('format follows SSVB specification', () => {
    const standings = create4GroupStandings();
    const generator = new SSVBKnockoutGenerator();
    const result = generator.generateFromGroups(
      standings,
      defaultConfig(4)
    ) as SSVBGenerationResult;

    // Spec checks:
    // 1. Group 4ths eliminated
    expect(result.eliminatedTeams.length).toBe(4);

    // 2. IR structure (2nds vs 3rds cross-group)
    const irMatches = (result.matches as SSVBBracketMatch[]).filter(
      (m) => m.stage === 'intermediate'
    );
    expect(irMatches.length).toBe(4);

    // 3. Group winners wait for IR winners
    const qfMatches = (result.matches as SSVBBracketMatch[]).filter(
      (m) => m.stage === 'quarterfinal'
    );
    for (const qf of qfMatches) {
      expect(qf.teamAId).toMatch(/^[ABCD]1$/); // Group winners
      expect(qf.teamBId).toBeNull(); // Waiting for IR winner
    }

    // 4. Only 3rd place match
    const consolationMatches = (result.matches as SSVBBracketMatch[]).filter(
      (m) =>
        m.stage !== 'intermediate' &&
        m.stage !== 'quarterfinal' &&
        m.stage !== 'semifinal' &&
        m.stage !== 'final' &&
        m.stage !== '3rd-place'
    );
    expect(consolationMatches.length).toBe(0);
  });
});
