import { v4 as uuidv4 } from 'uuid';
import type { Team, Match, Tournament, SetScore, TournamentSystem } from '../../types/tournament';

/**
 * Seeded random number generator for reproducible tests
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Create N teams with sequential seed positions
 */
export function createTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    name: `Team ${i + 1}`,
    seedPosition: i + 1,
  }));
}

/**
 * Create teams with specific names (useful for debugging)
 */
export function createNamedTeams(names: string[]): Team[] {
  return names.map((name, i) => ({
    id: uuidv4(),
    name,
    seedPosition: i + 1,
  }));
}

/**
 * Simulate a single set with random score
 */
export function simulateSet(rng: SeededRandom, pointsToWin: number = 21): SetScore {
  const winner = rng.next() > 0.5 ? 'teamA' : 'teamB';
  const loserPoints = rng.nextInt(5, pointsToWin - 2);

  return winner === 'teamA'
    ? { teamA: pointsToWin, teamB: loserPoints }
    : { teamA: loserPoints, teamB: pointsToWin };
}

/**
 * Simulate a match with random result
 */
export function simulateMatch(
  match: Match,
  rng: SeededRandom,
  setsPerMatch: 1 | 2 | 3 = 1,
  pointsPerSet: number = 21
): Match {
  if (!match.teamAId || !match.teamBId) {
    return match; // Can't simulate pending matches
  }

  const scores: SetScore[] = [];
  let setsA = 0;
  let setsB = 0;
  const setsToWin = setsPerMatch === 3 ? 2 : setsPerMatch;

  while (setsA < setsToWin && setsB < setsToWin) {
    const score = simulateSet(rng, pointsPerSet);
    scores.push(score);
    if (score.teamA > score.teamB) setsA++;
    else setsB++;
  }

  const winnerId = setsA > setsB ? match.teamAId : match.teamBId;

  return {
    ...match,
    scores,
    winnerId,
    status: 'completed',
  };
}

/**
 * Simulate all scheduled matches in a tournament
 */
export function simulateScheduledMatches(
  matches: Match[],
  rng: SeededRandom,
  setsPerMatch: 1 | 2 | 3 = 1,
  pointsPerSet: number = 21
): Match[] {
  return matches.map(match => {
    if (match.status === 'scheduled' && match.teamAId && match.teamBId) {
      return simulateMatch(match, rng, setsPerMatch, pointsPerSet);
    }
    return match;
  });
}

/**
 * Verify all match dependencies reference existing matches
 */
export function verifyDependencies(matches: Match[]): { valid: boolean; errors: string[] } {
  const matchIds = new Set(matches.map(m => m.id));
  const errors: string[] = [];

  for (const match of matches) {
    if (match.dependsOn) {
      if (match.dependsOn.teamA && !matchIds.has(match.dependsOn.teamA.matchId)) {
        errors.push(`Match ${match.matchNumber}: teamA depends on non-existent match ${match.dependsOn.teamA.matchId}`);
      }
      if (match.dependsOn.teamB && !matchIds.has(match.dependsOn.teamB.matchId)) {
        errors.push(`Match ${match.matchNumber}: teamB depends on non-existent match ${match.dependsOn.teamB.matchId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verify no self-matches (team playing against itself)
 */
export function verifyNoSelfMatches(matches: Match[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const match of matches) {
    if (match.teamAId && match.teamBId && match.teamAId === match.teamBId) {
      errors.push(`Match ${match.matchNumber}: Team ${match.teamAId} plays against itself`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verify no duplicate matchups (same pair playing twice)
 */
export function verifyNoDuplicateMatchups(matches: Match[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenPairs = new Set<string>();

  for (const match of matches) {
    if (match.teamAId && match.teamBId) {
      const pair = [match.teamAId, match.teamBId].sort().join('-');
      if (seenPairs.has(pair)) {
        errors.push(`Duplicate matchup: ${match.teamAId} vs ${match.teamBId}`);
      }
      seenPairs.add(pair);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verify all teams participate in at least one match
 */
export function verifyAllTeamsParticipate(matches: Match[], teams: Team[]): { valid: boolean; errors: string[] } {
  const participatingTeamIds = new Set<string>();
  const errors: string[] = [];

  for (const match of matches) {
    if (match.teamAId) participatingTeamIds.add(match.teamAId);
    if (match.teamBId) participatingTeamIds.add(match.teamBId);
  }

  for (const team of teams) {
    if (!participatingTeamIds.has(team.id)) {
      errors.push(`Team ${team.name} (${team.id}) does not participate in any match`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verify all placements are unique (no ties)
 */
export function verifyUniquePlacements(
  placements: { teamId: string; placement: string }[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenPlacements = new Map<string, string>();

  for (const p of placements) {
    // Skip range placements like "5.-8."
    if (p.placement.includes('-')) continue;

    if (seenPlacements.has(p.placement)) {
      errors.push(`Duplicate placement ${p.placement}: teams ${seenPlacements.get(p.placement)} and ${p.teamId}`);
    }
    seenPlacements.set(p.placement, p.teamId);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Count matches by status
 */
export function countMatchesByStatus(matches: Match[]): Record<string, number> {
  const counts: Record<string, number> = {
    scheduled: 0,
    'in-progress': 0,
    completed: 0,
    pending: 0,
  };

  for (const match of matches) {
    counts[match.status] = (counts[match.status] || 0) + 1;
  }

  return counts;
}

/**
 * Get all team IDs from matches
 */
export function getTeamIdsFromMatches(matches: Match[]): Set<string> {
  const teamIds = new Set<string>();
  for (const match of matches) {
    if (match.teamAId) teamIds.add(match.teamAId);
    if (match.teamBId) teamIds.add(match.teamBId);
  }
  return teamIds;
}

/**
 * Calculate expected round-robin match count
 * Accounts for bye handling with odd team count
 */
export function expectedRoundRobinMatchCount(teamCount: number): number {
  return (teamCount * (teamCount - 1)) / 2;
}

/**
 * Calculate expected group phase match count
 * @param groups Number of groups
 * @param teamsPerGroup Teams per group (default 4)
 */
export function expectedGroupPhaseMatchCount(groups: number, teamsPerGroup: number = 4): number {
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  return groups * matchesPerGroup;
}

/**
 * Calculate expected placement tree match count (N-1 matches)
 */
export function expectedPlacementTreeMatchCount(teamCount: number): number {
  return teamCount - 1;
}

/**
 * Create a minimal tournament object for testing
 */
export function createTestTournament(
  teams: Team[],
  system: TournamentSystem = 'round-robin',
  overrides: Partial<Tournament> = {}
): Tournament {
  return {
    id: uuidv4(),
    name: 'Test Tournament',
    system,
    numberOfCourts: 4,
    setsPerMatch: 1,
    pointsPerSet: 21,
    tiebreakerOrder: 'head-to-head-first',
    teams,
    matches: [],
    standings: teams.map(t => ({
      teamId: t.id,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      points: 0,
    })),
    status: 'configuration',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Verify court numbers are within valid range
 */
export function verifyCourtNumbers(matches: Match[], numberOfCourts: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const match of matches) {
    if (match.courtNumber !== null) {
      if (match.courtNumber < 1 || match.courtNumber > numberOfCourts) {
        errors.push(`Match ${match.matchNumber}: Invalid court number ${match.courtNumber} (max: ${numberOfCourts})`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get matches grouped by round
 */
export function getMatchesByRound(matches: Match[]): Map<number, Match[]> {
  const byRound = new Map<number, Match[]>();

  for (const match of matches) {
    const round = match.round;
    if (!byRound.has(round)) {
      byRound.set(round, []);
    }
    byRound.get(round)!.push(match);
  }

  return byRound;
}

/**
 * Verify each round has appropriate number of matches for court count
 */
export function verifyRoundMatchDistribution(matches: Match[], numberOfCourts: number): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const byRound = getMatchesByRound(matches);

  for (const [round, roundMatches] of byRound) {
    if (roundMatches.length > numberOfCourts) {
      // This is not necessarily an error, just a warning that matches will be sequential
      warnings.push(`Round ${round} has ${roundMatches.length} matches but only ${numberOfCourts} courts`);
    }
  }

  return { valid: true, warnings };
}
