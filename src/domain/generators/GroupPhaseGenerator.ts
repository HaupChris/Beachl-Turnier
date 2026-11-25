/**
 * Group Phase Match Generator
 *
 * Implements group distribution algorithms and match generation for
 * group-based tournament systems.
 *
 * Algorithms:
 * - Snake seeding: Distribute teams in snake pattern for balanced groups
 * - Random: Distribute teams randomly
 * - Round-robin within groups: Each team plays every other team in group
 *
 * @see docs/tournament-modes-specification.md Section 3.0
 */

import {
  type MatchGenerator,
  type TeamInput,
  type GeneratorConfig,
  type GenerationResult,
  type GeneratedMatch,
  roundRobinMatchCount,
} from './MatchGenerator';
import { RoundRobinGenerator } from './RoundRobinGenerator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Group distribution result
 */
export interface GroupDistribution {
  groupIndex: number;
  groupName: string;
  teamIndices: number[];
  byeCount: number;
}

/**
 * Configuration for group phase generation
 */
export interface GroupPhaseConfig {
  /** Number of groups */
  numberOfGroups: number;
  /** Seeding method */
  seeding: 'snake' | 'random' | 'manual';
  /** Number of byes needed (for non-divisible team counts) */
  byesNeeded?: number;
}

/**
 * Result of group match generation
 */
export interface GroupMatchResult {
  groupIndex: number;
  groupName: string;
  matches: GeneratedMatch[];
}

// =============================================================================
// GROUP PHASE GENERATOR
// =============================================================================

export class GroupPhaseGenerator implements MatchGenerator {
  readonly name = 'group-phase';

  private roundRobinGenerator = new RoundRobinGenerator();

  generate(teams: TeamInput[], config: GeneratorConfig): GenerationResult {
    // Default to 2 groups with snake seeding
    return this.generateWithConfig(teams, config, {
      numberOfGroups: 2,
      seeding: 'snake',
    });
  }

  generateWithConfig(
    teams: TeamInput[],
    config: GeneratorConfig,
    groupConfig: GroupPhaseConfig
  ): GenerationResult {
    const { courts, startMatchNumber = 1, startRound = 1 } = config;
    const { numberOfGroups, seeding, byesNeeded = 0 } = groupConfig;

    if (teams.length < 2 || numberOfGroups < 1) {
      return { matches: [], rounds: 0, matchesPerRound: 0 };
    }
    if (numberOfGroups % 2 !== 0) {
      throw new Error('Group-based systems require an even number of groups');
    }

    // Distribute teams into groups
    const groups = this.distributeTeams(teams.length, numberOfGroups, seeding, byesNeeded);

    // Generate matches for each group
    const groupMatches: GroupMatchResult[] = [];
    let totalMatchCount = 0;

    for (const group of groups) {
      const groupTeams = group.teamIndices.map((idx) => teams[idx]);
      const result = this.roundRobinGenerator.generate(groupTeams, {
        courts,
        startMatchNumber: 1, // We'll renumber after interleaving
        startRound: 1,
      });

      // Add group information to matches
      const matchesWithGroup = result.matches.map((m) => ({
        ...m,
        groupIndex: group.groupIndex,
        groupName: group.groupName,
      }));

      groupMatches.push({
        groupIndex: group.groupIndex,
        groupName: group.groupName,
        matches: matchesWithGroup,
      });

      totalMatchCount += result.matches.length;
    }

    // Interleave matches from different groups
    const interleavedMatches = this.interleaveMatches(
      groupMatches,
      courts,
      startMatchNumber,
      startRound
    );

    // Calculate total rounds
    const totalRounds = Math.ceil((totalMatchCount) / courts);

    return {
      matches: interleavedMatches,
      rounds: totalRounds,
      matchesPerRound: courts,
    };
  }

  getExpectedMatchCount(teamCount: number): number {
    // Assumes 2 groups with equal distribution
    const teamsPerGroup = Math.ceil(teamCount / 2);
    return 2 * roundRobinMatchCount(teamsPerGroup);
  }

  getExpectedRoundCount(teamCount: number): number {
    // Assumes 2 groups with equal distribution
    const teamsPerGroup = Math.ceil(teamCount / 2);
    return teamsPerGroup - 1;
  }

  /**
   * Distribute teams into groups using specified seeding method
   */
  distributeTeams(
    teamCount: number,
    numberOfGroups: number,
    seeding: 'snake' | 'random' | 'manual',
    byesNeeded: number = 0
  ): GroupDistribution[] {
    if (seeding === 'snake') {
      return this.snakeSeeding(teamCount, numberOfGroups, byesNeeded);
    } else if (seeding === 'random') {
      return this.randomSeeding(teamCount, numberOfGroups, byesNeeded);
    } else {
      // Manual: return empty groups
      return this.emptyGroups(numberOfGroups, byesNeeded);
    }
  }

  /**
   * Snake seeding algorithm
   *
   * Distributes teams in a snake pattern:
   * - Row 1: A, B, C, D (left to right)
   * - Row 2: D, C, B, A (right to left)
   * - Row 3: A, B, C, D (left to right)
   * - etc.
   */
  snakeSeeding(
    teamCount: number,
    numberOfGroups: number,
    byesNeeded: number = 0
  ): GroupDistribution[] {
    const groups = this.createEmptyGroups(numberOfGroups, byesNeeded);

    for (let i = 0; i < teamCount; i++) {
      const row = Math.floor(i / numberOfGroups);
      let groupIndex: number;

      if (row % 2 === 0) {
        // Left to right
        groupIndex = i % numberOfGroups;
      } else {
        // Right to left
        groupIndex = numberOfGroups - 1 - (i % numberOfGroups);
      }

      groups[groupIndex].teamIndices.push(i);
    }

    return groups;
  }

  /**
   * Random seeding - distributes teams randomly across groups
   */
  randomSeeding(
    teamCount: number,
    numberOfGroups: number,
    byesNeeded: number = 0
  ): GroupDistribution[] {
    const groups = this.createEmptyGroups(numberOfGroups, byesNeeded);

    // Create shuffled indices
    const indices = Array.from({ length: teamCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Distribute to groups round-robin style
    for (let i = 0; i < indices.length; i++) {
      const groupIndex = i % numberOfGroups;
      groups[groupIndex].teamIndices.push(indices[i]);
    }

    return groups;
  }

  /**
   * Create empty groups for manual seeding
   */
  emptyGroups(numberOfGroups: number, byesNeeded: number = 0): GroupDistribution[] {
    return this.createEmptyGroups(numberOfGroups, byesNeeded);
  }

  /**
   * Create empty group structures
   */
  private createEmptyGroups(numberOfGroups: number, byesNeeded: number): GroupDistribution[] {
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const byesPerGroup = this.distributeByesAcrossGroups(numberOfGroups, byesNeeded);

    return Array.from({ length: numberOfGroups }, (_, i) => ({
      groupIndex: i,
      groupName: `Group ${groupNames[i] || (i + 1)}`,
      teamIndices: [],
      byeCount: byesPerGroup[i] || 0,
    }));
  }

  /**
   * Distribute byes evenly across groups, favoring later groups
   */
  private distributeByesAcrossGroups(numberOfGroups: number, byesNeeded: number): number[] {
    const byesPerGroup = Array(numberOfGroups).fill(0);

    // Distribute byes from last group backwards
    for (let i = 0; i < byesNeeded; i++) {
      const groupIndex = numberOfGroups - 1 - (i % numberOfGroups);
      byesPerGroup[groupIndex]++;
    }

    return byesPerGroup;
  }

  /**
   * Interleave matches from different groups for parallel play
   */
  interleaveMatches(
    groupMatches: GroupMatchResult[],
    courts: number,
    startMatchNumber: number,
    startRound: number
  ): GeneratedMatch[] {
    const result: GeneratedMatch[] = [];
    const maxMatches = Math.max(...groupMatches.map((g) => g.matches.length));

    let matchNumber = startMatchNumber;
    let currentCourt = 1;
    let currentRound = startRound;
    let matchesInRound = 0;

    // Interleave: take one match from each group in sequence
    for (let i = 0; i < maxMatches; i++) {
      for (const group of groupMatches) {
        if (i < group.matches.length) {
          const match = group.matches[i];

          // Assign new round when courts are full
          if (matchesInRound >= courts) {
            currentRound++;
            currentCourt = 1;
            matchesInRound = 0;
          }

          result.push({
            ...match,
            matchNumber: matchNumber++,
            round: currentRound,
            courtNumber: currentCourt <= courts ? currentCourt : null,
          });

          currentCourt++;
          matchesInRound++;
        }
      }
    }

    return result;
  }
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Generate snake seeding distribution
 */
export function generateSnakeSeeding(
  teamCount: number,
  numberOfGroups: number
): GroupDistribution[] {
  const generator = new GroupPhaseGenerator();
  return generator.snakeSeeding(teamCount, numberOfGroups);
}

/**
 * Validate snake seeding distribution
 */
export function validateSnakeSeeding(
  distribution: GroupDistribution[],
  teamCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all teams are assigned
  const allTeamIndices = new Set<number>();
  for (const group of distribution) {
    for (const idx of group.teamIndices) {
      if (allTeamIndices.has(idx)) {
        errors.push(`Team index ${idx} appears in multiple groups`);
      }
      allTeamIndices.add(idx);
    }
  }

  if (allTeamIndices.size !== teamCount) {
    errors.push(`Expected ${teamCount} teams, found ${allTeamIndices.size}`);
  }

  // Check balance (groups should differ by at most 1 team)
  const groupSizes = distribution.map((g) => g.teamIndices.length);
  const minSize = Math.min(...groupSizes);
  const maxSize = Math.max(...groupSizes);
  if (maxSize - minSize > 1) {
    errors.push(`Group sizes not balanced: min=${minSize}, max=${maxSize}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get expected team distribution for snake seeding
 *
 * Example for 16 teams, 4 groups:
 * - Group A: Seeds 1, 8, 9, 16
 * - Group B: Seeds 2, 7, 10, 15
 * - Group C: Seeds 3, 6, 11, 14
 * - Group D: Seeds 4, 5, 12, 13
 */
export function getExpectedSnakeDistribution(
  teamCount: number,
  numberOfGroups: number
): Map<number, number[]> {
  const distribution = generateSnakeSeeding(teamCount, numberOfGroups);
  const result = new Map<number, number[]>();

  for (const group of distribution) {
    // Convert 0-indexed to 1-indexed seeds
    result.set(group.groupIndex, group.teamIndices.map((i) => i + 1));
  }

  return result;
}

/**
 * Calculate expected group match count
 */
export function getGroupPhaseMatchCount(
  teamCount: number,
  numberOfGroups: number
): number {
  const teamsPerGroup = Math.ceil(teamCount / numberOfGroups);
  return numberOfGroups * roundRobinMatchCount(teamsPerGroup);
}
