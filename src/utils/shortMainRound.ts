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
 * BeachL-Kurze-Hauptrunde: Shortened Main Round with Byes
 *
 * Structure for 16 teams (4 groups of 4):
 * - A = Group winners (4 teams) → Direct to Quarterfinals (bye in Quali round)
 * - B = Group 2nd + 3rd (8 teams) → Play Qualification round
 * - C = Group 4th (4 teams) → Bottom bracket for places 13-16
 *
 * Match structure:
 * 1. Qualification Round: B teams play (8→4), losers → 9-12 bracket
 * 2. Quarterfinals: A teams vs Qualification winners
 * 3. Semifinals + Finals for Top-4
 * 4. 5-8 Bracket: QF losers play for places 5-8
 * 5. 9-12 Bracket: Quali losers play for places 9-12
 * 6. 13-16 Bracket: C teams play for places 13-16
 *
 * Total: 24 matches for 16 teams
 */

interface TeamSeed {
  teamId: string;
  groupId: string;
  groupRank: number;
  category: 'A' | 'B' | 'C'; // A=winner, B=2nd/3rd, C=4th
}

/**
 * Generates the shortened main round knockout tournament from group phase results
 */
export function generateShortMainRoundTournament(
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[],
  settings: KnockoutSettings
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  // Get groups from parent tournament
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length !== 4) {
    throw new Error('BeachL-Kurze-Hauptrunde requires exactly 4 groups');
  }

  // Categorize teams
  const teamSeeds = categorizeTeams(groupStandings, groups);

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];

  // Create teams in seed order
  let seedPosition = 1;
  [...teamSeeds.A, ...teamSeeds.B, ...teamSeeds.C].forEach((seed) => {
    const originalTeam = parentTournament.teams.find(t => t.id === seed.teamId);
    if (!originalTeam) return;

    const newId = uuidv4();
    teamIdMap.set(seed.teamId, newId);
    teams.push({
      id: newId,
      name: originalTeam.name,
      seedPosition: seedPosition++,
    });
  });

  // Generate all matches
  const matches = generateShortMainRoundMatches(
    teamSeeds,
    teamIdMap,
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
    name: `${parentTournament.name} - Hauptrunde`,
    system: 'short-main-knockout',
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
      directQualification: 1, // Group winners direct to QF
      playoffQualification: 2, // 2nd and 3rd play qualification
      eliminated: 1, // 4th place to bottom bracket
      playThirdPlaceMatch: settings.playThirdPlaceMatch,
      useReferees: settings.useReferees,
    },
    eliminatedTeamIds: [],
  };

  return { tournament, teams, eliminatedTeamIds: [] };
}

/**
 * Categorize teams into A (winners), B (2nd/3rd), C (4th)
 */
function categorizeTeams(
  groupStandings: GroupStandingEntry[],
  groups: Group[]
): { A: TeamSeed[]; B: TeamSeed[]; C: TeamSeed[] } {
  const A: TeamSeed[] = [];
  const B: TeamSeed[] = [];
  const C: TeamSeed[] = [];

  // Sort groups by their natural order
  const sortedGroups = [...groups].sort((a, b) => {
    const indexA = groups.indexOf(a);
    const indexB = groups.indexOf(b);
    return indexA - indexB;
  });

  sortedGroups.forEach(group => {
    const groupTeams = groupStandings
      .filter(s => s.groupId === group.id)
      .sort((a, b) => a.groupRank - b.groupRank);

    groupTeams.forEach(team => {
      const seed: TeamSeed = {
        teamId: team.teamId,
        groupId: group.id,
        groupRank: team.groupRank,
        category: team.groupRank === 1 ? 'A' : team.groupRank === 4 ? 'C' : 'B',
      };

      if (team.groupRank === 1) {
        A.push(seed);
      } else if (team.groupRank === 4) {
        C.push(seed);
      } else {
        B.push(seed);
      }
    });
  });

  return { A, B, C };
}

/**
 * Generate all matches for the shortened main round
 */
function generateShortMainRoundMatches(
  teamSeeds: { A: TeamSeed[]; B: TeamSeed[]; C: TeamSeed[] },
  teamIdMap: Map<string, string>,
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Helper to get new team ID
  const getTeamId = (originalId: string): string | null => {
    return teamIdMap.get(originalId) || null;
  };

  // ============================================
  // ROUND 1: Qualification Round (B teams) + Bottom Bracket Semis (C teams)
  // ============================================

  // Qualification: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A (same as SSVB intermediate)
  const bTeams = teamSeeds.B;
  // Group order: A=0, B=1, C=2, D=3
  // 2nd place: indices 0,1,2,3 (2A, 2B, 2C, 2D)
  // 3rd place: indices 4,5,6,7 (3A, 3B, 3C, 3D)

  const qualificationPairings = [
    { teamA: bTeams[0], teamB: bTeams[7] }, // 2A vs 3D
    { teamA: bTeams[1], teamB: bTeams[6] }, // 2B vs 3C
    { teamA: bTeams[2], teamB: bTeams[5] }, // 2C vs 3B
    { teamA: bTeams[3], teamB: bTeams[4] }, // 2D vs 3A
  ];

  const qualificationMatches: Match[] = qualificationPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: getTeamId(pairing.teamA.teamId),
    teamBId: getTeamId(pairing.teamB.teamId),
    courtNumber: (index % numberOfCourts) + 1,
    scores: [],
    winnerId: null,
    status: 'scheduled',
    knockoutRound: 'qualification' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 5, end: 12 }, // Winners go to Top-8, losers to 9-12
    winnerInterval: { start: 5, end: 8 },
    loserInterval: { start: 9, end: 12 },
  }));
  matches.push(...qualificationMatches);

  // Bottom Bracket Semifinals (C teams: 13-16)
  const cTeams = teamSeeds.C;
  const bottomSemis: Match[] = [
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeamId(cTeams[0].teamId), // 4A
      teamBId: getTeamId(cTeams[1].teamId), // 4B
      courtNumber: ((bracketPosition - 1) % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 16 },
    },
    {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: getTeamId(cTeams[2].teamId), // 4C
      teamBId: getTeamId(cTeams[3].teamId), // 4D
      courtNumber: ((bracketPosition - 1) % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'scheduled',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 16 },
    },
  ];
  matches.push(...bottomSemis);

  // ============================================
  // ROUND 2: Quarterfinals (A vs Quali winners) + 9-12 Semis + 13/15 Finals
  // ============================================

  // Quarterfinals: 1A vs Winner(2B vs 3C), 1B vs Winner(2A vs 3D), etc.
  const aTeams = teamSeeds.A;
  const quarterfinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[0].teamId), // 1A
      teamBId: null, // Winner of 2B vs 3C (quali match 2)
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[1].teamId), // 1B
      teamBId: null, // Winner of 2A vs 3D (quali match 1)
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[0].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[2].teamId), // 1C
      teamBId: null, // Winner of 2D vs 3A (quali match 4)
      courtNumber: Math.min(3, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[3].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: getTeamId(aTeams[3].teamId), // 1D
      teamBId: null, // Winner of 2C vs 3B (quali match 3)
      courtNumber: Math.min(4, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 8 },
      dependsOn: {
        teamB: { matchId: qualificationMatches[2].id, result: 'winner' },
      },
    },
  ];
  matches.push(...quarterfinalMatches);

  // 9-12 Bracket Semifinals (Quali losers)
  const bracket912Semis: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Loser of quali 1 (2A vs 3D)
      teamBId: null, // Loser of quali 2 (2B vs 3C)
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[0].id, result: 'loser' },
        teamB: { matchId: qualificationMatches[1].id, result: 'loser' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Loser of quali 3 (2C vs 3B)
      teamBId: null, // Loser of quali 4 (2D vs 3A)
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[2].id, result: 'loser' },
        teamB: { matchId: qualificationMatches[3].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket912Semis);

  // 13-16 Finals (from bottom semis)
  const bracket1316Finals: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Winner of bottom semi 1
      teamBId: null, // Winner of bottom semi 2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 14 },
      playoffForPlace: 13,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'winner' },
        teamB: { matchId: bottomSemis[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null, // Loser of bottom semi 1
      teamBId: null, // Loser of bottom semi 2
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 15, end: 16 },
      playoffForPlace: 15,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'loser' },
        teamB: { matchId: bottomSemis[1].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket1316Finals);

  // ============================================
  // ROUND 3: Semifinals + 5-8 Semis + 9/11 Finals
  // ============================================

  // Top Semifinals
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
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
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
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // 5-8 Bracket Semifinals (QF losers)
  const bracket58Semis: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Loser QF1
      teamBId: null, // Loser QF2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'loser' },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'loser' },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Loser QF3
      teamBId: null, // Loser QF4
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'loser' },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket58Semis);

  // 9-12 Finals
  const bracket912Finals: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Winner 9-12 semi 1
      teamBId: null, // Winner 9-12 semi 2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 10 },
      playoffForPlace: 9,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'winner' },
        teamB: { matchId: bracket912Semis[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null, // Loser 9-12 semi 1
      teamBId: null, // Loser 9-12 semi 2
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 11, end: 12 },
      playoffForPlace: 11,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'loser' },
        teamB: { matchId: bracket912Semis[1].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket912Finals);

  // ============================================
  // ROUND 4: Finals + 3rd Place + 5/7 Finals
  // ============================================

  // 3rd Place Match
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
    knockoutRound: 'third-place' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 3, end: 4 },
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' },
    },
  };
  matches.push(thirdPlaceMatch);

  // Final
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
    knockoutRound: 'top-final' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 1, end: 2 },
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' },
    },
  };
  matches.push(finalMatch);

  // 5-8 Finals
  const bracket58Finals: Match[] = [
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null, // Winner 5-8 semi 1
      teamBId: null, // Winner 5-8 semi 2
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 6 },
      playoffForPlace: 5,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'winner' },
        teamB: { matchId: bracket58Semis[1].id, result: 'winner' },
      },
    },
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null, // Loser 5-8 semi 1
      teamBId: null, // Loser 5-8 semi 2
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending',
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 7, end: 8 },
      playoffForPlace: 7,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'loser' },
        teamB: { matchId: bracket58Semis[1].id, result: 'loser' },
      },
    },
  ];
  matches.push(...bracket58Finals);

  return matches;
}

/**
 * Updates shortened main round bracket after a match is completed
 */
export function updateShortMainRoundBracket(
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

    if (match.dependsOn.teamA?.matchId === completedMatchId) {
      const teamId = match.dependsOn.teamA.result === 'winner'
        ? completedMatch.winnerId
        : loserId;
      updated = { ...updated, teamAId: teamId };
      shouldActivate = true;
    }

    if (match.dependsOn.teamB?.matchId === completedMatchId) {
      const teamId = match.dependsOn.teamB.result === 'winner'
        ? completedMatch.winnerId
        : loserId;
      updated = { ...updated, teamBId: teamId };
      shouldActivate = true;
    }

    if (shouldActivate && updated.teamAId && updated.teamBId && updated.status === 'pending') {
      updated = { ...updated, status: 'scheduled' };
    }

    return updated;
  });
}

/**
 * Calculates final placements for shortened main round
 */
export function calculateShortMainRoundPlacements(
  matches: Match[],
  _teams: Team[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  // Find all matches with playoffForPlace
  const placementMatches = matches.filter(m => m.playoffForPlace !== undefined);

  placementMatches.forEach(match => {
    if (match.status !== 'completed' || !match.winnerId) return;

    const place = match.playoffForPlace!;
    placements.push({ teamId: match.winnerId, placement: `${place}.` });

    const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
    if (loserId) {
      placements.push({ teamId: loserId, placement: `${place + 1}.` });
    }
  });

  return placements.sort((a, b) => parseInt(a.placement) - parseInt(b.placement));
}

/**
 * Gets the knockout round label in German for shortened main round
 */
export function getShortMainRoundLabel(round: KnockoutRoundType, interval?: { start: number; end: number }): string {
  switch (round) {
    case 'qualification':
      return 'Qualifikation';
    case 'top-quarterfinal':
      return 'Viertelfinale';
    case 'top-semifinal':
      return 'Halbfinale';
    case 'top-final':
      return 'Finale';
    case 'third-place':
      return 'Spiel um Platz 3';
    case 'placement-5-8':
      if (interval) {
        if (interval.start === 5 && interval.end === 6) return 'Spiel um Platz 5';
        if (interval.start === 7 && interval.end === 8) return 'Spiel um Platz 7';
      }
      return 'Platzierung 5-8';
    case 'placement-9-12':
      if (interval) {
        if (interval.start === 9 && interval.end === 10) return 'Spiel um Platz 9';
        if (interval.start === 11 && interval.end === 12) return 'Spiel um Platz 11';
      }
      return 'Platzierung 9-12';
    case 'placement-13-16':
      if (interval) {
        if (interval.start === 13 && interval.end === 14) return 'Spiel um Platz 13';
        if (interval.start === 15 && interval.end === 16) return 'Spiel um Platz 15';
      }
      return 'Platzierung 13-16';
    default:
      return 'Hauptrunde';
  }
}

/**
 * Returns the total number of matches for shortened main round (16 teams)
 */
export function getShortMainRoundMatchCount(): number {
  // Quali: 4 + Bottom Semis: 2 + QF: 4 + 9-12 Semis: 2 + 13/15 Finals: 2 +
  // SF: 2 + 5-8 Semis: 2 + 9/11 Finals: 2 + Final: 1 + 3rd: 1 + 5/7 Finals: 2 = 24
  return 24;
}

/**
 * Get group letter from index (0 -> A, 1 -> B, etc.)
 */
function getGroupLetter(index: number): string {
  return String.fromCharCode(65 + index); // 65 = 'A'
}

/**
 * Get rank suffix in German (1. Platz, 2. Platz, etc.)
 */
function getRankLabel(rank: number): string {
  return `${rank}. Platz`;
}

/**
 * Generates a placeholder shortened main round tournament (before group phase is complete)
 * Teams are not assigned yet, but placeholder text shows where they will come from
 */
export function generateShortMainRoundTournamentPlaceholder(
  parentTournament: Tournament,
  settings: KnockoutSettings
): { tournament: Tournament; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length !== 4) {
    throw new Error('BeachL-Kurze-Hauptrunde requires exactly 4 groups');
  }

  // Generate knockout matches with placeholders
  const matches = generateShortMainRoundMatchesPlaceholder(
    parentTournament.numberOfCourts
  );

  // Initialize empty standings (will be populated later)
  const standings: StandingEntry[] = [];

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - Hauptrunde`,
    system: 'short-main-knockout',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    scheduling: parentTournament.scheduling,
    teams: [], // Will be populated when group phase completes
    matches,
    standings,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    knockoutConfig: {
      directQualification: 1,
      playoffQualification: 2,
      eliminated: 1,
      playThirdPlaceMatch: settings.playThirdPlaceMatch,
      useReferees: settings.useReferees,
    },
    knockoutSettings: settings,
    eliminatedTeamIds: [],
  };

  return { tournament, eliminatedTeamIds: [] };
}

/**
 * Generate all matches for the shortened main round with placeholders
 */
function generateShortMainRoundMatchesPlaceholder(
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // ============================================
  // ROUND 1: Qualification Round (B teams) + Bottom Bracket Semis (C teams)
  // ============================================

  // Qualification: 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A
  const qualificationPairings = [
    { teamA: { group: 0, rank: 2 }, teamB: { group: 3, rank: 3 } }, // 2A vs 3D
    { teamA: { group: 1, rank: 2 }, teamB: { group: 2, rank: 3 } }, // 2B vs 3C
    { teamA: { group: 2, rank: 2 }, teamB: { group: 1, rank: 3 } }, // 2C vs 3B
    { teamA: { group: 3, rank: 2 }, teamB: { group: 0, rank: 3 } }, // 2D vs 3A
  ];

  const qualificationMatches: Match[] = qualificationPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(pairing.teamA.rank)} Gruppe ${getGroupLetter(pairing.teamA.group)}`,
    teamBPlaceholder: `${getRankLabel(pairing.teamB.rank)} Gruppe ${getGroupLetter(pairing.teamB.group)}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.teamA.group, rank: pairing.teamA.rank },
    teamBSource: { type: 'group' as const, groupIndex: pairing.teamB.group, rank: pairing.teamB.rank },
    courtNumber: (index % numberOfCourts) + 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'qualification' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 5, end: 12 },
    winnerInterval: { start: 5, end: 8 },
    loserInterval: { start: 9, end: 12 },
  }));
  matches.push(...qualificationMatches);

  // Bottom Bracket Semifinals (C teams: 13-16)
  const bottomSemiPairings = [
    { teamA: { group: 0, rank: 4 }, teamB: { group: 1, rank: 4 } }, // 4A vs 4B
    { teamA: { group: 2, rank: 4 }, teamB: { group: 3, rank: 4 } }, // 4C vs 4D
  ];

  const bottomSemis: Match[] = bottomSemiPairings.map((pairing) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(pairing.teamA.rank)} Gruppe ${getGroupLetter(pairing.teamA.group)}`,
    teamBPlaceholder: `${getRankLabel(pairing.teamB.rank)} Gruppe ${getGroupLetter(pairing.teamB.group)}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.teamA.group, rank: pairing.teamA.rank },
    teamBSource: { type: 'group' as const, groupIndex: pairing.teamB.group, rank: pairing.teamB.rank },
    courtNumber: ((bracketPosition - 1) % numberOfCourts) + 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'placement-13-16' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 13, end: 16 },
  }));
  matches.push(...bottomSemis);

  // ============================================
  // ROUND 2: Quarterfinals (A vs Quali winners) + 9-12 Semis + 13/15 Finals
  // ============================================

  // Quarterfinals: 1A vs Winner(2B vs 3C), 1B vs Winner(2A vs 3D), etc.
  const qfPairings = [
    { groupWinner: 0, qualiMatchIndex: 1 }, // 1A vs Winner of 2B vs 3C
    { groupWinner: 1, qualiMatchIndex: 0 }, // 1B vs Winner of 2A vs 3D
    { groupWinner: 2, qualiMatchIndex: 3 }, // 1C vs Winner of 2D vs 3A
    { groupWinner: 3, qualiMatchIndex: 2 }, // 1D vs Winner of 2C vs 3B
  ];

  const quarterfinalMatches: Match[] = qfPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.groupWinner)}`,
    teamBPlaceholder: `Sieger Spiel ${qualificationMatches[pairing.qualiMatchIndex].matchNumber}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.groupWinner, rank: 1 },
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'top-quarterfinal' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 1, end: 8 },
    dependsOn: {
      teamB: { matchId: qualificationMatches[pairing.qualiMatchIndex].id, result: 'winner' as const },
    },
  }));
  matches.push(...quarterfinalMatches);

  // 9-12 Bracket Semifinals (Quali losers)
  const bracket912Semis: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${qualificationMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${qualificationMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[0].id, result: 'loser' as const },
        teamB: { matchId: qualificationMatches[1].id, result: 'loser' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${qualificationMatches[2].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${qualificationMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 12 },
      dependsOn: {
        teamA: { matchId: qualificationMatches[2].id, result: 'loser' as const },
        teamB: { matchId: qualificationMatches[3].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket912Semis);

  // 13-16 Finals (from bottom semis)
  const bracket1316Finals: Match[] = [
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${bottomSemis[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${bottomSemis[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 13, end: 14 },
      playoffForPlace: 13,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'winner' as const },
        teamB: { matchId: bottomSemis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 2,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${bottomSemis[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${bottomSemis[1].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-13-16' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 15, end: 16 },
      playoffForPlace: 15,
      dependsOn: {
        teamA: { matchId: bottomSemis[0].id, result: 'loser' as const },
        teamB: { matchId: bottomSemis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket1316Finals);

  // ============================================
  // ROUND 3: Semifinals + 5-8 Semis + 9/11 Finals
  // ============================================

  // Top Semifinals
  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'top-semifinal' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 1, end: 4 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' as const },
      },
    },
  ];
  matches.push(...semifinalMatches);

  // 5-8 Bracket Semifinals (QF losers)
  const bracket58Semis: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'loser' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'loser' as const },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 8 },
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'loser' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket58Semis);

  // 9-12 Finals
  const bracket912Finals: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${bracket912Semis[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${bracket912Semis[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 9, end: 10 },
      playoffForPlace: 9,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'winner' as const },
        teamB: { matchId: bracket912Semis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${bracket912Semis[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${bracket912Semis[1].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-9-12' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 11, end: 12 },
      playoffForPlace: 11,
      dependsOn: {
        teamA: { matchId: bracket912Semis[0].id, result: 'loser' as const },
        teamB: { matchId: bracket912Semis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket912Finals);

  // ============================================
  // ROUND 4: Finals + 3rd Place + 5/7 Finals
  // ============================================

  // 3rd Place Match
  const thirdPlaceMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Verlierer Spiel ${semifinalMatches[0].matchNumber}`,
    teamBPlaceholder: `Verlierer Spiel ${semifinalMatches[1].matchNumber}`,
    courtNumber: 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'third-place' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 3, end: 4 },
    playoffForPlace: 3,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
    },
  };
  matches.push(thirdPlaceMatch);

  // Final
  const finalMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Sieger Spiel ${semifinalMatches[0].matchNumber}`,
    teamBPlaceholder: `Sieger Spiel ${semifinalMatches[1].matchNumber}`,
    courtNumber: Math.min(2, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'top-final' as KnockoutRoundType,
    bracketPosition: bracketPosition++,
    placementInterval: { start: 1, end: 2 },
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
  };
  matches.push(finalMatch);

  // 5-8 Finals
  const bracket58Finals: Match[] = [
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${bracket58Semis[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${bracket58Semis[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 5, end: 6 },
      playoffForPlace: 5,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'winner' as const },
        teamB: { matchId: bracket58Semis[1].id, result: 'winner' as const },
      },
    },
    {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${bracket58Semis[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${bracket58Semis[1].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-5-8' as KnockoutRoundType,
      bracketPosition: bracketPosition++,
      placementInterval: { start: 7, end: 8 },
      playoffForPlace: 7,
      dependsOn: {
        teamA: { matchId: bracket58Semis[0].id, result: 'loser' as const },
        teamB: { matchId: bracket58Semis[1].id, result: 'loser' as const },
      },
    },
  ];
  matches.push(...bracket58Finals);

  return matches;
}

/**
 * Populates shortened main round tournament with actual teams from group phase standings
 * Called when group phase completes
 */
export function populateShortMainRoundTeams(
  knockoutTournament: Tournament,
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[]
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length !== 4) {
    throw new Error('BeachL-Kurze-Hauptrunde requires exactly 4 groups');
  }

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];
  const eliminatedTeamIds: string[] = [];

  // Copy all teams with new IDs (all 16 teams play in shortened main round)
  groupStandings.forEach((standing) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    const newId = uuidv4();
    teamIdMap.set(standing.teamId, newId);
    teams.push({
      id: newId,
      name: originalTeam.name,
      seedPosition: teams.length + 1,
    });
  });

  // Helper to get team by group and rank
  const getTeamId = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  // Update matches with actual team IDs
  const updatedMatches = knockoutTournament.matches.map(match => {
    const updatedMatch = { ...match };

    // Populate team from source (group standings)
    if (match.teamASource?.type === 'group') {
      updatedMatch.teamAId = getTeamId(match.teamASource.groupIndex, match.teamASource.rank);
    }
    if (match.teamBSource?.type === 'group') {
      updatedMatch.teamBId = getTeamId(match.teamBSource.groupIndex, match.teamBSource.rank);
    }

    // Update status: if both teams are assigned and no dependencies, mark as scheduled
    if (updatedMatch.teamAId && updatedMatch.teamBId && !updatedMatch.dependsOn) {
      updatedMatch.status = 'scheduled';
    } else if (updatedMatch.teamAId && updatedMatch.teamBId) {
      // Both teams assigned but has dependencies - check if dependencies are met
      updatedMatch.status = 'scheduled';
    }

    return updatedMatch;
  });

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

  return {
    tournament: {
      ...knockoutTournament,
      teams,
      matches: updatedMatches,
      standings,
      eliminatedTeamIds,
      updatedAt: new Date().toISOString(),
    },
    teams,
    eliminatedTeamIds,
  };
}
