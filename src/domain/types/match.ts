/**
 * Match Type Definitions with Discriminated Unions
 *
 * This module defines match types for different tournament systems using
 * discriminated unions. Each match type has a `type` field that enables
 * TypeScript to narrow the type automatically.
 *
 * Match Types:
 * - StandardMatch: Round-robin, Swiss, group phase matches
 * - KnockoutMatch: SSVB knockout matches with bracket dependencies
 * - PlacementMatch: Full placement tree matches with winner/loser intervals
 * - MultiBracketMatch: Split bracket matches in tiered structure
 */

// =============================================================================
// SHARED TYPES
// =============================================================================

/**
 * Score for a single set
 */
export interface SetScore {
  teamA: number;
  teamB: number;
}

/**
 * Match status values
 */
export type MatchStatus = 'pending' | 'scheduled' | 'in-progress' | 'completed';

/**
 * Knockout round types (used by KnockoutMatch)
 */
export type KnockoutRoundType =
  // SSVB knockout rounds
  | 'intermediate'     // Zwischenrunde: 2nd vs 3rd from different groups
  | 'round-of-16'      // Achtelfinale
  | 'quarterfinal'     // Viertelfinale
  | 'semifinal'        // Halbfinale
  | 'third-place'      // Spiel um Platz 3
  | 'final';           // Finale

/**
 * Placement tree round types (used by PlacementMatch)
 */
export type PlacementRoundType =
  | 'placement-round-1'  // First round: divides [1..N] into halves
  | 'placement-round-2'  // Second round
  | 'placement-round-3'  // Third round
  | 'placement-round-4'  // Fourth round
  | 'placement-final';   // Final placement match (interval size 2)

/**
 * Multi-bracket round types (used by MultiBracketMatch)
 */
export type MultiBracketRoundType =
  | 'qualification'      // B-Teams qualification round
  | 'top-quarterfinal'   // Top bracket quarterfinal
  | 'top-semifinal'      // Top bracket semifinal
  | 'top-final'          // Top bracket final
  | 'placement-5-8'      // Placement bracket 5-8
  | 'placement-9-12'     // Placement bracket 9-12
  | 'placement-13-16'    // Placement bracket 13-16
  | 'placement-block';   // Generic placement block

/**
 * Match dependency: team slot depends on another match's result
 */
export interface MatchDependency {
  teamA?: {
    matchId: string;
    result: 'winner' | 'loser';
  };
  teamB?: {
    matchId: string;
    result: 'winner' | 'loser';
  };
}

/**
 * Team source for auto-population from standings
 */
export type TeamSource =
  | { type: 'group'; groupIndex: number; rank: number }
  | { type: 'standing'; rank: number };

/**
 * Interval representing a placement range
 */
export interface PlacementInterval {
  start: number;  // e.g., 1 (1st place)
  end: number;    // e.g., 8 (8th place)
}

// =============================================================================
// BASE MATCH INTERFACE
// =============================================================================

/**
 * Common properties shared by all match types
 */
interface BaseMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  courtNumber: number | null;
  scores: SetScore[];
  winnerId: string | null;
  status: MatchStatus;
  refereeTeamId?: string | null;
}

// =============================================================================
// MATCH TYPE VARIANTS
// =============================================================================

/**
 * Standard match for round-robin, Swiss, and group phase
 *
 * Used in:
 * - round-robin
 * - round-robin-playoff
 * - swiss
 * - groups-only (within groups)
 * - groups-* (group phase portion)
 */
export interface StandardMatch extends BaseMatch {
  type: 'standard';

  /** Group ID if this is a group phase match */
  groupId?: string;

  /** True if this is a playoff/finale match */
  isPlayoff?: boolean;

  /** Place being contested (e.g., 1 for 1st/2nd place match) */
  playoffForPlace?: number;
}

/**
 * Knockout match for SSVB-style single elimination
 *
 * Used in:
 * - groups-ssvb-knockout (knockout phase)
 */
export interface KnockoutMatch extends BaseMatch {
  type: 'knockout';

  /** Type of knockout round */
  knockoutRound: KnockoutRoundType;

  /** Position in bracket for visualization */
  bracketPosition: number;

  /** Dependencies on other matches */
  dependsOn?: MatchDependency;

  /** Placeholder text for team A (e.g., "Sieger ZR1") */
  teamAPlaceholder?: string;

  /** Placeholder text for team B */
  teamBPlaceholder?: string;

  /** Source for auto-populating team A */
  teamASource?: TeamSource;

  /** Source for auto-populating team B */
  teamBSource?: TeamSource;

  /** Placeholder text for referee */
  refereePlaceholder?: string;
}

/**
 * Placement match for full placement tree
 *
 * Every match in a placement tree has both a winner path and a loser path.
 * The intervals describe which placements are being contested.
 *
 * Used in:
 * - groups-full-placement (knockout phase)
 * - placement-tree (internal)
 */
export interface PlacementMatch extends BaseMatch {
  type: 'placement';

  /** Type of placement round */
  placementRound: PlacementRoundType;

  /** Current interval being contested (e.g., [1..8]) */
  placementInterval: PlacementInterval;

  /** Interval winner advances to (e.g., [1..4]) */
  winnerInterval: PlacementInterval;

  /** Interval loser drops to (e.g., [5..8]) */
  loserInterval: PlacementInterval;

  /** Position in tree for visualization */
  bracketPosition: number;

  /** Dependencies on other matches */
  dependsOn?: MatchDependency;

  /** Placeholder text for team A */
  teamAPlaceholder?: string;

  /** Placeholder text for team B */
  teamBPlaceholder?: string;

  /** Source for auto-populating teams */
  teamASource?: TeamSource;
  teamBSource?: TeamSource;

  /** Placeholder text for referee */
  refereePlaceholder?: string;
}

/**
 * Multi-bracket match for split/tiered bracket structure
 *
 * The bracket is divided into tiers (main, placement-5-8, placement-9-12, etc.)
 * with no reconnection between tiers.
 *
 * Used in:
 * - groups-split-bracket (knockout phase)
 * - short-main-knockout (internal)
 */
export interface MultiBracketMatch extends BaseMatch {
  type: 'multibracket';

  /** Which bracket this match belongs to */
  bracket: 'main' | 'placement-5-8' | 'placement-9-12' | 'placement-13-16';

  /** Type of round within the bracket */
  bracketRound: MultiBracketRoundType;

  /** Position in bracket for visualization */
  bracketPosition: number;

  /** Dependencies on other matches */
  dependsOn?: MatchDependency;

  /** Placeholder text for teams */
  teamAPlaceholder?: string;
  teamBPlaceholder?: string;

  /** Source for auto-populating teams */
  teamASource?: TeamSource;
  teamBSource?: TeamSource;

  /** Placeholder text for referee */
  refereePlaceholder?: string;
}

// =============================================================================
// DISCRIMINATED UNION
// =============================================================================

/**
 * Union of all match types
 *
 * Use type guards to narrow the type:
 * ```typescript
 * if (isKnockoutMatch(match)) {
 *   console.log(match.knockoutRound); // TypeScript knows this exists
 * }
 * ```
 */
export type Match = StandardMatch | KnockoutMatch | PlacementMatch | MultiBracketMatch;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a match is a standard match (round-robin, Swiss, group phase)
 */
export function isStandardMatch(match: Match): match is StandardMatch {
  return match.type === 'standard';
}

/**
 * Check if a match is a knockout match (SSVB-style)
 */
export function isKnockoutMatch(match: Match): match is KnockoutMatch {
  return match.type === 'knockout';
}

/**
 * Check if a match is a placement match (full placement tree)
 */
export function isPlacementMatch(match: Match): match is PlacementMatch {
  return match.type === 'placement';
}

/**
 * Check if a match is a multi-bracket match (split brackets)
 */
export function isMultiBracketMatch(match: Match): match is MultiBracketMatch {
  return match.type === 'multibracket';
}

/**
 * Check if a match has dependencies on other matches
 */
export function hasDependencies(match: Match): boolean {
  if (isStandardMatch(match)) return false;
  return match.dependsOn !== undefined;
}

/**
 * Check if a match is ready to be played (all dependencies resolved)
 */
export function isMatchReady(match: Match): boolean {
  if (match.status === 'completed') return false;
  return match.teamAId !== null && match.teamBId !== null;
}

/**
 * Check if a match is a playoff/finals match
 */
export function isPlayoffMatch(match: Match): boolean {
  if (isStandardMatch(match)) {
    return match.isPlayoff === true;
  }
  if (isKnockoutMatch(match)) {
    return ['semifinal', 'third-place', 'final'].includes(match.knockoutRound);
  }
  if (isPlacementMatch(match)) {
    return match.placementRound === 'placement-final';
  }
  if (isMultiBracketMatch(match)) {
    return match.bracketRound.includes('final');
  }
  return false;
}

/**
 * Check if a match is a third-place match
 */
export function isThirdPlaceMatch(match: Match): boolean {
  if (isKnockoutMatch(match)) {
    return match.knockoutRound === 'third-place';
  }
  if (isPlacementMatch(match)) {
    return (
      match.placementRound === 'placement-final' &&
      match.placementInterval.start === 3 &&
      match.placementInterval.end === 4
    );
  }
  return false;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new standard match
 */
export function createStandardMatch(
  params: Omit<StandardMatch, 'type' | 'scores' | 'winnerId' | 'status'> & {
    scores?: SetScore[];
    winnerId?: string | null;
    status?: MatchStatus;
  }
): StandardMatch {
  return {
    type: 'standard',
    scores: [],
    winnerId: null,
    status: 'scheduled',
    ...params,
  };
}

/**
 * Create a new knockout match
 */
export function createKnockoutMatch(
  params: Omit<KnockoutMatch, 'type' | 'scores' | 'winnerId' | 'status'> & {
    scores?: SetScore[];
    winnerId?: string | null;
    status?: MatchStatus;
  }
): KnockoutMatch {
  return {
    type: 'knockout',
    scores: [],
    winnerId: null,
    status: 'pending',
    ...params,
  };
}

/**
 * Create a new placement match
 */
export function createPlacementMatch(
  params: Omit<PlacementMatch, 'type' | 'scores' | 'winnerId' | 'status'> & {
    scores?: SetScore[];
    winnerId?: string | null;
    status?: MatchStatus;
  }
): PlacementMatch {
  return {
    type: 'placement',
    scores: [],
    winnerId: null,
    status: 'pending',
    ...params,
  };
}

/**
 * Create a new multi-bracket match
 */
export function createMultiBracketMatch(
  params: Omit<MultiBracketMatch, 'type' | 'scores' | 'winnerId' | 'status'> & {
    scores?: SetScore[];
    winnerId?: string | null;
    status?: MatchStatus;
  }
): MultiBracketMatch {
  return {
    type: 'multibracket',
    scores: [],
    winnerId: null,
    status: 'pending',
    ...params,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the match type as a human-readable string
 */
export function getMatchTypeLabel(match: Match): string {
  switch (match.type) {
    case 'standard':
      if (match.isPlayoff) return 'Platzierungsspiel';
      if (match.groupId) return 'Gruppenspiel';
      return 'Rundenspiel';
    case 'knockout':
      return getKnockoutRoundLabel(match.knockoutRound);
    case 'placement':
      return getPlacementRoundLabel(match.placementRound, match.placementInterval);
    case 'multibracket':
      return getMultiBracketRoundLabel(match.bracket, match.bracketRound);
  }
}

function getKnockoutRoundLabel(round: KnockoutRoundType): string {
  const labels: Record<KnockoutRoundType, string> = {
    intermediate: 'Zwischenrunde',
    'round-of-16': 'Achtelfinale',
    quarterfinal: 'Viertelfinale',
    semifinal: 'Halbfinale',
    'third-place': 'Spiel um Platz 3',
    final: 'Finale',
  };
  return labels[round];
}

function getPlacementRoundLabel(round: PlacementRoundType, interval: PlacementInterval): string {
  if (round === 'placement-final') {
    return `Platz ${interval.start}/${interval.end}`;
  }
  return `Platzierungsrunde (${interval.start}-${interval.end})`;
}

function getMultiBracketRoundLabel(bracket: string, round: MultiBracketRoundType): string {
  if (bracket === 'main') {
    const labels: Record<string, string> = {
      'top-quarterfinal': 'Viertelfinale',
      'top-semifinal': 'Halbfinale',
      'top-final': 'Finale',
    };
    return labels[round] || round;
  }
  if (round === 'placement-block') {
    return 'Platzierungsblock';
  }
  return `${bracket} ${round}`;
}

/**
 * Calculate the winner based on set scores
 * Returns the team ID of the winner, or null if match is incomplete
 */
export function calculateWinner(
  match: Match,
  requiredSets: number = 2
): string | null {
  let teamASets = 0;
  let teamBSets = 0;

  for (const score of match.scores) {
    if (score.teamA > score.teamB) {
      teamASets++;
    } else if (score.teamB > score.teamA) {
      teamBSets++;
    }
  }

  if (teamASets >= requiredSets) return match.teamAId;
  if (teamBSets >= requiredSets) return match.teamBId;
  return null;
}
