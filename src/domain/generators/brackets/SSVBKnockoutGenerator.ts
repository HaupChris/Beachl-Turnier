/**
 * SSVB Knockout Generator (Mode 3C)
 *
 * Official SSVB (Sächsischer Sportverband Volleyball) knockout format:
 * - Group 4ths are eliminated before knockout (no matches)
 * - Intermediate round: Group 2nds vs Group 3rds cross-group
 * - Single elimination bracket (no consolation except 3rd place)
 * - QF losers are eliminated
 * - Only 3rd place match played
 *
 * Key characteristic: Strict elimination - losing any knockout match
 * (except semifinals) results in immediate elimination with shared placement.
 *
 * @see docs/tournament-modes-specification.md Section 3C
 */

import {
  type BracketGenerator,
  type BracketConfig,
  type BracketTeamSeed,
  type BracketGenerationResult,
  type BracketMatch,
  generateMatchId,
} from './BracketGenerator';

import type { GroupStanding } from './SplitBracketGenerator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended config for SSVB knockout generation
 */
export interface SSVBKnockoutConfig extends BracketConfig {
  /** Number of groups (typically 4) */
  numberOfGroups: number;
  /** Teams per group (typically 4) */
  teamsPerGroup: number;
}

/**
 * Team elimination status
 */
export interface EliminatedTeam {
  teamId: string;
  reason: 'group-4th' | 'intermediate-loss' | 'quarterfinal-loss';
  sharedPlacement: { start: number; end: number };
}

/**
 * SSVB bracket match with elimination info
 */
export interface SSVBBracketMatch extends BracketMatch {
  /** Which stage of the knockout */
  stage: 'intermediate' | 'quarterfinal' | 'semifinal' | 'final' | '3rd-place';
  /** Label for display */
  stageLabel: string;
}

/**
 * Result of SSVB knockout generation
 */
export interface SSVBGenerationResult extends BracketGenerationResult {
  /** Teams eliminated before knockout begins */
  eliminatedTeams: EliminatedTeam[];
}

// =============================================================================
// SSVB KNOCKOUT GENERATOR
// =============================================================================

export class SSVBKnockoutGenerator implements BracketGenerator {
  readonly name = 'ssvb-knockout';

  /**
   * Generate SSVB knockout from flat team list
   */
  generate(teams: BracketTeamSeed[], config: BracketConfig): BracketGenerationResult {
    if (teams.length < 8) {
      return { matches: [], rounds: 0, totalMatches: 0 };
    }

    // Assume 4 groups for basic generation
    const numberOfGroups = 4;
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
    } as SSVBKnockoutConfig);
  }

  /**
   * Generate SSVB knockout from actual group standings
   */
  generateFromGroups(
    standings: GroupStanding[],
    config: SSVBKnockoutConfig
  ): SSVBGenerationResult {
    const { courts, startMatchNumber = 1, startRound = 1, numberOfGroups, teamsPerGroup } = config;

    if (standings.length < 8) {
      return { matches: [], rounds: 0, totalMatches: 0, eliminatedTeams: [] };
    }

    const allMatches: SSVBBracketMatch[] = [];
    const eliminatedTeams: EliminatedTeam[] = [];
    let matchNumber = startMatchNumber;
    let roundNumber = startRound;

    // Build lookup for teams by group and position
    const teamLookup = new Map<string, string>();
    for (const standing of standings) {
      const key = `${standing.groupId}${standing.position}`;
      teamLookup.set(key, standing.teamId);
    }

    const getTeam = (key: string): string | null => teamLookup.get(key) || null;

    // =========================================================================
    // ELIMINATE GROUP 4THS
    // =========================================================================
    if (teamsPerGroup >= 4) {
      const groups = ['A', 'B', 'C', 'D'].slice(0, numberOfGroups);
      for (const group of groups) {
        const team4th = getTeam(`${group}4`);
        if (team4th) {
          eliminatedTeams.push({
            teamId: team4th,
            reason: 'group-4th',
            sharedPlacement: { start: 13, end: 16 },
          });
        }
      }
    }

    // =========================================================================
    // INTERMEDIATE ROUND (Zwischenrunde)
    // =========================================================================
    // A2 vs D3, B2 vs C3, C2 vs B3, D2 vs A3
    const irPairings = numberOfGroups === 4
      ? [
          ['A2', 'D3'],
          ['B2', 'C3'],
          ['C2', 'B3'],
          ['D2', 'A3'],
        ]
      : [
          ['A2', 'B3'],
          ['B2', 'A3'],
        ];

    const irMatches: SSVBBracketMatch[] = irPairings.map(([a, b], i) => ({
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: i + 1,
      teamAId: getTeam(a),
      teamBId: getTeam(b),
      courtNumber: (i % courts) + 1,
      placementInterval: { start: 1, end: 12 },
      winnerInterval: { start: 1, end: 8 },
      loserInterval: null, // Losers are eliminated
      winnerGoesTo: null, // Set later
      loserGoesTo: null, // Eliminated
      stage: 'intermediate',
      stageLabel: 'Intermediate Round',
    }));

    allMatches.push(...irMatches);
    roundNumber++;

    // =========================================================================
    // QUARTERFINALS
    // =========================================================================
    // A1 vs W(B2-C3), B1 vs W(A2-D3), C1 vs W(D2-A3), D1 vs W(C2-B3)
    const qfMatchups = numberOfGroups === 4
      ? [
          { groupWinner: 'A1', irIdx: 1 }, // A1 vs W(IR2: B2-C3)
          { groupWinner: 'B1', irIdx: 0 }, // B1 vs W(IR1: A2-D3)
          { groupWinner: 'C1', irIdx: 3 }, // C1 vs W(IR4: D2-A3)
          { groupWinner: 'D1', irIdx: 2 }, // D1 vs W(IR3: C2-B3)
        ]
      : [
          { groupWinner: 'A1', irIdx: 1 }, // A1 vs W(IR2)
          { groupWinner: 'B1', irIdx: 0 }, // B1 vs W(IR1)
        ];

    const qfMatches: SSVBBracketMatch[] = qfMatchups.map((matchup, i) => ({
      id: generateMatchId(),
      round: roundNumber,
      matchNumber: matchNumber++,
      bracketPosition: i + 1,
      teamAId: getTeam(matchup.groupWinner),
      teamBId: null,
      courtNumber: (i % courts) + 1,
      placementInterval: { start: 1, end: 8 },
      winnerInterval: { start: 1, end: 4 },
      loserInterval: null, // QF losers eliminated
      dependsOn: {
        teamB: { matchId: irMatches[matchup.irIdx].id, result: 'winner' },
      },
      winnerGoesTo: null, // Set later
      loserGoesTo: null, // Eliminated
      stage: 'quarterfinal',
      stageLabel: 'Quarterfinal',
    }));

    // Link IR winners to QF
    for (const matchup of qfMatchups) {
      const qfMatch = qfMatches.find(m => m.dependsOn?.teamB?.matchId === irMatches[matchup.irIdx].id);
      if (qfMatch) {
        irMatches[matchup.irIdx].winnerGoesTo = { matchId: qfMatch.id, slot: 'B' };
      }
    }

    allMatches.push(...qfMatches);
    roundNumber++;

    // =========================================================================
    // SEMIFINALS
    // =========================================================================
    const sfMatches: SSVBBracketMatch[] = [];

    if (numberOfGroups === 4) {
      // SF1: W(QF1) vs W(QF4)
      const sf1: SSVBBracketMatch = {
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
        stage: 'semifinal',
        stageLabel: 'Semifinal',
      };

      // SF2: W(QF2) vs W(QF3)
      const sf2: SSVBBracketMatch = {
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
        stage: 'semifinal',
        stageLabel: 'Semifinal',
      };

      // Link QF winners to SF
      qfMatches[0].winnerGoesTo = { matchId: sf1.id, slot: 'A' };
      qfMatches[3].winnerGoesTo = { matchId: sf1.id, slot: 'B' };
      qfMatches[1].winnerGoesTo = { matchId: sf2.id, slot: 'A' };
      qfMatches[2].winnerGoesTo = { matchId: sf2.id, slot: 'B' };

      sfMatches.push(sf1, sf2);
    } else {
      // 2 groups: direct final from QF winners
      const sf1: SSVBBracketMatch = {
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
          teamB: { matchId: qfMatches[1].id, result: 'winner' },
        },
        winnerGoesTo: null,
        loserGoesTo: null,
        stage: 'semifinal',
        stageLabel: 'Semifinal',
      };

      qfMatches[0].winnerGoesTo = { matchId: sf1.id, slot: 'A' };
      qfMatches[1].winnerGoesTo = { matchId: sf1.id, slot: 'B' };

      sfMatches.push(sf1);
    }

    allMatches.push(...sfMatches);
    roundNumber++;

    // =========================================================================
    // FINAL AND 3RD PLACE
    // =========================================================================
    const final: SSVBBracketMatch = {
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
      dependsOn: numberOfGroups === 4
        ? {
            teamA: { matchId: sfMatches[0].id, result: 'winner' },
            teamB: { matchId: sfMatches[1].id, result: 'winner' },
          }
        : {
            teamA: { matchId: sfMatches[0].id, result: 'winner' },
            teamB: { matchId: sfMatches[0].id, result: 'loser' },
          },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 1,
      stage: 'final',
      stageLabel: 'Final',
    };

    const thirdPlace: SSVBBracketMatch = {
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
      dependsOn: numberOfGroups === 4
        ? {
            teamA: { matchId: sfMatches[0].id, result: 'loser' },
            teamB: { matchId: sfMatches[1].id, result: 'loser' },
          }
        : {
            teamA: { matchId: qfMatches[0].id, result: 'loser' },
            teamB: { matchId: qfMatches[1].id, result: 'loser' },
          },
      winnerGoesTo: null,
      loserGoesTo: null,
      playoffForPlace: 3,
      stage: '3rd-place',
      stageLabel: '3rd Place Match',
    };

    // Link SF to finals (4 groups)
    if (numberOfGroups === 4) {
      sfMatches[0].winnerGoesTo = { matchId: final.id, slot: 'A' };
      sfMatches[1].winnerGoesTo = { matchId: final.id, slot: 'B' };
      sfMatches[0].loserGoesTo = { matchId: thirdPlace.id, slot: 'A' };
      sfMatches[1].loserGoesTo = { matchId: thirdPlace.id, slot: 'B' };
    } else {
      // For 2 groups, SF winner/loser go to final (it's effectively a SF+final combined)
      sfMatches[0].winnerGoesTo = { matchId: final.id, slot: 'A' };
    }

    allMatches.push(final, thirdPlace);

    return {
      matches: allMatches,
      rounds: roundNumber - startRound + 1,
      totalMatches: allMatches.length,
      eliminatedTeams,
    };
  }

  getExpectedMatchCount(teamCount: number): number {
    // SSVB: IR(4) + QF(4) + SF(2) + Final + 3rd = 12 for 16 teams
    if (teamCount >= 16) {
      return 12;
    } else if (teamCount >= 8) {
      return 6; // IR(2) + QF(2) + Final + 3rd
    }
    return 0;
  }

  getExpectedRoundCount(teamCount: number): number {
    if (teamCount >= 16) {
      return 4; // IR, QF, SF, Finals
    } else if (teamCount >= 8) {
      return 3; // IR, QF, Finals
    }
    return 0;
  }
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Generate an SSVB knockout bracket from group standings
 */
export function generateSSVBKnockout(
  standings: GroupStanding[],
  config: SSVBKnockoutConfig
): SSVBGenerationResult {
  const generator = new SSVBKnockoutGenerator();
  return generator.generateFromGroups(standings, config);
}

/**
 * Get the list of teams eliminated before knockout
 */
export function getEliminatedTeams(
  standings: GroupStanding[],
  config: SSVBKnockoutConfig
): EliminatedTeam[] {
  const eliminated: EliminatedTeam[] = [];

  // Group 4ths are eliminated
  if (config.teamsPerGroup >= 4) {
    const groups = new Set(standings.map((s) => s.groupId));
    for (const groupId of groups) {
      const fourth = standings.find(
        (s) => s.groupId === groupId && s.position === 4
      );
      if (fourth) {
        eliminated.push({
          teamId: fourth.teamId,
          reason: 'group-4th',
          sharedPlacement: { start: config.numberOfGroups * 3 + 1, end: config.numberOfGroups * 4 },
        });
      }
    }
  }

  return eliminated;
}

/**
 * Validate SSVB knockout configuration
 */
export function validateSSVBKnockoutConfig(
  standings: GroupStanding[],
  config: SSVBKnockoutConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check number of groups (2 or 4)
  if (config.numberOfGroups !== 2 && config.numberOfGroups !== 4) {
    errors.push(`SSVB knockout requires 2 or 4 groups, got ${config.numberOfGroups}`);
  }

  // Check teams per group (at least 3 for intermediate round)
  if (config.teamsPerGroup < 3) {
    errors.push(`SSVB knockout requires at least 3 teams per group`);
  }

  // Check standings coverage
  const groups = new Set(standings.map((s) => s.groupId));
  if (groups.size !== config.numberOfGroups) {
    errors.push(
      `Expected ${config.numberOfGroups} groups in standings, found ${groups.size}`
    );
  }

  // Check each group has required positions (1, 2, 3)
  for (const groupId of groups) {
    const groupStandings = standings.filter((s) => s.groupId === groupId);
    const positions = new Set(groupStandings.map((s) => s.position));

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

/**
 * Calculate final placements for SSVB knockout
 * Shared placements for eliminated groups
 */
export function calculateSSVBPlacements(
  result: SSVBGenerationResult,
  _config: SSVBKnockoutConfig // Config may be used for future customization
): Map<string, number | { start: number; end: number }> {
  const placements = new Map<string, number | { start: number; end: number }>();

  // Add eliminated teams with shared placements
  for (const eliminated of result.eliminatedTeams) {
    placements.set(eliminated.teamId, eliminated.sharedPlacement);
  }

  // Individual placements are determined by playoff matches
  // (handled at runtime when matches complete)

  return placements;
}
