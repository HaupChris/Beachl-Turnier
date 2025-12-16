import { v4 as uuidv4 } from 'uuid';
import type { Match, Team, KnockoutRoundType } from '../../types/tournament';
import type { PlacementToken } from './types';

/**
 * Generates all matches for the placement tree
 */
export function generatePlacementTreeMatches(
  teams: Team[],
  numberOfCourts: number
): Match[] {
  const numTeams = teams.length;
  const matches: Match[] = [];
  let matchNumber = 1;

  const numRounds = Math.ceil(Math.log2(numTeams));

  const teamPositions = new Map<string, PlacementToken>();
  teams.forEach((team, index) => {
    teamPositions.set(team.id, {
      teamId: team.id,
      currentInterval: { start: 1, end: numTeams },
      positionInInterval: index + 1,
    });
  });

  const round1Matches = generateRound1Matches(teams, numberOfCourts, matchNumber);
  matches.push(...round1Matches);
  matchNumber += round1Matches.length;

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
export function generateRound1Matches(
  teams: Team[],
  numberOfCourts: number,
  startMatchNumber: number
): Match[] {
  const matches: Match[] = [];
  const numTeams = teams.length;
  const numMatches = numTeams / 2;
  let matchNumber = startMatchNumber;

  for (let i = 0; i < numMatches; i++) {
    const teamAIndex = i;
    const teamBIndex = numTeams - 1 - i;

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
export function generateSubsequentRoundMatches(
  prevRoundMatches: Match[],
  round: number,
  _totalTeams: number,
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
