import { v4 as uuidv4 } from 'uuid';
import type {
  Match,
  Team,
  Tournament,
  GroupStandingEntry,
  KnockoutSettings,
  StandingEntry,
  Group,
  KnockoutRoundType,
} from '../types/tournament';

/**
 * BeachL-All-Platzierungen: Full Placement Tree
 *
 * All placements 1..N are played out in a complete placement tree.
 * No tied placements - every position is uniquely determined.
 *
 * Algorithm:
 * 1. Start with interval [1..N]
 * 2. Each round partitions each active interval [a..b] into two equal subintervals
 * 3. Winners go to better interval [a..mid], losers go to worse interval [mid+1..b]
 * 4. When interval size is 2, the match determines exact placements (winner=a, loser=b)
 *
 * For 16 teams:
 * - Round 1: 8 matches, [1..16] → [1..8] + [9..16]
 * - Round 2: 8 matches, [1..8] → [1..4]+[5..8], [9..16] → [9..12]+[13..16]
 * - Round 3: 8 matches (semifinals within each interval of 4)
 * - Round 4: 8 finals (each determining 2 placements)
 *
 * Total: N-1 matches (15 for 16 teams)
 */

interface PlacementToken {
  teamId: string;
  currentInterval: { start: number; end: number };
  positionInInterval: number; // Position within current interval (for matchmaking)
}

/**
 * Generates the placement tree knockout tournament from group phase results
 */
export function generatePlacementTreeTournament(
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[],
  settings: KnockoutSettings
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  // Get groups from parent tournament
  const groups = parentTournament.groupPhaseConfig?.groups || [];

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];

  // Create seed order based on group standings
  // All 1st places (sorted), then all 2nd places, etc.
  const seedOrder = createSeedOrder(groupStandings, groups);

  seedOrder.forEach((standing, index) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    const newId = uuidv4();
    teamIdMap.set(standing.teamId, newId);
    teams.push({
      id: newId,
      name: originalTeam.name,
      seedPosition: index + 1,
    });
  });

  // Generate placement tree matches
  const matches = generatePlacementTreeMatches(
    teams,
    parentTournament.numberOfCourts
  );

  // Initialize standings
  const standings: StandingEntry[] = teams.map(t => ({
    teamId: t.id,
    played: 0,
    won: 0,
    lost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  }));

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - Platzierungsbaum`,
    system: 'placement-tree',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    teams: [],
    matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig: {
      directQualification: 0,
      playoffQualification: 0,
      eliminated: 0,
      playThirdPlaceMatch: true, // All matches are "placement" matches
      useReferees: settings.useReferees,
    },
    eliminatedTeamIds: [],
  };

  return { tournament, teams, eliminatedTeamIds: [] };
}

/**
 * Creates the seed order from group standings
 * Priority: Group rank first, then within same rank by group order
 */
function createSeedOrder(
  groupStandings: GroupStandingEntry[],
  groups: Group[]
): GroupStandingEntry[] {
  const maxRank = Math.max(...groupStandings.map(s => s.groupRank));
  const result: GroupStandingEntry[] = [];

  for (let rank = 1; rank <= maxRank; rank++) {
    const teamsWithRank = groupStandings
      .filter(s => s.groupRank === rank)
      .sort((a, b) => {
        // Sort by group order (A=0, B=1, C=2, D=3)
        const groupIndexA = groups.findIndex(g => g.id === a.groupId);
        const groupIndexB = groups.findIndex(g => g.id === b.groupId);
        return groupIndexA - groupIndexB;
      });
    result.push(...teamsWithRank);
  }

  return result;
}

/**
 * Generates all matches for the placement tree
 */
function generatePlacementTreeMatches(
  teams: Team[],
  numberOfCourts: number
): Match[] {
  const numTeams = teams.length;
  const matches: Match[] = [];
  let matchNumber = 1;

  // Calculate number of rounds needed
  // For N teams, we need log2(N) rounds
  const numRounds = Math.ceil(Math.log2(numTeams));

  // Track team positions in intervals
  // Initially all teams are in interval [1..N]
  const teamPositions = new Map<string, PlacementToken>();
  teams.forEach((team, index) => {
    teamPositions.set(team.id, {
      teamId: team.id,
      currentInterval: { start: 1, end: numTeams },
      positionInInterval: index + 1,
    });
  });

  // Round 1: Initial matches based on seeding
  // Pair teams: 1 vs last, 2 vs second-to-last, etc.
  const round1Matches = generateRound1Matches(teams, numberOfCourts, matchNumber);
  matches.push(...round1Matches);
  matchNumber += round1Matches.length;

  // Generate subsequent rounds with dependencies
  let prevRoundMatches = round1Matches;

  for (let round = 2; round <= numRounds; round++) {
    const roundMatches = generateSubsequentRoundMatches(
      prevRoundMatches,
      round,
      numTeams,
      numberOfCourts,
      matchNumber
    );
    matches.push(...roundMatches);
    matchNumber += roundMatches.length;
    prevRoundMatches = roundMatches;
  }

  return matches;
}

/**
 * Generate Round 1 matches: pair by seed (1 vs last, 2 vs second-to-last, etc.)
 */
function generateRound1Matches(
  teams: Team[],
  numberOfCourts: number,
  startMatchNumber: number
): Match[] {
  const matches: Match[] = [];
  const numTeams = teams.length;
  const numMatches = numTeams / 2;
  let matchNumber = startMatchNumber;

  for (let i = 0; i < numMatches; i++) {
    const teamAIndex = i; // Seeds 1, 2, 3, 4, 5, 6, 7, 8
    const teamBIndex = numTeams - 1 - i; // Seeds 16, 15, 14, 13, 12, 11, 10, 9

    const match: Match = {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: teams[teamAIndex].id,
      teamBId: teams[teamBIndex].id,
      courtNumber: (i % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'placement-round-1',
      bracketPosition: i + 1,
      placementInterval: { start: 1, end: numTeams },
      winnerInterval: { start: 1, end: numTeams / 2 },
      loserInterval: { start: numTeams / 2 + 1, end: numTeams },
    };

    matches.push(match);
  }

  return matches;
}

/**
 * Generate matches for subsequent rounds with dependencies
 */
function generateSubsequentRoundMatches(
  prevRoundMatches: Match[],
  round: number,
  _totalTeams: number,
  numberOfCourts: number,
  startMatchNumber: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let bracketPosition = 1;

  // Group previous matches by their winner/loser intervals
  const winnerIntervalGroups = new Map<string, Match[]>();
  const loserIntervalGroups = new Map<string, Match[]>();

  prevRoundMatches.forEach(match => {
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
  });

  // Process each interval group
  const allIntervals = new Set([...winnerIntervalGroups.keys(), ...loserIntervalGroups.keys()]);

  for (const intervalKey of allIntervals) {
    const [start, end] = intervalKey.split('-').map(Number);
    const intervalSize = end - start + 1;

    // Get matches feeding into this interval
    const feedingMatches: { match: Match; result: 'winner' | 'loser' }[] = [];

    // Add winners from matches where this is the winner interval
    const winnerMatches = winnerIntervalGroups.get(intervalKey) || [];
    winnerMatches.forEach(m => feedingMatches.push({ match: m, result: 'winner' }));

    // Add losers from matches where this is the loser interval
    const loserMatches = loserIntervalGroups.get(intervalKey) || [];
    loserMatches.forEach(m => feedingMatches.push({ match: m, result: 'loser' }));

    // Sort feeding matches by bracket position to maintain deterministic pairing
    feedingMatches.sort((a, b) => (a.match.bracketPosition || 0) - (b.match.bracketPosition || 0));

    // Create matches for this interval
    const numMatchesInInterval = feedingMatches.length / 2;
    const mid = start + Math.floor((end - start) / 2);

    // Determine new intervals for winners/losers
    const newWinnerInterval = intervalSize === 2
      ? null // Terminal match
      : { start, end: mid };
    const newLoserInterval = intervalSize === 2
      ? null // Terminal match
      : { start: mid + 1, end };

    // Determine knockout round type
    let knockoutRound: KnockoutRoundType;
    if (intervalSize === 2) {
      knockoutRound = 'placement-final';
    } else if (round === 2) {
      knockoutRound = 'placement-round-2';
    } else if (round === 3) {
      knockoutRound = 'placement-round-3';
    } else {
      knockoutRound = 'placement-round-4';
    }

    // Pair: first with last, second with second-to-last within interval
    for (let i = 0; i < numMatchesInInterval; i++) {
      const matchA = feedingMatches[i];
      const matchB = feedingMatches[feedingMatches.length - 1 - i];

      const match: Match = {
        id: uuidv4(),
        round,
        matchNumber: matchNumber++,
        teamAId: null,
        teamBId: null,
        courtNumber: (bracketPosition - 1) % numberOfCourts + 1,
        scores: [],
        winnerId: null,
        status: 'pending',
        knockoutRound,
        bracketPosition: bracketPosition++,
        placementInterval: { start, end },
        winnerInterval: newWinnerInterval || undefined,
        loserInterval: newLoserInterval || undefined,
        playoffForPlace: intervalSize === 2 ? start : undefined, // For final matches, set the place
        dependsOn: {
          teamA: { matchId: matchA.match.id, result: matchA.result },
          teamB: { matchId: matchB.match.id, result: matchB.result },
        },
      };

      matches.push(match);
    }
  }

  // Sort by bracket position
  matches.sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));

  return matches;
}

/**
 * Updates placement tree bracket after a match is completed
 * Propagates winners/losers to dependent matches
 */
export function updatePlacementTreeBracket(
  matches: Match[],
  completedMatchId: string
): Match[] {
  const completedMatch = matches.find(m => m.id === completedMatchId);
  if (!completedMatch || !completedMatch.winnerId) return matches;

  const loserId = completedMatch.teamAId === completedMatch.winnerId
    ? completedMatch.teamBId
    : completedMatch.teamAId;

  return matches.map(match => {
    if (!match.dependsOn) return match;

    let updated = { ...match };
    let shouldActivate = false;

    // Check if teamA depends on this match
    if (match.dependsOn.teamA?.matchId === completedMatchId) {
      const teamId = match.dependsOn.teamA.result === 'winner'
        ? completedMatch.winnerId
        : loserId;
      updated = { ...updated, teamAId: teamId };
      shouldActivate = true;
    }

    // Check if teamB depends on this match
    if (match.dependsOn.teamB?.matchId === completedMatchId) {
      const teamId = match.dependsOn.teamB.result === 'winner'
        ? completedMatch.winnerId
        : loserId;
      updated = { ...updated, teamBId: teamId };
      shouldActivate = true;
    }

    // If both teams are now assigned, change status from pending to scheduled
    if (shouldActivate && updated.teamAId && updated.teamBId && updated.status === 'pending') {
      updated = { ...updated, status: 'scheduled' };
    }

    return updated;
  });
}

/**
 * Calculates final placements for placement tree
 */
export function calculatePlacementTreePlacements(
  matches: Match[],
  _teams: Team[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  // Find all terminal matches (placement-final or with playoffForPlace)
  const finalMatches = matches.filter(m =>
    m.knockoutRound === 'placement-final' || m.playoffForPlace !== undefined
  );

  finalMatches.forEach(match => {
    if (match.status !== 'completed' || !match.winnerId) return;

    const place = match.playoffForPlace || match.placementInterval?.start;
    if (place === undefined) return;

    placements.push({ teamId: match.winnerId, placement: `${place}.` });

    const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
    if (loserId) {
      placements.push({ teamId: loserId, placement: `${place + 1}.` });
    }
  });

  return placements.sort((a, b) => parseInt(a.placement) - parseInt(b.placement));
}

/**
 * Gets the placement round label in German
 */
export function getPlacementRoundLabel(round: KnockoutRoundType, interval?: { start: number; end: number }): string {
  if (round === 'placement-final' && interval) {
    return `Spiel um Platz ${interval.start}`;
  }

  switch (round) {
    case 'placement-round-1':
      return 'Platzierungsrunde 1';
    case 'placement-round-2':
      return 'Platzierungsrunde 2';
    case 'placement-round-3':
      return 'Platzierungsrunde 3';
    case 'placement-round-4':
      return 'Platzierungsrunde 4';
    case 'placement-final':
      return 'Platzierungsfinale';
    default:
      return 'Platzierungsrunde';
  }
}

/**
 * Returns the total number of matches in placement tree format
 * For N teams: N-1 matches
 */
export function getPlacementTreeMatchCount(numTeams: number): number {
  return numTeams - 1;
}
