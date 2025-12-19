import { v4 as uuidv4 } from 'uuid';
import type { Team, Match, Group, GroupPhaseConfig, GroupStandingEntry } from '../types/tournament';
import { distributeByesAcrossGroups } from './groupConfiguration';

/**
 * Generates groups using Snake-Draft algorithm
 * Teams are distributed in a snake pattern to ensure balanced groups
 * Supports byes (Freilose) when teams don't divide evenly
 *
 * Example with 16 teams and 4 groups:
 * Group A: 1, 8, 9, 16
 * Group B: 2, 7, 10, 15
 * Group C: 3, 6, 11, 14
 * Group D: 4, 5, 12, 13
 */
export function generateSnakeDraftGroups(
  teams: Team[],
  numberOfGroups: number,
  byesNeeded: number = 0
): Group[] {
  const sortedTeams = [...teams].sort((a, b) => a.seedPosition - b.seedPosition);
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const byesPerGroup = byesNeeded > 0 ? distributeByesAcrossGroups(numberOfGroups, byesNeeded) : [];

  const groups: Group[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    groups.push({
      id: uuidv4(),
      name: `Gruppe ${groupNames[i] || (i + 1)}`,
      teamIds: [],
      byeCount: byesPerGroup[i] || 0,
    });
  }

  // Snake draft distribution
  let teamIndex = 0;
  let round = 0;

  while (teamIndex < sortedTeams.length) {
    const isEvenRound = round % 2 === 0;

    if (isEvenRound) {
      for (let g = 0; g < numberOfGroups && teamIndex < sortedTeams.length; g++) {
        groups[g].teamIds.push(sortedTeams[teamIndex].id);
        teamIndex++;
      }
    } else {
      for (let g = numberOfGroups - 1; g >= 0 && teamIndex < sortedTeams.length; g--) {
        groups[g].teamIds.push(sortedTeams[teamIndex].id);
        teamIndex++;
      }
    }
    round++;
  }

  return groups;
}

/**
 * Generates random groups with optional bye support
 */
export function generateRandomGroups(
  teams: Team[],
  numberOfGroups: number,
  byesNeeded: number = 0
): Group[] {
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const byesPerGroup = byesNeeded > 0 ? distributeByesAcrossGroups(numberOfGroups, byesNeeded) : [];

  const groups: Group[] = [];
  for (let i = 0; i < numberOfGroups; i++) {
    groups.push({
      id: uuidv4(),
      name: `Gruppe ${groupNames[i] || (i + 1)}`,
      teamIds: [],
      byeCount: byesPerGroup[i] || 0,
    });
  }

  shuffledTeams.forEach((team, index) => {
    const groupIndex = index % numberOfGroups;
    groups[groupIndex].teamIds.push(team.id);
  });

  return groups;
}

/**
 * Generates groups based on seeding method with optional bye support
 */
export function generateGroups(
  teams: Team[],
  numberOfGroups: number,
  seeding: 'snake' | 'random' | 'manual',
  byesNeeded: number = 0
): Group[] {
  if (seeding === 'snake') {
    return generateSnakeDraftGroups(teams, numberOfGroups, byesNeeded);
  } else if (seeding === 'random') {
    return generateRandomGroups(teams, numberOfGroups, byesNeeded);
  }
  // Manual seeding returns empty groups to be filled manually
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const byesPerGroup = byesNeeded > 0 ? distributeByesAcrossGroups(numberOfGroups, byesNeeded) : [];
  return Array.from({ length: numberOfGroups }, (_, i) => ({
    id: uuidv4(),
    name: `Gruppe ${groupNames[i] || (i + 1)}`,
    teamIds: [],
    byeCount: byesPerGroup[i] || 0,
  }));
}

/**
 * Generates round-robin matches for a single group
 */
export function generateGroupMatches(
  group: Group,
  teams: Team[],
  _numberOfCourts: number,
  startMatchNumber: number,
  startRound: number
): Match[] {
  const matches: Match[] = [];
  const groupTeams = teams.filter(t => group.teamIds.includes(t.id));
  const n = groupTeams.length;

  if (n < 2) return matches;

  // For odd number of teams, add a bye
  const teamList = [...groupTeams];
  if (n % 2 !== 0) {
    teamList.push({ id: 'bye', name: 'Freilos', seedPosition: n + 1 });
  }

  const numTeams = teamList.length;
  const rounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  // Circle method for round-robin
  const fixed = teamList[0];
  const rotating = teamList.slice(1);

  let matchNumber = startMatchNumber;

  for (let round = 0; round < rounds; round++) {
    const currentTeams = [fixed, ...rotating];

    for (let i = 0; i < matchesPerRound; i++) {
      const teamA = currentTeams[i];
      const teamB = currentTeams[numTeams - 1 - i];

      // Skip matches with "bye"
      if (teamA.id === 'bye' || teamB.id === 'bye') {
        continue;
      }

      matches.push({
        id: uuidv4(),
        round: startRound + round,
        matchNumber: matchNumber++,
        teamAId: teamA.id,
        teamBId: teamB.id,
        courtNumber: null, // Will be assigned later
        scores: [],
        winnerId: null,
        status: 'scheduled',
        groupId: group.id,
      });
    }

    // Rotate teams
    rotating.unshift(rotating.pop()!);
  }

  return matches;
}

/**
 * Generates all matches for the group phase
 * Matches are interleaved across groups to allow parallel play
 */
export function generateGroupPhaseMatches(
  config: GroupPhaseConfig,
  teams: Team[],
  numberOfCourts: number
): Match[] {
  const allMatches: Match[] = [];

  // Generate matches for each group
  const groupMatches: Match[][] = [];
  let matchNumber = 1;

  for (const group of config.groups) {
    const matches = generateGroupMatches(
      group,
      teams,
      numberOfCourts,
      matchNumber,
      1
    );
    groupMatches.push(matches);
    matchNumber += matches.length;
  }

  // Interleave matches from different groups
  // This allows matches from different groups to run in parallel
  const maxMatchesPerGroup = Math.max(...groupMatches.map(m => m.length));

  let overallMatchNumber = 1;
  let currentCourt = 1;

  for (let i = 0; i < maxMatchesPerGroup; i++) {
    for (let g = 0; g < groupMatches.length; g++) {
      if (i < groupMatches[g].length) {
        const match = groupMatches[g][i];
        match.matchNumber = overallMatchNumber++;
        match.courtNumber = currentCourt;
        currentCourt = currentCourt >= numberOfCourts ? 1 : currentCourt + 1;
        allMatches.push(match);
      }
    }
  }

  // Assign rounds based on court availability
  let round = 1;
  for (let i = 0; i < allMatches.length; i++) {
    if (i > 0 && i % numberOfCourts === 0) {
      round++;
    }
    allMatches[i].round = round;
  }

  return allMatches;
}

/**
 * Calculates standings for a specific group
 */
export function calculateGroupStandings(
  groupId: string,
  teams: Team[],
  matches: Match[],
  setsPerMatch: number,
  tiebreakerOrder: 'head-to-head-first' | 'point-diff-first'
): GroupStandingEntry[] {
  const groupMatches = matches.filter(m => m.groupId === groupId && m.status === 'completed');
  const groupTeamIds = new Set(
    groupMatches.flatMap(m => [m.teamAId, m.teamBId]).filter((id): id is string => id !== null)
  );
  const groupTeams = teams.filter(t => groupTeamIds.has(t.id));

  // Calculate basic standings
  const standings: GroupStandingEntry[] = groupTeams.map(team => {
    const teamMatches = groupMatches.filter(
      m => m.teamAId === team.id || m.teamBId === team.id
    );

    let won = 0;
    let lost = 0;
    let setsWon = 0;
    let setsLost = 0;
    let pointsWon = 0;
    let pointsLost = 0;

    teamMatches.forEach(match => {
      const isTeamA = match.teamAId === team.id;
      const isWinner = match.winnerId === team.id;

      if (isWinner) won++;
      else lost++;

      match.scores.forEach(score => {
        const teamScore = isTeamA ? score.teamA : score.teamB;
        const oppScore = isTeamA ? score.teamB : score.teamA;

        pointsWon += teamScore;
        pointsLost += oppScore;

        if (teamScore > oppScore) setsWon++;
        else if (oppScore > teamScore) setsLost++;
      });
    });

    // Points calculation based on setsPerMatch
    const points = setsPerMatch === 2 ? setsWon : won;

    return {
      teamId: team.id,
      played: teamMatches.length,
      won,
      lost,
      setsWon,
      setsLost,
      pointsWon,
      pointsLost,
      points,
      groupId,
      groupRank: 0, // Will be calculated after sorting
    };
  });

  // Sort standings
  standings.sort((a, b) => {
    // Primary: points (wins or sets depending on format)
    if (a.points !== b.points) return b.points - a.points;

    // Secondary: based on tiebreaker order
    if (tiebreakerOrder === 'head-to-head-first') {
      // Check head-to-head
      const headToHead = getHeadToHeadResult(a.teamId, b.teamId, groupMatches);
      if (headToHead !== 0) return headToHead;

      // Then point difference
      const pointDiffA = a.pointsWon - a.pointsLost;
      const pointDiffB = b.pointsWon - b.pointsLost;
      if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA;
    } else {
      // Point difference first
      const pointDiffA = a.pointsWon - a.pointsLost;
      const pointDiffB = b.pointsWon - b.pointsLost;
      if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA;

      // Then head-to-head
      const headToHead = getHeadToHeadResult(a.teamId, b.teamId, groupMatches);
      if (headToHead !== 0) return headToHead;
    }

    // Tertiary: set difference
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    return setDiffB - setDiffA;
  });

  // Assign ranks
  standings.forEach((entry, index) => {
    entry.groupRank = index + 1;
  });

  return standings;
}

/**
 * Returns head-to-head result between two teams
 * Returns positive if teamA won, negative if teamB won, 0 if tied or not played
 */
function getHeadToHeadResult(teamAId: string, teamBId: string, matches: Match[]): number {
  const match = matches.find(
    m => (m.teamAId === teamAId && m.teamBId === teamBId) ||
         (m.teamAId === teamBId && m.teamBId === teamAId)
  );

  if (!match || !match.winnerId) return 0;

  if (match.winnerId === teamAId) return -1; // teamA is better (lower in sort)
  if (match.winnerId === teamBId) return 1;  // teamB is better
  return 0;
}

/**
 * Calculates standings for all groups
 */
export function calculateAllGroupStandings(
  config: GroupPhaseConfig,
  teams: Team[],
  matches: Match[],
  setsPerMatch: number,
  tiebreakerOrder: 'head-to-head-first' | 'point-diff-first'
): GroupStandingEntry[] {
  const allStandings: GroupStandingEntry[] = [];

  for (const group of config.groups) {
    const groupStandings = calculateGroupStandings(
      group.id,
      teams,
      matches,
      setsPerMatch,
      tiebreakerOrder
    );
    allStandings.push(...groupStandings);
  }

  return allStandings;
}

/**
 * Gets teams by their group rank across all groups
 * e.g., getAllTeamsByRank(standings, 1) returns all group winners
 */
export function getTeamsByGroupRank(
  standings: GroupStandingEntry[],
  rank: number
): GroupStandingEntry[] {
  return standings.filter(s => s.groupRank === rank);
}

