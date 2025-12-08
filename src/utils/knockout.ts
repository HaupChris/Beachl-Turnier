import { v4 as uuidv4 } from 'uuid';
import type {
  Match,
  Team,
  Tournament,
  GroupStandingEntry,
  KnockoutConfig,
  KnockoutSettings,
  KnockoutRoundType,
  StandingEntry,
  Group,
} from '../types/tournament';

/**
 * SSVB Knockout Format:
 * - 4 groups of 4 teams
 * - Group winners (1st) go directly to quarterfinals
 * - 2nd and 3rd place play intermediate round (Zwischenrunde)
 * - 4th place (Gruppenletzte) are eliminated
 *
 * Intermediate Round Pairings:
 * 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A
 *
 * Quarterfinal Pairings:
 * 1A vs Winner(2B vs 3C)
 * 1B vs Winner(2A vs 3D)
 * 1C vs Winner(2D vs 3A)
 * 1D vs Winner(2C vs 3B)
 */

interface KnockoutBracket {
  matches: Match[];
  teams: Team[];
  eliminatedTeamIds: string[];
}

/**
 * Generates the knockout phase tournament from group phase results
 */
export function generateKnockoutTournament(
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[],
  settings: KnockoutSettings
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  // Get groups from parent tournament
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length !== 4) {
    throw new Error('SSVB knockout requires exactly 4 groups');
  }

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];

  // Copy all non-eliminated teams with new IDs
  const eliminatedTeamIds: string[] = [];

  groupStandings.forEach((standing) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    if (standing.groupRank === 4) {
      // 4th place is eliminated
      eliminatedTeamIds.push(standing.teamId);
    } else {
      const newId = uuidv4();
      teamIdMap.set(standing.teamId, newId);
      teams.push({
        id: newId,
        name: originalTeam.name,
        seedPosition: teams.length + 1,
      });
    }
  });

  // Generate knockout matches
  const bracket = generateSSVBBracket(groups, groupStandings, teamIdMap, parentTournament.numberOfCourts);

  // Initialize standings for knockout phase
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

  const knockoutConfig: KnockoutConfig = {
    directQualification: 1,
    playoffQualification: 2,
    eliminated: 1,
    playThirdPlaceMatch: settings.playThirdPlaceMatch,
    useReferees: settings.useReferees,
  };

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - K.O.-Phase`,
    system: 'knockout',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    teams: [],
    matches: bracket.matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig,
    eliminatedTeamIds: eliminatedTeamIds,
  };

  return { tournament, teams, eliminatedTeamIds };
}

/**
 * Generates the SSVB bracket structure
 */
function generateSSVBBracket(
  groups: Group[],
  groupStandings: GroupStandingEntry[],
  teamIdMap: Map<string, string>,
  numberOfCourts: number
): KnockoutBracket {
  const matches: Match[] = [];

  // Helper to get team by group and rank
  const getTeam = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  // Group indices: A=0, B=1, C=2, D=3
  let matchNumber = 1;
  let bracketPosition = 1;

  // ============================================
  // ROUND 1: Intermediate Round (Zwischenrunde)
  // ============================================
  // 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A

  const intermediateMatches: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 2), // 2A
      teamBId: getTeam(3, 3), // 3D
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 2), // 2B
      teamBId: getTeam(2, 3), // 3C
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(2, 2), // 2C
      teamBId: getTeam(1, 3), // 3B
      courtNumber: Math.min(3, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeam(3, 2), // 2D
      teamBId: getTeam(0, 3), // 3A
      courtNumber: Math.min(4, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'intermediate',
      bracketPosition: bracketPosition++,
    },
  ];

  matches.push(...intermediateMatches);

  // ============================================
  // ROUND 2: Quarterfinals (Viertelfinale)
  // ============================================
  // 1A vs Winner(2B vs 3C) - intermediate match 2
  // 1B vs Winner(2A vs 3D) - intermediate match 1
  // 1C vs Winner(2D vs 3A) - intermediate match 4
  // 1D vs Winner(2C vs 3B) - intermediate match 3

  const quarterfinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(0, 1), // 1A
      teamBId: null, // Winner of 2B vs 3C
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'quarterfinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(1, 1), // 1B
      teamBId: null, // Winner of 2A vs 3D
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'quarterfinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[0].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(2, 1), // 1C
      teamBId: null, // Winner of 2D vs 3A
      courtNumber: Math.min(3, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'quarterfinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[3].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeam(3, 1), // 1D
      teamBId: null, // Winner of 2C vs 3B
      courtNumber: Math.min(4, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'quarterfinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamB: { matchId: intermediateMatches[2].id, result: 'winner' },
      },
    },
  ];

  matches.push(...quarterfinalMatches);

  // ============================================
  // ROUND 3: Semifinals (Halbfinale)
  // ============================================

  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Winner QF1
      teamBId: null, // Winner QF2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Winner QF3
      teamBId: null, // Winner QF4
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'semifinal',
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' },
      },
    },
  ];

  matches.push(...semifinalMatches);

  // ============================================
  // ROUND 4: Third Place Match + Final
  // ============================================

  const thirdPlaceMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null, // Loser SF1
    teamBId: null, // Loser SF2
    courtNumber: 1,
    scores: [],
    winnerId: null,
    status: 'pending',
    knockoutRound: 'third-place',
    bracketPosition: bracketPosition++,
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' },
    },
  };

  const finalMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null, // Winner SF1
    teamBId: null, // Winner SF2
    courtNumber: Math.min(2, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending',
    knockoutRound: 'final',
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' },
    },
  };

  matches.push(thirdPlaceMatch, finalMatch);

  return {
    matches,
    teams: [],
    eliminatedTeamIds: [],
  };
}

/**
 * Updates knockout bracket after a match is completed
 * Propagates winners/losers to dependent matches
 */
export function updateKnockoutBracket(
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
 * Gets the knockout round label in German
 */
export function getKnockoutRoundLabel(round: KnockoutRoundType): string {
  switch (round) {
    case 'intermediate':
      return 'Zwischenrunde';
    case 'quarterfinal':
      return 'Viertelfinale';
    case 'semifinal':
      return 'Halbfinale';
    case 'third-place':
      return 'Spiel um Platz 3';
    case 'final':
      return 'Finale';
    default:
      return 'K.O.-Runde';
  }
}

/**
 * Calculates final placements for knockout phase
 */
export function calculateKnockoutPlacements(
  matches: Match[],
  _teams: Team[],
  eliminatedTeamIds: string[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  // Find final match
  const finalMatch = matches.find(m => m.knockoutRound === 'final');
  const thirdPlaceMatch = matches.find(m => m.knockoutRound === 'third-place');
  const quarterfinalMatches = matches.filter(m => m.knockoutRound === 'quarterfinal');
  const intermediateMatches = matches.filter(m => m.knockoutRound === 'intermediate');

  // 1st & 2nd place
  if (finalMatch?.status === 'completed' && finalMatch.winnerId) {
    placements.push({ teamId: finalMatch.winnerId, placement: '1.' });
    const loserId = finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId;
    if (loserId) placements.push({ teamId: loserId, placement: '2.' });
  }

  // 3rd & 4th place
  if (thirdPlaceMatch?.status === 'completed' && thirdPlaceMatch.winnerId) {
    placements.push({ teamId: thirdPlaceMatch.winnerId, placement: '3.' });
    const loserId = thirdPlaceMatch.teamAId === thirdPlaceMatch.winnerId
      ? thirdPlaceMatch.teamBId
      : thirdPlaceMatch.teamAId;
    if (loserId) placements.push({ teamId: loserId, placement: '4.' });
  }

  // 5th-8th place (quarterfinal losers)
  const qfLosers = quarterfinalMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  if (qfLosers.length > 0) {
    qfLosers.forEach(id => {
      placements.push({ teamId: id, placement: '5.-8.' });
    });
  }

  // 9th-12th place (intermediate round losers)
  const intermediateLosers = intermediateMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  if (intermediateLosers.length > 0) {
    intermediateLosers.forEach(id => {
      placements.push({ teamId: id, placement: '9.-12.' });
    });
  }

  // 13th-16th place (group phase eliminated - 4th place in groups)
  eliminatedTeamIds.forEach(id => {
    placements.push({ teamId: id, placement: '13.-16.' });
  });

  return placements;
}

/**
 * Returns the total number of matches in SSVB knockout format
 */
export function getSSVBKnockoutMatchCount(playThirdPlaceMatch: boolean): number {
  // 4 intermediate + 4 quarterfinal + 2 semifinal + final + optional 3rd place
  return playThirdPlaceMatch ? 12 : 11;
}
