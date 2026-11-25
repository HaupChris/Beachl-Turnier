/**
 * Match Completion Orchestrator
 *
 * Orchestrates the complex logic of completing a match:
 * 1. Determine match winner from set scores
 * 2. Propagate results to bracket (knockout/placement-tree)
 * 3. Update standings (group or general)
 * 4. Trigger phase transitions when phases complete
 *
 * This is a pure domain service - no side effects, just computation.
 *
 * @see docs/tournament-modes-specification.md
 */

import type { TournamentSystem } from '../types/system';
import { isGroupBasedSystem } from '../types/system';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Set score representation
 */
export interface SetScore {
  teamA: number;
  teamB: number;
}

/**
 * Match data for completion
 */
export interface MatchData {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  scores: SetScore[];
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed';
  round?: number;
  group?: string;
  knockoutRound?: string;
  winnerId?: string | null;
  winnerGoesTo?: string;
  loserGoesTo?: string;
}

/**
 * Team standing data
 */
export interface StandingData {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  points: number;
  groupId?: string;
  groupRank?: number;
}

/**
 * Result of match completion
 */
export interface MatchCompletionResult {
  /** The completed match with winner determined */
  completedMatch: MatchData;

  /** Updated bracket matches (for knockout systems) */
  updatedBracketMatches: MatchData[];

  /** Whether tournament/phase is now complete */
  phaseComplete: boolean;

  /** New tournament status */
  newStatus: 'in-progress' | 'completed';
}

/**
 * Result of winner determination
 */
export interface WinnerResult {
  winnerId: string | null;
  setsWonA: number;
  setsWonB: number;
}

/**
 * Configuration for match completion
 */
export interface MatchCompletionConfig {
  /** Tournament system type */
  system: TournamentSystem;

  /** Sets needed to win */
  setsToWin: number;
}

// =============================================================================
// MATCH COMPLETION ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates match completion logic
 */
export class MatchCompletionOrchestrator {
  constructor(_config?: MatchCompletionConfig) {
    void _config; // Config reserved for future customization
  }

  /**
   * Determine match winner from set scores
   */
  determineWinner(match: MatchData): WinnerResult {
    if (!match.teamAId || !match.teamBId) {
      return { winnerId: null, setsWonA: 0, setsWonB: 0 };
    }

    let setsWonA = 0;
    let setsWonB = 0;

    for (const score of match.scores) {
      if (score.teamA > score.teamB) {
        setsWonA++;
      } else if (score.teamB > score.teamA) {
        setsWonB++;
      }
    }

    // Winner is whoever won more sets
    const winnerId = setsWonA > setsWonB ? match.teamAId : match.teamBId;

    return { winnerId, setsWonA, setsWonB };
  }

  /**
   * Complete a match and propagate results
   */
  completeMatch(match: MatchData, allMatches: MatchData[]): MatchCompletionResult {
    const { winnerId, setsWonA, setsWonB } = this.determineWinner(match);

    // Create the completed match
    const completedMatch: MatchData = {
      ...match,
      winnerId,
      status: 'completed',
    };

    // Propagate to bracket if applicable
    let updatedBracketMatches = this.propagateToBracket(
      completedMatch,
      allMatches,
      setsWonA,
      setsWonB
    );

    // Ensure the completed match is in the updated list
    updatedBracketMatches = updatedBracketMatches.map(m =>
      m.id === completedMatch.id ? completedMatch : m
    );

    // Check phase completion status
    const { phaseComplete, newStatus } = this.checkPhaseCompletion(updatedBracketMatches);

    return {
      completedMatch,
      updatedBracketMatches,
      phaseComplete,
      newStatus,
    };
  }

  /**
   * Propagate match results to dependent bracket matches
   */
  private propagateToBracket(
    completedMatch: MatchData,
    allMatches: MatchData[],
    _setsWonA: number,
    _setsWonB: number
  ): MatchData[] {
    const updatedMatches = [...allMatches];

    // Find the index of the completed match and update it
    const completedIndex = updatedMatches.findIndex(m => m.id === completedMatch.id);
    if (completedIndex >= 0) {
      updatedMatches[completedIndex] = completedMatch;
    }

    // Propagate winner to next match
    if (completedMatch.winnerGoesTo && completedMatch.winnerId) {
      const nextMatchIndex = updatedMatches.findIndex(m => m.id === completedMatch.winnerGoesTo);
      if (nextMatchIndex >= 0) {
        const nextMatch = updatedMatches[nextMatchIndex];
        // Determine which slot to fill
        if (!nextMatch.teamAId) {
          updatedMatches[nextMatchIndex] = { ...nextMatch, teamAId: completedMatch.winnerId };
        } else if (!nextMatch.teamBId) {
          updatedMatches[nextMatchIndex] = { ...nextMatch, teamBId: completedMatch.winnerId };
        }
      }
    }

    // Propagate loser to consolation match (if applicable)
    if (completedMatch.loserGoesTo && completedMatch.winnerId) {
      const loserId = completedMatch.winnerId === completedMatch.teamAId
        ? completedMatch.teamBId
        : completedMatch.teamAId;

      if (loserId) {
        const consolationIndex = updatedMatches.findIndex(m => m.id === completedMatch.loserGoesTo);
        if (consolationIndex >= 0) {
          const consolationMatch = updatedMatches[consolationIndex];
          if (!consolationMatch.teamAId) {
            updatedMatches[consolationIndex] = { ...consolationMatch, teamAId: loserId };
          } else if (!consolationMatch.teamBId) {
            updatedMatches[consolationIndex] = { ...consolationMatch, teamBId: loserId };
          }
        }
      }
    }

    return updatedMatches;
  }

  /**
   * Check if the phase/tournament is complete
   */
  private checkPhaseCompletion(matches: MatchData[]): { phaseComplete: boolean; newStatus: 'in-progress' | 'completed' } {
    const allCompleted = matches.every(m =>
      m.status === 'completed' || m.status === 'pending'
    );
    const hasScheduledOrInProgress = matches.some(m =>
      m.status === 'scheduled' || m.status === 'in-progress'
    );

    const phaseComplete = !hasScheduledOrInProgress && allCompleted;
    const newStatus = phaseComplete ? 'completed' : 'in-progress';

    return { phaseComplete, newStatus };
  }

  /**
   * Check if a specific round is complete
   */
  isRoundComplete(matches: MatchData[], round: number): boolean {
    const roundMatches = matches.filter(m => m.round === round);
    return roundMatches.length > 0 && roundMatches.every(m => m.status === 'completed');
  }

  /**
   * Check if a knockout round is complete
   */
  isKnockoutRoundComplete(matches: MatchData[], knockoutRound: string): boolean {
    const roundMatches = matches.filter(m => m.knockoutRound === knockoutRound);
    return roundMatches.length > 0 && roundMatches.every(m => m.status === 'completed');
  }

  /**
   * Get completed rounds
   */
  getCompletedRounds(matches: MatchData[]): number[] {
    const rounds = new Set(matches.filter(m => m.round).map(m => m.round!));
    return Array.from(rounds)
      .filter(round => this.isRoundComplete(matches, round))
      .sort((a, b) => a - b);
  }

  /**
   * Check if group phase is complete (for group-based systems)
   */
  isGroupPhaseComplete(matches: MatchData[]): boolean {
    const groupMatches = matches.filter(m => m.group);
    return groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
  }
}

// =============================================================================
// PHASE TRANSITION DETECTOR
// =============================================================================

/**
 * Detects when phase transitions should occur
 */
export class PhaseTransitionDetector {
  /**
   * Check if group phase completion should trigger knockout population
   */
  shouldPopulateKnockout(
    system: TournamentSystem,
    matches: MatchData[],
    currentStatus: string
  ): boolean {
    if (!isGroupBasedSystem(system)) return false;
    if (currentStatus !== 'completed') return false;

    // All group matches must be complete
    const groupMatches = matches.filter(m => m.group);
    return groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
  }

  /**
   * Check if round-robin completion should trigger playoff population
   */
  shouldPopulatePlayoff(
    system: TournamentSystem,
    currentStatus: string
  ): boolean {
    return system === 'round-robin' && currentStatus === 'completed';
  }

  /**
   * Determine the knockout system type based on parent system
   */
  getKnockoutSystemType(parentSystem: TournamentSystem): 'knockout' | 'placement-tree' | 'short-main-knockout' {
    switch (parentSystem) {
      case 'groups-split-bracket':
      case 'beachl-short-main':
        return 'short-main-knockout';
      case 'groups-full-placement':
      case 'beachl-all-placements':
        return 'placement-tree';
      default:
        return 'knockout';
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a match completion orchestrator
 */
export function createMatchCompletionOrchestrator(
  config: MatchCompletionConfig
): MatchCompletionOrchestrator {
  return new MatchCompletionOrchestrator(config);
}

/**
 * Quick winner determination
 */
export function determineMatchWinner(match: MatchData): WinnerResult {
  const orchestrator = new MatchCompletionOrchestrator({
    system: 'round-robin',
    setsToWin: 2,
  });
  return orchestrator.determineWinner(match);
}

/**
 * Check if all matches in a group are complete
 */
export function isGroupComplete(matches: MatchData[], groupId: string): boolean {
  const groupMatches = matches.filter(m => m.group === groupId);
  return groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
}

/**
 * Get the next pending match for a team
 */
export function getNextMatchForTeam(matches: MatchData[], teamId: string): MatchData | null {
  return matches.find(m =>
    (m.teamAId === teamId || m.teamBId === teamId) &&
    m.status !== 'completed'
  ) ?? null;
}

/**
 * Count completed matches
 */
export function countCompletedMatches(matches: MatchData[]): number {
  return matches.filter(m => m.status === 'completed').length;
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercentage(matches: MatchData[]): number {
  if (matches.length === 0) return 0;
  return Math.round((countCompletedMatches(matches) / matches.length) * 100);
}
