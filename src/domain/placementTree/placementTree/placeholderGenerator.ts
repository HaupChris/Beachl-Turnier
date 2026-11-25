import { v4 as uuidv4 } from 'uuid';
import type {
  Match,
  Tournament,
  KnockoutSettings,
  StandingEntry,
  KnockoutRoundType,
} from '../../types/tournament';
import { getGroupLetter, getRankLabel } from './helpers';

/**
 * Generates a placeholder placement tree tournament (before group phase is complete)
 */
export function generatePlacementTreeTournamentPlaceholder(
  parentTournament: Tournament,
  settings: KnockoutSettings
): { tournament: Tournament; eliminatedTeamIds: string[] } {
  const now = new Date().toISOString();
  const tournamentId = uuidv4();

  const groups = parentTournament.groupPhaseConfig?.groups || [];
  const numTeams = groups.length * 4;

  const matches = generatePlacementTreeMatchesPlaceholder(
    numTeams,
    groups.length,
    parentTournament.numberOfCourts
  );

  const standings: StandingEntry[] = [];

  const tournament: Tournament = {
    id: tournamentId,
    name: `${parentTournament.name} - Platzierungsbaum`,
    system: 'placement-tree',
    numberOfCourts: parentTournament.numberOfCourts,
    setsPerMatch: settings.setsPerMatch,
    pointsPerSet: settings.pointsPerSet,
    pointsPerThirdSet: settings.pointsPerThirdSet,
    tiebreakerOrder: parentTournament.tiebreakerOrder,
    scheduling: parentTournament.scheduling,
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
      playThirdPlaceMatch: true,
      useReferees: settings.useReferees,
    },
    knockoutSettings: settings,
    eliminatedTeamIds: [],
  };

  return { tournament, eliminatedTeamIds: [] };
}

function generatePlacementTreeMatchesPlaceholder(
  numTeams: number,
  numGroups: number,
  numberOfCourts: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;

  const numRounds = Math.ceil(Math.log2(numTeams));

  const seedOrder: { groupIndex: number; rank: number }[] = [];
  const teamsPerGroup = numTeams / numGroups;
  for (let rank = 1; rank <= teamsPerGroup; rank++) {
    for (let group = 0; group < numGroups; group++) {
      seedOrder.push({ groupIndex: group, rank });
    }
  }

  const round1Matches: Match[] = [];
  const numMatchesRound1 = numTeams / 2;

  for (let i = 0; i < numMatchesRound1; i++) {
    const seedA = seedOrder[i];
    const seedB = seedOrder[numTeams - 1 - i];

    const match: Match = {
      id: uuidv4(),
      round: 1,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `${getRankLabel(seedA.rank)} Gruppe ${getGroupLetter(seedA.groupIndex)}`,
      teamBPlaceholder: `${getRankLabel(seedB.rank)} Gruppe ${getGroupLetter(seedB.groupIndex)}`,
      teamASource: { type: 'group' as const, groupIndex: seedA.groupIndex, rank: seedA.rank },
      teamBSource: { type: 'group' as const, groupIndex: seedB.groupIndex, rank: seedB.rank },
      courtNumber: (i % numberOfCourts) + 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'placement-round-1',
      bracketPosition: i + 1,
      placementInterval: { start: 1, end: numTeams },
      winnerInterval: { start: 1, end: numTeams / 2 },
      loserInterval: { start: numTeams / 2 + 1, end: numTeams },
    };

    round1Matches.push(match);
  }
  matches.push(...round1Matches);

  let prevRoundMatches = round1Matches;

  for (let round = 2; round <= numRounds; round++) {
    const roundMatches = generateSubsequentRoundMatchesPlaceholder(
      prevRoundMatches,
      round,
      numberOfCourts,
      matchNumber
    );
    matches.push(...roundMatches);
    matchNumber += roundMatches.length;
    prevRoundMatches = roundMatches;
  }

  return matches;
}

function generateSubsequentRoundMatchesPlaceholder(
  prevRoundMatches: Match[],
  round: number,
  numberOfCourts: number,
  startMatchNumber: number
): Match[] {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let bracketPosition = 1;

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

  const allIntervals = new Set([...winnerIntervalGroups.keys(), ...loserIntervalGroups.keys()]);

  for (const intervalKey of allIntervals) {
    const [start, end] = intervalKey.split('-').map(Number);
    const intervalSize = end - start + 1;

    const feedingMatches: { match: Match; result: 'winner' | 'loser' }[] = [];

    const winnerMatches = winnerIntervalGroups.get(intervalKey) || [];
    winnerMatches.forEach(m => feedingMatches.push({ match: m, result: 'winner' }));

    const loserMatches = loserIntervalGroups.get(intervalKey) || [];
    loserMatches.forEach(m => feedingMatches.push({ match: m, result: 'loser' }));

    feedingMatches.sort((a, b) => (a.match.bracketPosition || 0) - (b.match.bracketPosition || 0));

    const numMatchesInInterval = feedingMatches.length / 2;
    const mid = start + Math.floor((end - start) / 2);

    const newWinnerInterval = intervalSize === 2 ? null : { start, end: mid };
    const newLoserInterval = intervalSize === 2 ? null : { start: mid + 1, end };

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

    for (let i = 0; i < numMatchesInInterval; i++) {
      const matchA = feedingMatches[i];
      const matchB = feedingMatches[feedingMatches.length - 1 - i];

      const teamAPlaceholder = matchA.result === 'winner'
        ? `Sieger Spiel ${matchA.match.matchNumber}`
        : `Verlierer Spiel ${matchA.match.matchNumber}`;
      const teamBPlaceholder = matchB.result === 'winner'
        ? `Sieger Spiel ${matchB.match.matchNumber}`
        : `Verlierer Spiel ${matchB.match.matchNumber}`;

      const match: Match = {
        id: uuidv4(),
        round,
        matchNumber: matchNumber++,
        teamAId: null,
        teamBId: null,
        teamAPlaceholder,
        teamBPlaceholder,
        courtNumber: (bracketPosition - 1) % numberOfCourts + 1,
        scores: [],
        winnerId: null,
        status: 'pending' as const,
        knockoutRound,
        bracketPosition: bracketPosition++,
        placementInterval: { start, end },
        winnerInterval: newWinnerInterval || undefined,
        loserInterval: newLoserInterval || undefined,
        playoffForPlace: intervalSize === 2 ? start : undefined,
        dependsOn: {
          teamA: { matchId: matchA.match.id, result: matchA.result },
          teamB: { matchId: matchB.match.id, result: matchB.result },
        },
      };

      matches.push(match);
    }
  }

  matches.sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));

  return matches;
}
