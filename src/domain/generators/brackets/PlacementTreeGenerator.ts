/**
 * Placement Tree Bracket Generator
 *
 * Generates a full placement tree where every team plays until a final
 * placement (1st through Nth) is determined.
 *
 * Structure:
 * - Winners advance to compete for higher placements
 * - Losers advance to compete for lower placements
 * - No team is eliminated until their final placement is determined
 *
 * Example (8 teams):
 * Round 1: 4 matches determining places 1-8
 * Round 2: 4 matches (2 for 1-4, 2 for 5-8)
 * Round 3: 4 finals (1st, 3rd, 5th, 7th place matches)
 *
 * @see docs/tournament-modes-specification.md Section 3A
 */

import {
  type BracketGenerator,
  type BracketConfig,
  type BracketTeamSeed,
  type BracketGenerationResult,
  type BracketMatch,
  bracketRoundCount,
  generateMatchId,
} from './BracketGenerator';

// =============================================================================
// PLACEMENT TREE GENERATOR
// =============================================================================

export class PlacementTreeGenerator implements BracketGenerator {
  readonly name = 'placement-tree';

  generate(teams: BracketTeamSeed[], config: BracketConfig): BracketGenerationResult {
    const { courts, startMatchNumber = 1, startRound = 1 } = config;

    if (teams.length < 2) {
      return { matches: [], rounds: 0, totalMatches: 0 };
    }

    const numTeams = teams.length;
    const numRounds = bracketRoundCount(numTeams);
    const allMatches: BracketMatch[] = [];

    // Sort teams by seed
    const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);

    let matchNumber = startMatchNumber;

    // Generate Round 1 matches
    const round1Matches = this.generateRound1(sortedTeams, courts, matchNumber, startRound);
    allMatches.push(...round1Matches);
    matchNumber += round1Matches.length;

    // Generate subsequent rounds
    let prevRoundMatches = round1Matches;
    for (let round = 2; round <= numRounds; round++) {
      const roundMatches = this.generateSubsequentRound(
        prevRoundMatches,
        round,
        courts,
        matchNumber,
        startRound + round - 1
      );
      allMatches.push(...roundMatches);
      matchNumber += roundMatches.length;
      prevRoundMatches = roundMatches;
    }

    // Link matches (set winnerGoesTo and loserGoesTo)
    this.linkMatches(allMatches);

    return {
      matches: allMatches,
      rounds: numRounds,
      totalMatches: allMatches.length,
    };
  }

  getExpectedMatchCount(teamCount: number): number {
    // Full placement tree: every team plays until final placement
    // Total matches = teamCount - 1 for pure bracket
    // Plus consolation matches (also teamCount - 1 total progression)
    // Actually: n-1 matches to determine champion + (n-1) matches for full placement
    // Simplified: For n teams, we need n-1 total matchups to separate all placements
    // But with double-sided tree, it's approximately 2*(n-1) - n/2
    // More accurate: sum of matches at each interval level

    if (teamCount < 2) return 0;
    // For full placement tree: approximately (n-1) * 2 for full placement
    return (teamCount - 1) * 2 - Math.floor(teamCount / 2) + 1;
  }

  getExpectedRoundCount(teamCount: number): number {
    return bracketRoundCount(teamCount);
  }

  /**
   * Generate Round 1 matches
   * Pairs teams by seed: 1 vs last, 2 vs second-to-last, etc.
   */
  private generateRound1(
    teams: BracketTeamSeed[],
    courts: number,
    startMatchNumber: number,
    round: number
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];
    const numTeams = teams.length;
    const numMatches = Math.floor(numTeams / 2);
    let matchNumber = startMatchNumber;

    for (let i = 0; i < numMatches; i++) {
      const teamAIndex = i;
      const teamBIndex = numTeams - 1 - i;

      const match: BracketMatch = {
        id: generateMatchId(),
        round,
        matchNumber: matchNumber++,
        bracketPosition: i + 1,
        teamAId: teams[teamAIndex].id,
        teamBId: teams[teamBIndex].id,
        courtNumber: (i % courts) + 1,
        placementInterval: { start: 1, end: numTeams },
        winnerInterval: { start: 1, end: Math.ceil(numTeams / 2) },
        loserInterval: { start: Math.ceil(numTeams / 2) + 1, end: numTeams },
        winnerGoesTo: null, // Will be set in linkMatches
        loserGoesTo: null,  // Will be set in linkMatches
      };

      matches.push(match);
    }

    return matches;
  }

  /**
   * Generate matches for subsequent rounds based on previous round intervals
   */
  private generateSubsequentRound(
    prevRoundMatches: BracketMatch[],
    _round: number,
    courts: number,
    startMatchNumber: number,
    roundNumber: number
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];
    let matchNumber = startMatchNumber;
    let bracketPosition = 1;

    // Group previous matches by their output intervals
    const winnerIntervalGroups = new Map<string, BracketMatch[]>();
    const loserIntervalGroups = new Map<string, BracketMatch[]>();

    for (const match of prevRoundMatches) {
      if (match.winnerInterval) {
        const key = `${match.winnerInterval.start}-${match.winnerInterval.end}`;
        if (!winnerIntervalGroups.has(key)) {
          winnerIntervalGroups.set(key, []);
        }
        winnerIntervalGroups.get(key)!.push(match);
      }

      if (match.loserInterval) {
        const key = `${match.loserInterval.start}-${match.loserInterval.end}`;
        if (!loserIntervalGroups.has(key)) {
          loserIntervalGroups.set(key, []);
        }
        loserIntervalGroups.get(key)!.push(match);
      }
    }

    // Combine all intervals
    const allIntervals = new Set([
      ...winnerIntervalGroups.keys(),
      ...loserIntervalGroups.keys(),
    ]);

    // Generate matches for each interval
    for (const intervalKey of allIntervals) {
      const [start, end] = intervalKey.split('-').map(Number);
      const intervalSize = end - start + 1;

      // Collect all matches feeding into this interval
      const feedingMatches: { match: BracketMatch; result: 'winner' | 'loser' }[] = [];

      const winnerMatches = winnerIntervalGroups.get(intervalKey) || [];
      for (const m of winnerMatches) {
        feedingMatches.push({ match: m, result: 'winner' });
      }

      const loserMatches = loserIntervalGroups.get(intervalKey) || [];
      for (const m of loserMatches) {
        feedingMatches.push({ match: m, result: 'loser' });
      }

      // Sort by bracket position for consistent pairing
      feedingMatches.sort((a, b) => a.match.bracketPosition - b.match.bracketPosition);

      const numMatchesInInterval = Math.floor(feedingMatches.length / 2);
      const mid = start + Math.floor((end - start) / 2);

      // Determine next intervals (null if this is a final)
      const isFinal = intervalSize === 2;
      const newWinnerInterval = isFinal ? null : { start, end: mid };
      const newLoserInterval = isFinal ? null : { start: mid + 1, end };

      // Create matches for this interval
      for (let i = 0; i < numMatchesInInterval; i++) {
        const matchA = feedingMatches[i];
        const matchB = feedingMatches[feedingMatches.length - 1 - i];

        const match: BracketMatch = {
          id: generateMatchId(),
          round: roundNumber,
          matchNumber: matchNumber++,
          bracketPosition: bracketPosition++,
          teamAId: null,
          teamBId: null,
          courtNumber: ((bracketPosition - 2) % courts) + 1,
          placementInterval: { start, end },
          winnerInterval: newWinnerInterval,
          loserInterval: newLoserInterval,
          dependsOn: {
            teamA: { matchId: matchA.match.id, result: matchA.result },
            teamB: { matchId: matchB.match.id, result: matchB.result },
          },
          winnerGoesTo: null,
          loserGoesTo: null,
          playoffForPlace: isFinal ? start : undefined,
        };

        matches.push(match);
      }
    }

    // Sort by bracket position
    matches.sort((a, b) => a.bracketPosition - b.bracketPosition);

    return matches;
  }

  /**
   * Link matches by setting winnerGoesTo and loserGoesTo
   */
  private linkMatches(allMatches: BracketMatch[]): void {

    for (const match of allMatches) {
      // Find matches that depend on this match's winner
      for (const nextMatch of allMatches) {
        if (nextMatch.dependsOn?.teamA?.matchId === match.id) {
          if (nextMatch.dependsOn.teamA.result === 'winner') {
            match.winnerGoesTo = { matchId: nextMatch.id, slot: 'A' };
          } else {
            match.loserGoesTo = { matchId: nextMatch.id, slot: 'A' };
          }
        }
        if (nextMatch.dependsOn?.teamB?.matchId === match.id) {
          if (nextMatch.dependsOn.teamB.result === 'winner') {
            match.winnerGoesTo = { matchId: nextMatch.id, slot: 'B' };
          } else {
            match.loserGoesTo = { matchId: nextMatch.id, slot: 'B' };
          }
        }
      }
    }
  }
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Generate a placement tree bracket
 */
export function generatePlacementTreeBracket(
  teamCount: number,
  config: BracketConfig
): BracketGenerationResult {
  const teams: BracketTeamSeed[] = Array.from({ length: teamCount }, (_, i) => ({
    id: `team-${i + 1}`,
    seed: i + 1,
  }));

  const generator = new PlacementTreeGenerator();
  return generator.generate(teams, config);
}

/**
 * Validate a placement tree bracket
 */
export function validatePlacementTreeBracket(
  matches: BracketMatch[],
  teamCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all teams are assigned in Round 1
  const round1Matches = matches.filter((m) => m.round === 1 || (m.dependsOn === undefined));
  const assignedTeams = new Set<string>();
  for (const match of round1Matches) {
    if (match.teamAId) assignedTeams.add(match.teamAId);
    if (match.teamBId) assignedTeams.add(match.teamBId);
  }

  if (assignedTeams.size !== teamCount) {
    errors.push(`Expected ${teamCount} teams in Round 1, found ${assignedTeams.size}`);
  }

  // Check dependencies form valid chains
  const matchById = new Map(matches.map((m) => [m.id, m]));
  for (const match of matches) {
    if (match.dependsOn?.teamA) {
      if (!matchById.has(match.dependsOn.teamA.matchId)) {
        errors.push(`Match ${match.id} depends on non-existent match ${match.dependsOn.teamA.matchId}`);
      }
    }
    if (match.dependsOn?.teamB) {
      if (!matchById.has(match.dependsOn.teamB.matchId)) {
        errors.push(`Match ${match.id} depends on non-existent match ${match.dependsOn.teamB.matchId}`);
      }
    }
  }

  // Check all final placements are covered
  const finalMatches = matches.filter((m) => m.playoffForPlace !== undefined);
  const placements = new Set(finalMatches.map((m) => m.playoffForPlace));
  for (let i = 1; i < teamCount; i += 2) {
    if (!placements.has(i)) {
      errors.push(`Missing final for place ${i}/${i + 1}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
