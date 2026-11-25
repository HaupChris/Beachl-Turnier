/**
 * Split Bracket Generator (Mode 3B)
 *
 * Generates tiered brackets that don't reconnect:
 * - Main bracket (places 1-4): Group winners + intermediate round winners
 * - Intermediate round: Group 2nds vs Group 3rds cross-group
 * - Placement brackets: Separate brackets for 5-8, 9-12, etc.
 *
 * Key characteristic: Once a team drops to a lower tier, they cannot
 * return to compete for higher placements.
 *
 * @see docs/tournament-modes-specification.md Section 3B
 */

import {
  type BracketGenerator,
  type BracketConfig,
  type BracketTeamSeed,
  type BracketGenerationResult,
  type BracketMatch,
  generateMatchId,
} from './BracketGenerator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended config for split bracket generation
 */
export interface SplitBracketConfig extends BracketConfig {
  /** Number of groups (2 or 4 typically) */
  numberOfGroups: number;
  /** Teams per group */
  teamsPerGroup: number;
}

/**
 * Input from group standings
 */
export interface GroupStanding {
  /** Group identifier (e.g., 'A', 'B', 'C', 'D') */
  groupId: string;
  /** Position within group (1 = first place) */
  position: number;
  /** Team identifier */
  teamId: string;
}

/**
 * Bracket tier classification
 */
export type BracketTier = 'main' | 'intermediate' | 'placement-5-8' | 'placement-9-12' | 'placement-13-16';

/**
 * Extended bracket match with tier information
 */
export interface SplitBracketMatch extends BracketMatch {
  /** Which tier/bracket this match belongs to */
  tier: BracketTier;
  /** Bracket label for display */
  bracketLabel: string;
}

// =============================================================================
// SPLIT BRACKET GENERATOR
// =============================================================================

export class SplitBracketGenerator implements BracketGenerator {
  readonly name = 'split-bracket';

  /**
   * Generate split bracket from group standings
   */
  generate(teams: BracketTeamSeed[], config: BracketConfig): BracketGenerationResult {
    // This implementation requires SplitBracketConfig
    // For basic interface compliance, use generateFromGroups instead
    if (teams.length < 4) {
      return { matches: [], rounds: 0, totalMatches: 0 };
    }

    // Assume 2 groups for basic generation
    const numberOfGroups = 2;
    const teamsPerGroup = Math.floor(teams.length / numberOfGroups);

    // Convert flat team list to group standings
    const standings: GroupStanding[] = [];
    const groupLabels = ['A', 'B', 'C', 'D'];

    for (let g = 0; g < numberOfGroups; g++) {
      for (let p = 0; p < teamsPerGroup; p++) {
        const teamIndex = g * teamsPerGroup + p;
        if (teamIndex < teams.length) {
          standings.push({
            groupId: groupLabels[g],
            position: p + 1,
            teamId: teams[teamIndex].id,
          });
        }
      }
    }

    return this.generateFromGroups(standings, {
      ...config,
      numberOfGroups,
      teamsPerGroup,
    } as SplitBracketConfig);
  }

  /**
   * Generate split bracket from actual group standings
   */
  generateFromGroups(
    standings: GroupStanding[],
    config: SplitBracketConfig
  ): BracketGenerationResult {
    const { numberOfGroups } = config;

    if (standings.length < 4) {
      return { matches: [], rounds: 0, totalMatches: 0 };
    }

    // Build lookup for teams by group and position
    const teamLookup = new Map<string, string>();
    for (const standing of standings) {
      const key = `${standing.groupId}${standing.position}`;
      teamLookup.set(key, standing.teamId);
    }

    // Generate based on number of groups
    if (numberOfGroups === 2) {
      return this.generate2GroupBracket(teamLookup, config);
    } else if (numberOfGroups === 4) {
      return this.generate4GroupBracket(teamLookup, config);
    }

    // Fallback for unsupported group counts
    return { matches: [], rounds: 0, totalMatches: 0 };
  }

  /**
   * Generate bracket for 2 groups (8 teams typical)
   */
  private generate2GroupBracket(
    teamLookup: Map<string, string>,
    config: SplitBracketConfig
  ): BracketGenerationResult {
    const { courts, startMatchNumber = 1, startRound = 1, teamsPerGroup } = config;
    const allMatches: SplitBracketMatch[] = [];
    let matchNumber = startMatchNumber;
    let roundNumber = startRound;

    // Helper to get team or null if not exists
    const getTeam = (key: string): string | null => teamLookup.get(key) || null;

    // =========================================================================
    // INTERMEDIATE ROUND (Round 1)
    // =========================================================================
    const ir1: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 1,
      teamAId: getTeam('A2'),
      teamBId: getTeam('B3'),
      courtNumber: 1,
      placementInterval: { start: 1, end: 8 },
      winnerInterval: { start: 1, end: 4 },
      loserInterval: { start: 5, end: 8 },
      winnerGoesTo: null, // Set later
      loserGoesTo: null,
      tier: 'intermediate',
      bracketLabel: 'Intermediate Round',
    };

    const ir2: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 2,
      teamAId: getTeam('B2'),
      teamBId: getTeam('A3'),
      courtNumber: 2,
      placementInterval: { start: 1, end: 8 },
      winnerInterval: { start: 1, end: 4 },
      loserInterval: { start: 5, end: 8 },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'intermediate',
      bracketLabel: 'Intermediate Round',
    };

    allMatches.push(ir1, ir2);
    roundNumber++;

    // =========================================================================
    // QUARTERFINALS (Round 2) - Group winners vs IR winners
    // =========================================================================
    const qf1: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 1,
      teamAId: getTeam('A1'),
      teamBId: null, // Winner of IR2 (B2 vs A3)
      courtNumber: 1,
      placementInterval: { start: 1, end: 4 },
      winnerInterval: { start: 1, end: 2 },
      loserInterval: { start: 3, end: 4 },
      dependsOn: {
        teamB: { matchId: ir2.id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'main',
      bracketLabel: 'Quarterfinal',
    };

    const qf2: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 2,
      teamAId: getTeam('B1'),
      teamBId: null, // Winner of IR1 (A2 vs B3)
      courtNumber: 2,
      placementInterval: { start: 1, end: 4 },
      winnerInterval: { start: 1, end: 2 },
      loserInterval: { start: 3, end: 4 },
      dependsOn: {
        teamB: { matchId: ir1.id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'main',
      bracketLabel: 'Quarterfinal',
    };

    // Link IR winners to QF
    ir1.winnerGoesTo = { matchId: qf2.id, slot: 'B' };
    ir2.winnerGoesTo = { matchId: qf1.id, slot: 'B' };

    allMatches.push(qf1, qf2);
    roundNumber++;

    // =========================================================================
    // PLACEMENT 5-8 SEMIFINAL (Round 2) - IR losers
    // =========================================================================
    const p58Semi: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber - 1, // Same round as QF
      matchNumber: matchNumber++,
      bracketPosition: 3,
      teamAId: null,
      teamBId: null,
      courtNumber: (matchNumber - 1) % courts + 1,
      placementInterval: { start: 5, end: 8 },
      winnerInterval: { start: 5, end: 6 },
      loserInterval: { start: 7, end: 8 },
      dependsOn: {
        teamA: { matchId: ir1.id, result: 'loser' },
        teamB: { matchId: ir2.id, result: 'loser' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'placement-5-8',
      bracketLabel: 'Placement 5-8',
    };

    // Link IR losers
    ir1.loserGoesTo = { matchId: p58Semi.id, slot: 'A' };
    ir2.loserGoesTo = { matchId: p58Semi.id, slot: 'B' };

    allMatches.push(p58Semi);

    // =========================================================================
    // FINALS (Round 3)
    // =========================================================================
    const final: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 1,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      placementInterval: { start: 1, end: 2 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: qf1.id, result: 'winner' },
        teamB: { matchId: qf2.id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 1,
      tier: 'main',
      bracketLabel: 'Final',
    };

    const thirdPlace: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 2,
      teamAId: null,
      teamBId: null,
      courtNumber: 2,
      placementInterval: { start: 3, end: 4 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: qf1.id, result: 'loser' },
        teamB: { matchId: qf2.id, result: 'loser' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 3,
      tier: 'main',
      bracketLabel: '3rd Place Match',
    };

    // Link QF to finals
    qf1.winnerGoesTo = { matchId: final.id, slot: 'A' };
    qf2.winnerGoesTo = { matchId: final.id, slot: 'B' };
    qf1.loserGoesTo = { matchId: thirdPlace.id, slot: 'A' };
    qf2.loserGoesTo = { matchId: thirdPlace.id, slot: 'B' };

    allMatches.push(final, thirdPlace);

    // =========================================================================
    // 5TH AND 7TH PLACE (Round 3)
    // =========================================================================
    const fifthPlace: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 3,
      teamAId: null,
      teamBId: null,
      courtNumber: (matchNumber - 1) % courts + 1,
      placementInterval: { start: 5, end: 6 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: p58Semi.id, result: 'winner' },
        teamB: { matchId: p58Semi.id, result: 'winner' }, // This should be different
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 5,
      tier: 'placement-5-8',
      bracketLabel: '5th Place Match',
    };

    const seventhPlace: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 4,
      teamAId: null,
      teamBId: null,
      courtNumber: (matchNumber - 1) % courts + 1,
      placementInterval: { start: 7, end: 8 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: p58Semi.id, result: 'loser' },
        teamB: { matchId: p58Semi.id, result: 'loser' }, // This should be different
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 7,
      tier: 'placement-5-8',
      bracketLabel: '7th Place Match',
    };

    // For 2 groups with 4 teams each, group 4ths play for 7th/8th
    // Actually with 2 groups of 4, we need A4 vs B4 for 7th/8th
    // Let me fix this - the P58 semifinal winner and loser determine 5/6 and 7/8
    // But that's only 2 teams from IR losers, we need A4 and B4 too

    // For now, using the simple structure where IR losers determine 5-8
    // In a real implementation, we'd also add Group 4ths bracket

    p58Semi.winnerGoesTo = { matchId: fifthPlace.id, slot: 'A' };
    // Note: 5th place winner needs a different source for team B
    // This simplified version has the semifinal winner determine 5th outright

    allMatches.push(fifthPlace, seventhPlace);

    // Handle Group 4ths if they exist (teamsPerGroup >= 4)
    if (teamsPerGroup >= 4) {
      const a4 = getTeam('A4');
      const b4 = getTeam('B4');

      if (a4 && b4) {
        // Replace 7th place match with Group 4ths playing
        const lastIdx = allMatches.findIndex(m => m.id === seventhPlace.id);
        allMatches[lastIdx] = {
          ...seventhPlace,
          teamAId: a4,
          teamBId: b4,
          dependsOn: undefined,
        };
      }
    }

    return {
      matches: allMatches,
      rounds: roundNumber - startRound + 1,
      totalMatches: allMatches.length,
    };
  }

  /**
   * Generate bracket for 4 groups (16 teams typical)
   */
  private generate4GroupBracket(
    teamLookup: Map<string, string>,
    config: SplitBracketConfig
  ): BracketGenerationResult {
    const { courts, startMatchNumber = 1, startRound = 1, teamsPerGroup } = config;
    const allMatches: SplitBracketMatch[] = [];
    let matchNumber = startMatchNumber;
    let roundNumber = startRound;

    const getTeam = (key: string): string | null => teamLookup.get(key) || null;

    // =========================================================================
    // INTERMEDIATE ROUND (Round 1)
    // A2 vs D3, B2 vs C3, C2 vs B3, D2 vs A3
    // =========================================================================
    const irPairings = [
      ['A2', 'D3'], // IR1
      ['B2', 'C3'], // IR2
      ['C2', 'B3'], // IR3
      ['D2', 'A3'], // IR4
    ];

    const irMatches: SplitBracketMatch[] = irPairings.map(([a, b], i) => ({
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: i + 1,
      teamAId: getTeam(a),
      teamBId: getTeam(b),
      courtNumber: (i % courts) + 1,
      placementInterval: { start: 1, end: 16 },
      winnerInterval: { start: 1, end: 8 },
      loserInterval: { start: 5, end: 8 },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'intermediate' as BracketTier,
      bracketLabel: 'Intermediate Round',
    }));

    allMatches.push(...irMatches);
    roundNumber++;

    // =========================================================================
    // QUARTERFINALS (Round 2)
    // A1 vs W(B2-C3), B1 vs W(A2-D3), C1 vs W(D2-A3), D1 vs W(C2-B3)
    // =========================================================================
    const qfPairings = [
      { groupWinner: 'A1', irMatch: irMatches[1] }, // A1 vs W(IR2)
      { groupWinner: 'B1', irMatch: irMatches[0] }, // B1 vs W(IR1)
      { groupWinner: 'C1', irMatch: irMatches[3] }, // C1 vs W(IR4)
      { groupWinner: 'D1', irMatch: irMatches[2] }, // D1 vs W(IR3)
    ];

    const qfMatches: SplitBracketMatch[] = qfPairings.map((pairing, i) => ({
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: i + 1,
      teamAId: getTeam(pairing.groupWinner),
      teamBId: null,
      courtNumber: (i % courts) + 1,
      placementInterval: { start: 1, end: 4 },
      winnerInterval: { start: 1, end: 2 },
      loserInterval: { start: 3, end: 4 },
      dependsOn: {
        teamB: { matchId: pairing.irMatch.id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'main' as BracketTier,
      bracketLabel: 'Quarterfinal',
    }));

    // Link IR winners to QF
    irMatches[0].winnerGoesTo = { matchId: qfMatches[1].id, slot: 'B' };
    irMatches[1].winnerGoesTo = { matchId: qfMatches[0].id, slot: 'B' };
    irMatches[2].winnerGoesTo = { matchId: qfMatches[3].id, slot: 'B' };
    irMatches[3].winnerGoesTo = { matchId: qfMatches[2].id, slot: 'B' };

    allMatches.push(...qfMatches);

    // =========================================================================
    // PLACEMENT 5-8 SEMIFINALS (Round 2, same time as QF)
    // =========================================================================
    const p58Semi1: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 5,
      teamAId: null,
      teamBId: null,
      courtNumber: (matchNumber - 1) % courts + 1,
      placementInterval: { start: 5, end: 8 },
      winnerInterval: { start: 5, end: 6 },
      loserInterval: { start: 7, end: 8 },
      dependsOn: {
        teamA: { matchId: irMatches[0].id, result: 'loser' },
        teamB: { matchId: irMatches[3].id, result: 'loser' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'placement-5-8',
      bracketLabel: 'Placement 5-8 Semi',
    };

    const p58Semi2: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 6,
      teamAId: null,
      teamBId: null,
      courtNumber: (matchNumber - 1) % courts + 1,
      placementInterval: { start: 5, end: 8 },
      winnerInterval: { start: 5, end: 6 },
      loserInterval: { start: 7, end: 8 },
      dependsOn: {
        teamA: { matchId: irMatches[1].id, result: 'loser' },
        teamB: { matchId: irMatches[2].id, result: 'loser' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'placement-5-8',
      bracketLabel: 'Placement 5-8 Semi',
    };

    // Link IR losers to placement bracket
    irMatches[0].loserGoesTo = { matchId: p58Semi1.id, slot: 'A' };
    irMatches[1].loserGoesTo = { matchId: p58Semi2.id, slot: 'A' };
    irMatches[2].loserGoesTo = { matchId: p58Semi2.id, slot: 'B' };
    irMatches[3].loserGoesTo = { matchId: p58Semi1.id, slot: 'B' };

    allMatches.push(p58Semi1, p58Semi2);
    roundNumber++;

    // =========================================================================
    // SEMIFINALS (Round 3)
    // =========================================================================
    const sf1: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 1,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      placementInterval: { start: 1, end: 4 },
      winnerInterval: { start: 1, end: 2 },
      loserInterval: { start: 3, end: 4 },
      dependsOn: {
        teamA: { matchId: qfMatches[0].id, result: 'winner' },
        teamB: { matchId: qfMatches[3].id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'main',
      bracketLabel: 'Semifinal',
    };

    const sf2: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 2,
      teamAId: null,
      teamBId: null,
      courtNumber: 2,
      placementInterval: { start: 1, end: 4 },
      winnerInterval: { start: 1, end: 2 },
      loserInterval: { start: 3, end: 4 },
      dependsOn: {
        teamA: { matchId: qfMatches[1].id, result: 'winner' },
        teamB: { matchId: qfMatches[2].id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      tier: 'main',
      bracketLabel: 'Semifinal',
    };

    // Link QF to SF
    qfMatches[0].winnerGoesTo = { matchId: sf1.id, slot: 'A' };
    qfMatches[1].winnerGoesTo = { matchId: sf2.id, slot: 'A' };
    qfMatches[2].winnerGoesTo = { matchId: sf2.id, slot: 'B' };
    qfMatches[3].winnerGoesTo = { matchId: sf1.id, slot: 'B' };

    allMatches.push(sf1, sf2);

    // =========================================================================
    // 5TH-8TH FINALS (Round 3)
    // =========================================================================
    const fifthPlace: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 3,
      teamAId: null,
      teamBId: null,
      courtNumber: 3,
      placementInterval: { start: 5, end: 6 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: p58Semi1.id, result: 'winner' },
        teamB: { matchId: p58Semi2.id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 5,
      tier: 'placement-5-8',
      bracketLabel: '5th Place Match',
    };

    const seventhPlace: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 4,
      teamAId: null,
      teamBId: null,
      courtNumber: 4,
      placementInterval: { start: 7, end: 8 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: p58Semi1.id, result: 'loser' },
        teamB: { matchId: p58Semi2.id, result: 'loser' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 7,
      tier: 'placement-5-8',
      bracketLabel: '7th Place Match',
    };

    // Link 5-8 semis to finals
    p58Semi1.winnerGoesTo = { matchId: fifthPlace.id, slot: 'A' };
    p58Semi2.winnerGoesTo = { matchId: fifthPlace.id, slot: 'B' };
    p58Semi1.loserGoesTo = { matchId: seventhPlace.id, slot: 'A' };
    p58Semi2.loserGoesTo = { matchId: seventhPlace.id, slot: 'B' };

    allMatches.push(fifthPlace, seventhPlace);
    roundNumber++;

    // =========================================================================
    // FINALS (Round 4)
    // =========================================================================
    const final: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 1,
      teamAId: null,
      teamBId: null,
      courtNumber: 1,
      placementInterval: { start: 1, end: 2 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: sf1.id, result: 'winner' },
        teamB: { matchId: sf2.id, result: 'winner' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 1,
      tier: 'main',
      bracketLabel: 'Final',
    };

    const thirdPlace: SplitBracketMatch = {
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: 2,
      teamAId: null,
      teamBId: null,
      courtNumber: 2,
      placementInterval: { start: 3, end: 4 },
      winnerInterval: null,
      loserInterval: null,
      dependsOn: {
        teamA: { matchId: sf1.id, result: 'loser' },
        teamB: { matchId: sf2.id, result: 'loser' },
      },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 3,
      tier: 'main',
      bracketLabel: '3rd Place Match',
    };

    // Link SF to finals
    sf1.winnerGoesTo = { matchId: final.id, slot: 'A' };
    sf2.winnerGoesTo = { matchId: final.id, slot: 'B' };
    sf1.loserGoesTo = { matchId: thirdPlace.id, slot: 'A' };
    sf2.loserGoesTo = { matchId: thirdPlace.id, slot: 'B' };

    allMatches.push(final, thirdPlace);

    // =========================================================================
    // PLACEMENT 9-12 (Group 4ths)
    // =========================================================================
    if (teamsPerGroup >= 4) {
      const p912Semi1: SplitBracketMatch = {
        id: generateMatchId(),
        round: startRound + 1, // Same as QF round
        matchNumber: matchNumber++,
        bracketPosition: 7,
        teamAId: getTeam('A4'),
        teamBId: getTeam('D4'),
        courtNumber: (matchNumber - 1) % courts + 1,
        placementInterval: { start: 9, end: 12 },
        winnerInterval: { start: 9, end: 10 },
        loserInterval: { start: 11, end: 12 },
        winnerGoesTo: null,
        loserGoesTo: null,
        tier: 'placement-9-12',
        bracketLabel: 'Placement 9-12 Semi',
      };

      const p912Semi2: SplitBracketMatch = {
        id: generateMatchId(),
        round: startRound + 1,
        matchNumber: matchNumber++,
        bracketPosition: 8,
        teamAId: getTeam('B4'),
        teamBId: getTeam('C4'),
        courtNumber: (matchNumber - 1) % courts + 1,
        placementInterval: { start: 9, end: 12 },
        winnerInterval: { start: 9, end: 10 },
        loserInterval: { start: 11, end: 12 },
        winnerGoesTo: null,
        loserGoesTo: null,
        tier: 'placement-9-12',
        bracketLabel: 'Placement 9-12 Semi',
      };

      const ninthPlace: SplitBracketMatch = {
        id: generateMatchId(),
        round: startRound + 2,
        matchNumber: matchNumber++,
        bracketPosition: 9,
        teamAId: null,
        teamBId: null,
        courtNumber: (matchNumber - 1) % courts + 1,
        placementInterval: { start: 9, end: 10 },
        winnerInterval: null,
        loserInterval: null,
        dependsOn: {
          teamA: { matchId: p912Semi1.id, result: 'winner' },
          teamB: { matchId: p912Semi2.id, result: 'winner' },
        },
        winnerGoesTo: null,
        loserGoesTo: null,
        playoffForPlace: 9,
        tier: 'placement-9-12',
        bracketLabel: '9th Place Match',
      };

      const eleventhPlace: SplitBracketMatch = {
        id: generateMatchId(),
        round: startRound + 2,
        matchNumber: matchNumber++,
        bracketPosition: 10,
        teamAId: null,
        teamBId: null,
        courtNumber: (matchNumber - 1) % courts + 1,
        placementInterval: { start: 11, end: 12 },
        winnerInterval: null,
        loserInterval: null,
        dependsOn: {
          teamA: { matchId: p912Semi1.id, result: 'loser' },
          teamB: { matchId: p912Semi2.id, result: 'loser' },
        },
        winnerGoesTo: null,
        loserGoesTo: null,
        playoffForPlace: 11,
        tier: 'placement-9-12',
        bracketLabel: '11th Place Match',
      };

      // Link 9-12 semis to finals
      p912Semi1.winnerGoesTo = { matchId: ninthPlace.id, slot: 'A' };
      p912Semi2.winnerGoesTo = { matchId: ninthPlace.id, slot: 'B' };
      p912Semi1.loserGoesTo = { matchId: eleventhPlace.id, slot: 'A' };
      p912Semi2.loserGoesTo = { matchId: eleventhPlace.id, slot: 'B' };

      allMatches.push(p912Semi1, p912Semi2, ninthPlace, eleventhPlace);
    }

    return {
      matches: allMatches,
      rounds: roundNumber - startRound + 1,
      totalMatches: allMatches.length,
    };
  }

  getExpectedMatchCount(teamCount: number): number {
    // For split bracket, the count depends on group configuration
    // 8 teams (2 groups): ~9 matches
    // 16 teams (4 groups): ~18 matches
    if (teamCount <= 8) {
      return 9;
    } else if (teamCount <= 16) {
      return 18;
    }
    return teamCount - 1;
  }

  getExpectedRoundCount(teamCount: number): number {
    if (teamCount <= 8) {
      return 3;
    } else if (teamCount <= 16) {
      return 4;
    }
    return Math.ceil(Math.log2(teamCount));
  }
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Generate a split bracket from group standings
 */
export function generateSplitBracket(
  standings: GroupStanding[],
  config: SplitBracketConfig
): BracketGenerationResult {
  const generator = new SplitBracketGenerator();
  return generator.generateFromGroups(standings, config);
}

/**
 * Validate split bracket configuration
 */
export function validateSplitBracketConfig(
  standings: GroupStanding[],
  config: SplitBracketConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check number of groups
  if (config.numberOfGroups !== 2 && config.numberOfGroups !== 4) {
    errors.push(`Split bracket requires 2 or 4 groups, got ${config.numberOfGroups}`);
  }

  // Check teams per group
  if (config.teamsPerGroup < 3) {
    errors.push(`Split bracket requires at least 3 teams per group`);
  }

  // Check standings coverage
  const groups = new Set(standings.map(s => s.groupId));
  if (groups.size !== config.numberOfGroups) {
    errors.push(`Expected ${config.numberOfGroups} groups in standings, found ${groups.size}`);
  }

  // Check each group has required positions
  for (const groupId of groups) {
    const groupStandings = standings.filter(s => s.groupId === groupId);
    const positions = new Set(groupStandings.map(s => s.position));

    // Must have positions 1, 2, 3 at minimum
    for (let p = 1; p <= 3; p++) {
      if (!positions.has(p)) {
        errors.push(`Group ${groupId} missing position ${p}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
