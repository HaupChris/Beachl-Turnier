/**
 * Match Helper Functions
 *
 * Extracted helper functions for match operations.
 * These reduce complexity in the main reducer handlers.
 */

import type { Tournament, Match, StandingEntry, GroupStandingEntry } from '../../types/tournament';
import {
  calculateStandings,
  calculateAllGroupStandings,
  updateKnockoutBracket,
  updatePlacementTreeBracket,
  updateShortMainRoundBracket,
} from '../../domain';
import { isGroupBasedSystem } from './helpers';

// =============================================================================
// MATCH COMPLETION HELPERS
// =============================================================================

/**
 * Determine the winner of a match from set scores
 */
export function determineMatchWinner(match: Match): string | null {
  if (!match.teamAId || !match.teamBId) return null;

  let setsWonA = 0;
  let setsWonB = 0;

  for (const score of match.scores) {
    if (score.teamA > score.teamB) setsWonA++;
    else if (score.teamB > score.teamA) setsWonB++;
  }

  return setsWonA > setsWonB ? match.teamAId : match.teamBId;
}

/**
 * Mark a match as completed with winner
 */
export function completeMatchWithWinner(match: Match): Match {
  const winnerId = determineMatchWinner(match);
  return { ...match, winnerId, status: 'completed' as const };
}

/**
 * Propagate match result to bracket (knockout/placement-tree/short-main)
 */
export function propagateToBracket(
  matches: Match[],
  matchId: string,
  system: Tournament['system']
): Match[] {
  switch (system) {
    case 'knockout':
      return updateKnockoutBracket(matches, matchId);
    case 'placement-tree':
      return updatePlacementTreeBracket(matches, matchId);
    case 'short-main-knockout':
      return updateShortMainRoundBracket(matches, matchId);
    default:
      return matches;
  }
}

/**
 * Calculate standings based on tournament type
 */
export function calculateTournamentStandings(
  tournament: Tournament,
  matches: Match[]
): { standings: StandingEntry[]; groupStandings: GroupStandingEntry[] | undefined } {
  if (isGroupBasedSystem(tournament.system) && tournament.groupPhaseConfig) {
    const groupStandings = calculateAllGroupStandings(
      tournament.groupPhaseConfig,
      tournament.teams,
      matches,
      tournament.setsPerMatch,
      tournament.tiebreakerOrder || 'head-to-head-first'
    );
    return { standings: tournament.standings, groupStandings };
  }

  const standings = calculateStandings(tournament.teams, matches, {
    setsPerMatch: tournament.setsPerMatch,
    tiebreakerOrder: tournament.tiebreakerOrder || 'head-to-head-first',
    system: tournament.system,
  });
  return { standings, groupStandings: tournament.groupStandings };
}

/**
 * Determine new tournament status after match completion
 */
export function determineTournamentStatus(
  matches: Match[]
): 'in-progress' | 'completed' {
  const allCompleted = matches.every(m =>
    m.status === 'completed' || m.status === 'pending'
  );
  const hasScheduledOrInProgress = matches.some(m =>
    m.status === 'scheduled' || m.status === 'in-progress'
  );

  return !hasScheduledOrInProgress && allCompleted ? 'completed' : 'in-progress';
}

/**
 * Check if a knockout round is complete
 */
export function isKnockoutRoundComplete(
  matches: Match[],
  knockoutRound: string
): boolean {
  const roundMatches = matches.filter(m => m.knockoutRound === knockoutRound);
  return roundMatches.length > 0 && roundMatches.every(m => m.status === 'completed');
}

// =============================================================================
// KNOCKOUT SYSTEMS
// =============================================================================

export const KNOCKOUT_SYSTEMS = ['knockout', 'placement-tree', 'short-main-knockout'] as const;

export function isKnockoutSystem(system: string): boolean {
  return KNOCKOUT_SYSTEMS.includes(system as any);
}

/**
 * Find the child knockout tournament for a group phase
 */
export function findChildKnockoutTournament(
  tournaments: Tournament[],
  parentId: string
): Tournament | undefined {
  return tournaments.find(
    t => t.parentPhaseId === parentId && isKnockoutSystem(t.system)
  );
}

/**
 * Check if knockout teams should be populated
 */
export function shouldPopulateKnockout(
  tournament: Tournament,
  knockoutTournament: Tournament | undefined
): boolean {
  if (!knockoutTournament) return false;
  if (knockoutTournament.teams.length > 0) return false;
  if (tournament.status !== 'completed') return false;
  if (!isGroupBasedSystem(tournament.system)) return false;
  if (!tournament.groupStandings) return false;
  return true;
}
