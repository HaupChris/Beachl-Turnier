import type { Match, Team, GroupStandingEntry } from '../types/tournament';

/**
 * Referee Assignment for SSVB Format
 *
 * Rules:
 * 1. Referees are only assigned in the K.O. phase
 * 2. Eliminated teams must referee in the first round they are out
 * 3. Teams should referee matches where they haven't played against either team (if possible)
 * 4. Round-by-round assignment:
 *    - Intermediate Round: Group 4th place teams (Gruppenletzte) referee
 *    - Quarterfinals: Group 4th place teams continue refereeing
 *    - Semifinals: Intermediate round losers referee
 *    - Finals/3rd place: Quarterfinal losers referee
 */

interface RefereeAssignment {
  matchId: string;
  refereeTeamId: string;
}

/**
 * Tracks which teams have played against each other in the group phase
 */
export function buildOpponentHistory(
  groupPhaseMatches: Match[]
): Map<string, Set<string>> {
  const history = new Map<string, Set<string>>();

  groupPhaseMatches.forEach(match => {
    if (!match.teamAId || !match.teamBId) return;

    // Add to teamA's opponents
    if (!history.has(match.teamAId)) {
      history.set(match.teamAId, new Set());
    }
    history.get(match.teamAId)!.add(match.teamBId);

    // Add to teamB's opponents
    if (!history.has(match.teamBId)) {
      history.set(match.teamBId, new Set());
    }
    history.get(match.teamBId)!.add(match.teamAId);
  });

  return history;
}

/**
 * Checks if a referee team has played against either team in the match
 */
function hasPlayedAgainst(
  refereeTeamId: string,
  matchTeamAId: string | null,
  matchTeamBId: string | null,
  opponentHistory: Map<string, Set<string>>
): boolean {
  const refereeOpponents = opponentHistory.get(refereeTeamId);
  if (!refereeOpponents) return false;

  if (matchTeamAId && refereeOpponents.has(matchTeamAId)) return true;
  if (matchTeamBId && refereeOpponents.has(matchTeamBId)) return true;

  return false;
}

/**
 * Assigns referees for intermediate round matches
 * Gruppenletzte (4th place) referee in this round
 */
export function assignIntermediateRoundReferees(
  intermediateMatches: Match[],
  _eliminatedTeamIds: string[], // 4th place teams from group phase (using groupStandings instead)
  opponentHistory: Map<string, Set<string>>,
  groupStandings: GroupStandingEntry[]
): RefereeAssignment[] {
  const assignments: RefereeAssignment[] = [];
  const usedReferees = new Set<string>();

  // Get 4th place teams with their original team IDs
  const fourthPlaceTeams = groupStandings
    .filter(s => s.groupRank === 4)
    .map(s => s.teamId);

  intermediateMatches.forEach(match => {
    // Find an available referee who hasn't played against either team
    let bestReferee: string | null = null;

    // First try to find one who hasn't played against either team
    for (const refereeId of fourthPlaceTeams) {
      if (usedReferees.has(refereeId)) continue;

      if (!hasPlayedAgainst(refereeId, match.teamAId, match.teamBId, opponentHistory)) {
        bestReferee = refereeId;
        break;
      }
    }

    // If not found, just pick any available one
    if (!bestReferee) {
      for (const refereeId of fourthPlaceTeams) {
        if (!usedReferees.has(refereeId)) {
          bestReferee = refereeId;
          break;
        }
      }
    }

    if (bestReferee) {
      assignments.push({
        matchId: match.id,
        refereeTeamId: bestReferee,
      });
      usedReferees.add(bestReferee);
    }
  });

  return assignments;
}

/**
 * Assigns referees for quarterfinal matches
 * Continue using 4th place teams
 */
export function assignQuarterfinalReferees(
  quarterfinalMatches: Match[],
  eliminatedTeamIds: string[],
  opponentHistory: Map<string, Set<string>>
): RefereeAssignment[] {
  const assignments: RefereeAssignment[] = [];
  const usedReferees = new Set<string>();

  quarterfinalMatches.forEach(match => {
    let bestReferee: string | null = null;

    // Try to find one who hasn't played against either team
    for (const refereeId of eliminatedTeamIds) {
      if (usedReferees.has(refereeId)) continue;

      if (!hasPlayedAgainst(refereeId, match.teamAId, match.teamBId, opponentHistory)) {
        bestReferee = refereeId;
        break;
      }
    }

    // If not found, pick any available
    if (!bestReferee) {
      for (const refereeId of eliminatedTeamIds) {
        if (!usedReferees.has(refereeId)) {
          bestReferee = refereeId;
          break;
        }
      }
    }

    if (bestReferee) {
      assignments.push({
        matchId: match.id,
        refereeTeamId: bestReferee,
      });
      usedReferees.add(bestReferee);
    }
  });

  return assignments;
}

/**
 * Assigns referees for semifinal matches
 * Intermediate round losers referee
 */
export function assignSemifinalReferees(
  semifinalMatches: Match[],
  intermediateMatches: Match[],
  opponentHistory: Map<string, Set<string>>
): RefereeAssignment[] {
  const assignments: RefereeAssignment[] = [];
  const usedReferees = new Set<string>();

  // Get losers from intermediate round
  const intermediateLosers = intermediateMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  semifinalMatches.forEach(match => {
    let bestReferee: string | null = null;

    for (const refereeId of intermediateLosers) {
      if (usedReferees.has(refereeId)) continue;

      if (!hasPlayedAgainst(refereeId, match.teamAId, match.teamBId, opponentHistory)) {
        bestReferee = refereeId;
        break;
      }
    }

    if (!bestReferee) {
      for (const refereeId of intermediateLosers) {
        if (!usedReferees.has(refereeId)) {
          bestReferee = refereeId;
          break;
        }
      }
    }

    if (bestReferee) {
      assignments.push({
        matchId: match.id,
        refereeTeamId: bestReferee,
      });
      usedReferees.add(bestReferee);
    }
  });

  return assignments;
}

/**
 * Assigns referees for finals and 3rd place match
 * Quarterfinal losers referee
 */
export function assignFinalsReferees(
  finalsMatches: Match[], // includes final and 3rd place match
  quarterfinalMatches: Match[],
  opponentHistory: Map<string, Set<string>>
): RefereeAssignment[] {
  const assignments: RefereeAssignment[] = [];
  const usedReferees = new Set<string>();

  // Get losers from quarterfinals
  const quarterfinalLosers = quarterfinalMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  finalsMatches.forEach(match => {
    let bestReferee: string | null = null;

    for (const refereeId of quarterfinalLosers) {
      if (usedReferees.has(refereeId)) continue;

      if (!hasPlayedAgainst(refereeId, match.teamAId, match.teamBId, opponentHistory)) {
        bestReferee = refereeId;
        break;
      }
    }

    if (!bestReferee) {
      for (const refereeId of quarterfinalLosers) {
        if (!usedReferees.has(refereeId)) {
          bestReferee = refereeId;
          break;
        }
      }
    }

    if (bestReferee) {
      assignments.push({
        matchId: match.id,
        refereeTeamId: bestReferee,
      });
      usedReferees.add(bestReferee);
    }
  });

  return assignments;
}

/**
 * Assigns all referees for a knockout tournament
 */
export function assignAllKnockoutReferees(
  knockoutMatches: Match[],
  groupPhaseMatches: Match[],
  groupStandings: GroupStandingEntry[],
  eliminatedTeamIds: string[]
): Match[] {
  const opponentHistory = buildOpponentHistory(groupPhaseMatches);

  // Categorize matches by round type
  const intermediateMatches = knockoutMatches.filter(m => m.knockoutRound === 'intermediate');
  const quarterfinalMatches = knockoutMatches.filter(m => m.knockoutRound === 'quarterfinal');
  // Note: semifinal and finals referees are assigned dynamically after earlier rounds complete

  // Get all assignments
  const assignments: RefereeAssignment[] = [];

  // Intermediate round: 4th place teams referee
  assignments.push(...assignIntermediateRoundReferees(
    intermediateMatches,
    eliminatedTeamIds,
    opponentHistory,
    groupStandings
  ));

  // Quarterfinals: continue with 4th place teams
  assignments.push(...assignQuarterfinalReferees(
    quarterfinalMatches,
    eliminatedTeamIds,
    opponentHistory
  ));

  // Note: Semifinals and Finals referees are assigned dynamically
  // after the previous round is completed, since we need to know the losers

  // Apply assignments to matches
  const assignmentMap = new Map(assignments.map(a => [a.matchId, a.refereeTeamId]));

  return knockoutMatches.map(match => ({
    ...match,
    refereeTeamId: assignmentMap.get(match.id) || null,
  }));
}

/**
 * Updates referee assignments after a knockout round is completed
 */
export function updateRefereeAssignmentsAfterRound(
  matches: Match[],
  completedRound: 'intermediate' | 'quarterfinal',
  groupPhaseMatches: Match[]
): Match[] {
  const opponentHistory = buildOpponentHistory(groupPhaseMatches);

  if (completedRound === 'intermediate') {
    // Assign referees for semifinals
    const intermediateMatches = matches.filter(m => m.knockoutRound === 'intermediate');
    const semifinalMatches = matches.filter(m => m.knockoutRound === 'semifinal');

    const assignments = assignSemifinalReferees(
      semifinalMatches,
      intermediateMatches,
      opponentHistory
    );

    const assignmentMap = new Map(assignments.map(a => [a.matchId, a.refereeTeamId]));

    return matches.map(match => {
      if (match.knockoutRound === 'semifinal' && assignmentMap.has(match.id)) {
        return { ...match, refereeTeamId: assignmentMap.get(match.id)! };
      }
      return match;
    });
  }

  if (completedRound === 'quarterfinal') {
    // Assign referees for finals
    const quarterfinalMatches = matches.filter(m => m.knockoutRound === 'quarterfinal');
    const finalsMatches = matches.filter(
      m => m.knockoutRound === 'final' || m.knockoutRound === 'third-place'
    );

    const assignments = assignFinalsReferees(
      finalsMatches,
      quarterfinalMatches,
      opponentHistory
    );

    const assignmentMap = new Map(assignments.map(a => [a.matchId, a.refereeTeamId]));

    return matches.map(match => {
      if ((match.knockoutRound === 'final' || match.knockoutRound === 'third-place') &&
          assignmentMap.has(match.id)) {
        return { ...match, refereeTeamId: assignmentMap.get(match.id)! };
      }
      return match;
    });
  }

  return matches;
}

/**
 * Gets referee team info for display
 */
export function getRefereeTeamName(
  refereeTeamId: string | null | undefined,
  teams: Team[]
): string | null {
  if (!refereeTeamId) return null;
  const team = teams.find(t => t.id === refereeTeamId);
  return team?.name || null;
}
