/**
 * Tests for Split Bracket Generator (Mode 3B)
 *
 * These tests verify that:
 * 1. Intermediate round pairs 2nds vs 3rds correctly
 * 2. Group winners wait and play IR winners
 * 3. Tiers are correctly separated (no reconnection)
 * 4. All placements are determined
 *
 * @see docs/tournament-modes-specification.md Section 3B
 */

import { describe, it, expect } from 'vitest';
import {
  SplitBracketGenerator,
  validateSplitBracketConfig,
  type GroupStanding,
  type SplitBracketConfig,
  type SplitBracketMatch,
} from '../SplitBracketGenerator';

// =============================================================================
// TEST HELPERS
// =============================================================================

function create2GroupStandings(): GroupStanding[] {
  return [
    { groupId: 'A', position: 1, teamId: 'A1' },
    { groupId: 'A', position: 2, teamId: 'A2' },
    { groupId: 'A', position: 3, teamId: 'A3' },
    { groupId: 'A', position: 4, teamId: 'A4' },
    { groupId: 'B', position: 1, teamId: 'B1' },
    { groupId: 'B', position: 2, teamId: 'B2' },
    { groupId: 'B', position: 3, teamId: 'B3' },
    { groupId: 'B', position: 4, teamId: 'B4' },
  ];
}

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

function defaultConfig(numberOfGroups: number): SplitBracketConfig {
  return {
    courts: 4,
    numberOfGroups,
    teamsPerGroup: 4,
  };
}

// =============================================================================
// GENERATOR TESTS
// =============================================================================

describe('SplitBracketGenerator', () => {
  const generator = new SplitBracketGenerator();

  describe('name', () => {
    it('has correct name', () => {
      expect(generator.name).toBe('split-bracket');
    });
  });

  describe('2 groups (8 teams)', () => {
    describe('intermediate round', () => {
      it('creates correct IR pairings (2nds vs 3rds)', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const irMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'intermediate'
        );

        expect(irMatches).toHaveLength(2);

        // IR1: A2 vs B3
        expect(irMatches[0].teamAId).toBe('A2');
        expect(irMatches[0].teamBId).toBe('B3');

        // IR2: B2 vs A3
        expect(irMatches[1].teamAId).toBe('B2');
        expect(irMatches[1].teamBId).toBe('A3');
      });

      it('IR matches are round 1', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const irMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'intermediate'
        );

        for (const match of irMatches) {
          expect(match.round).toBe(1);
        }
      });
    });

    describe('quarterfinals', () => {
      it('group winners wait for IR winners', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const qfMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'main' && m.bracketLabel === 'Quarterfinal'
        );

        expect(qfMatches).toHaveLength(2);

        // QF1: A1 vs W(B2-A3)
        expect(qfMatches[0].teamAId).toBe('A1');
        expect(qfMatches[0].teamBId).toBeNull();
        expect(qfMatches[0].dependsOn?.teamB?.result).toBe('winner');

        // QF2: B1 vs W(A2-B3)
        expect(qfMatches[1].teamAId).toBe('B1');
        expect(qfMatches[1].teamBId).toBeNull();
        expect(qfMatches[1].dependsOn?.teamB?.result).toBe('winner');
      });

      it('QF matches are round 2', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const qfMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'main' && m.bracketLabel === 'Quarterfinal'
        );

        for (const match of qfMatches) {
          expect(match.round).toBe(2);
        }
      });
    });

    describe('finals', () => {
      it('creates final for 1st/2nd place', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const final = (result.matches as SplitBracketMatch[]).find(
          (m) => m.playoffForPlace === 1
        );

        expect(final).toBeDefined();
        expect(final?.tier).toBe('main');
        expect(final?.bracketLabel).toBe('Final');
      });

      it('creates 3rd place match', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const thirdPlace = (result.matches as SplitBracketMatch[]).find(
          (m) => m.playoffForPlace === 3
        );

        expect(thirdPlace).toBeDefined();
        expect(thirdPlace?.tier).toBe('main');
      });
    });

    describe('placement 5-8', () => {
      it('IR losers go to placement bracket', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const irMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'intermediate'
        );

        // Check IR losers have routing to placement bracket
        for (const match of irMatches) {
          expect(match.loserGoesTo).not.toBeNull();
        }
      });

      it('creates 5th and 7th place matches', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const fifthPlace = (result.matches as SplitBracketMatch[]).find(
          (m) => m.playoffForPlace === 5
        );
        const seventhPlace = (result.matches as SplitBracketMatch[]).find(
          (m) => m.playoffForPlace === 7
        );

        expect(fifthPlace).toBeDefined();
        expect(seventhPlace).toBeDefined();
        expect(fifthPlace?.tier).toBe('placement-5-8');
        expect(seventhPlace?.tier).toBe('placement-5-8');
      });
    });

    describe('tier separation', () => {
      it('placement bracket teams cannot return to main bracket', () => {
        const standings = create2GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(2));

        const placementMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'placement-5-8'
        );

        for (const match of placementMatches) {
          if (match.winnerGoesTo) {
            const targetMatch = result.matches.find((m) => m.id === match.winnerGoesTo?.matchId);
            if (targetMatch) {
              expect((targetMatch as SplitBracketMatch).tier).not.toBe('main');
            }
          }
        }
      });
    });
  });

  describe('4 groups (16 teams)', () => {
    describe('intermediate round', () => {
      it('creates correct IR pairings', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const irMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'intermediate'
        );

        expect(irMatches).toHaveLength(4);

        // IR pairings: A2-D3, B2-C3, C2-B3, D2-A3
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
    });

    describe('quarterfinals', () => {
      it('creates 4 QF matches', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const qfMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'main' && m.bracketLabel === 'Quarterfinal'
        );

        expect(qfMatches).toHaveLength(4);
      });

      it('group winners have static teamA slots', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const qfMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'main' && m.bracketLabel === 'Quarterfinal'
        );

        const groupWinners = new Set(['A1', 'B1', 'C1', 'D1']);
        const qfTeamAs = qfMatches.map((m) => m.teamAId);

        for (const teamA of qfTeamAs) {
          expect(groupWinners.has(teamA!)).toBe(true);
        }
      });
    });

    describe('semifinals', () => {
      it('creates 2 SF matches', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const sfMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'main' && m.bracketLabel === 'Semifinal'
        );

        expect(sfMatches).toHaveLength(2);
      });

      it('SF matches depend on QF winners', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const sfMatches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'main' && m.bracketLabel === 'Semifinal'
        );

        for (const match of sfMatches) {
          expect(match.dependsOn?.teamA?.result).toBe('winner');
          expect(match.dependsOn?.teamB?.result).toBe('winner');
        }
      });
    });

    describe('placement 5-8', () => {
      it('creates 4 matches (2 semis + 5th + 7th)', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const p58Matches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'placement-5-8'
        );

        expect(p58Matches).toHaveLength(4);
      });

      it('5-8 semis receive IR losers', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const p58Semis = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'placement-5-8' && m.bracketLabel === 'Placement 5-8 Semi'
        );

        expect(p58Semis).toHaveLength(2);

        for (const match of p58Semis) {
          expect(match.dependsOn?.teamA?.result).toBe('loser');
          expect(match.dependsOn?.teamB?.result).toBe('loser');
        }
      });
    });

    describe('placement 9-12', () => {
      it('creates bracket for group 4ths', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const p912Matches = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'placement-9-12'
        );

        expect(p912Matches).toHaveLength(4);
      });

      it('9-12 semis have static team assignments', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const p912Semis = (result.matches as SplitBracketMatch[]).filter(
          (m) => m.tier === 'placement-9-12' && m.bracketLabel === 'Placement 9-12 Semi'
        );

        expect(p912Semis).toHaveLength(2);

        // Semi 1: A4 vs D4
        expect(p912Semis[0].teamAId).toBe('A4');
        expect(p912Semis[0].teamBId).toBe('D4');

        // Semi 2: B4 vs C4
        expect(p912Semis[1].teamAId).toBe('B4');
        expect(p912Semis[1].teamBId).toBe('C4');
      });

      it('creates 9th and 11th place matches', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        const ninthPlace = (result.matches as SplitBracketMatch[]).find(
          (m) => m.playoffForPlace === 9
        );
        const eleventhPlace = (result.matches as SplitBracketMatch[]).find(
          (m) => m.playoffForPlace === 11
        );

        expect(ninthPlace).toBeDefined();
        expect(eleventhPlace).toBeDefined();
      });
    });

    describe('total match count', () => {
      it('generates correct number of matches for 16 teams', () => {
        const standings = create4GroupStandings();
        const result = generator.generateFromGroups(standings, defaultConfig(4));

        // IR: 4, QF: 4, SF: 2, Final + 3rd: 2
        // 5-8: 4 (2 semis + 5th + 7th)
        // 9-12: 4 (2 semis + 9th + 11th)
        // Total: 4 + 4 + 2 + 2 + 4 + 4 = 20
        expect(result.totalMatches).toBe(20);
      });
    });
  });

  describe('dependencies and routing', () => {
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

    it('winner routing targets valid match IDs', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const matchIds = new Set(result.matches.map((m) => m.id));

      for (const match of result.matches) {
        if (match.winnerGoesTo) {
          expect(matchIds.has(match.winnerGoesTo.matchId)).toBe(true);
        }
      }
    });

    it('loser routing targets valid match IDs', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const matchIds = new Set(result.matches.map((m) => m.id));

      for (const match of result.matches) {
        if (match.loserGoesTo) {
          expect(matchIds.has(match.loserGoesTo.matchId)).toBe(true);
        }
      }
    });
  });

  describe('placement intervals', () => {
    it('main bracket covers 1-4', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const qfMatches = (result.matches as SplitBracketMatch[]).filter(
        (m) => m.tier === 'main' && m.bracketLabel === 'Quarterfinal'
      );

      for (const match of qfMatches) {
        expect(match.placementInterval.start).toBe(1);
        expect(match.placementInterval.end).toBe(4);
      }
    });

    it('placement 5-8 semis cover 5-8', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const p58Semis = (result.matches as SplitBracketMatch[]).filter(
        (m) => m.tier === 'placement-5-8' && m.bracketLabel === 'Placement 5-8 Semi'
      );

      for (const match of p58Semis) {
        expect(match.placementInterval.start).toBe(5);
        expect(match.placementInterval.end).toBe(8);
      }
    });

    it('placement 9-12 semis cover 9-12', () => {
      const standings = create4GroupStandings();
      const result = generator.generateFromGroups(standings, defaultConfig(4));

      const p912Semis = (result.matches as SplitBracketMatch[]).filter(
        (m) => m.tier === 'placement-9-12' && m.bracketLabel === 'Placement 9-12 Semi'
      );

      for (const match of p912Semis) {
        expect(match.placementInterval.start).toBe(9);
        expect(match.placementInterval.end).toBe(12);
      }
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateSplitBracketConfig', () => {
  it('valid 4-group config returns no errors', () => {
    const standings = create4GroupStandings();
    const config = defaultConfig(4);

    const validation = validateSplitBracketConfig(standings, config);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('valid 2-group config returns no errors', () => {
    const standings = create2GroupStandings();
    const config = defaultConfig(2);

    const validation = validateSplitBracketConfig(standings, config);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('rejects unsupported group count', () => {
    const standings = create4GroupStandings();
    const config = { ...defaultConfig(4), numberOfGroups: 3 };

    const validation = validateSplitBracketConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Split bracket requires 2 or 4 groups, got 3');
  });

  it('rejects insufficient teams per group', () => {
    const standings = [
      { groupId: 'A', position: 1, teamId: 'A1' },
      { groupId: 'A', position: 2, teamId: 'A2' },
      { groupId: 'B', position: 1, teamId: 'B1' },
      { groupId: 'B', position: 2, teamId: 'B2' },
    ];
    const config = { ...defaultConfig(2), teamsPerGroup: 2 };

    const validation = validateSplitBracketConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Split bracket requires at least 3 teams per group');
  });

  it('detects missing group standings', () => {
    const standings = [
      { groupId: 'A', position: 1, teamId: 'A1' },
      { groupId: 'A', position: 2, teamId: 'A2' },
      { groupId: 'A', position: 3, teamId: 'A3' },
    ];
    const config = defaultConfig(2);

    const validation = validateSplitBracketConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Expected 2 groups'))).toBe(true);
  });

  it('detects missing positions', () => {
    const standings = [
      { groupId: 'A', position: 1, teamId: 'A1' },
      { groupId: 'A', position: 3, teamId: 'A3' }, // Missing position 2
      { groupId: 'B', position: 1, teamId: 'B1' },
      { groupId: 'B', position: 2, teamId: 'B2' },
      { groupId: 'B', position: 3, teamId: 'B3' },
    ];
    const config = defaultConfig(2);

    const validation = validateSplitBracketConfig(standings, config);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Group A missing position 2'))).toBe(true);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  it('complete 16-team bracket has all placement matches', () => {
    const standings = create4GroupStandings();
    const generator = new SplitBracketGenerator();
    const result = generator.generateFromGroups(standings, defaultConfig(4));

    const placements = (result.matches as SplitBracketMatch[])
      .filter((m) => m.playoffForPlace !== undefined)
      .map((m) => m.playoffForPlace);

    // Should have finals for: 1, 3, 5, 7, 9, 11
    expect(placements).toContain(1);
    expect(placements).toContain(3);
    expect(placements).toContain(5);
    expect(placements).toContain(7);
    expect(placements).toContain(9);
    expect(placements).toContain(11);
  });

  it('tiers do not cross-pollinate', () => {
    const standings = create4GroupStandings();
    const generator = new SplitBracketGenerator();
    const result = generator.generateFromGroups(standings, defaultConfig(4));

    const matchById = new Map(result.matches.map((m) => [m.id, m as SplitBracketMatch]));

    // Check that no placement tier match routes to main tier
    for (const match of result.matches as SplitBracketMatch[]) {
      if (match.tier === 'placement-5-8' || match.tier === 'placement-9-12') {
        if (match.winnerGoesTo) {
          const target = matchById.get(match.winnerGoesTo.matchId);
          expect(target?.tier).not.toBe('main');
        }
        if (match.loserGoesTo) {
          const target = matchById.get(match.loserGoesTo.matchId);
          expect(target?.tier).not.toBe('main');
        }
      }
    }
  });

  it('IR winners reach main bracket, IR losers do not', () => {
    const standings = create4GroupStandings();
    const generator = new SplitBracketGenerator();
    const result = generator.generateFromGroups(standings, defaultConfig(4));

    const irMatches = (result.matches as SplitBracketMatch[]).filter(
      (m) => m.tier === 'intermediate'
    );

    const matchById = new Map(result.matches.map((m) => [m.id, m as SplitBracketMatch]));

    for (const match of irMatches) {
      // Winner goes to main
      expect(match.winnerGoesTo).not.toBeNull();
      const winnerTarget = matchById.get(match.winnerGoesTo!.matchId);
      expect(winnerTarget?.tier).toBe('main');

      // Loser goes to placement
      expect(match.loserGoesTo).not.toBeNull();
      const loserTarget = matchById.get(match.loserGoesTo!.matchId);
      expect(loserTarget?.tier).toBe('placement-5-8');
    }
  });
});
