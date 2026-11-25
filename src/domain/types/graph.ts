/**
 * Graph-Based Bracket Types
 *
 * This module defines types for representing tournament brackets as directed graphs.
 * Each match is a node with edges pointing to the next matches for winner and loser.
 *
 * Key Concepts:
 * - MatchNode: A match represented as a graph node
 * - TeamSlot: How a team is determined (static, bye, dependent, placeholder)
 * - MatchEdge: Connection to the next match
 *
 * This approach enables:
 * - Automatic propagation of winners/losers
 * - Flexible bracket structures (single elim, double elim, placement trees)
 * - Clear visualization of dependencies
 */

import type { SetScore, MatchStatus } from './match';

// =============================================================================
// TEAM SLOT TYPES
// =============================================================================

/**
 * Static team slot - team is known at bracket creation
 */
export interface StaticTeamSlot {
  type: 'static';
  teamId: string;
}

/**
 * Bye slot - no opponent, team advances automatically
 */
export interface ByeTeamSlot {
  type: 'bye';
}

/**
 * Dependent team slot - team determined by another match's result
 */
export interface DependentTeamSlot {
  type: 'dependent';
  matchId: string;
  result: 'winner' | 'loser';
}

/**
 * Placeholder team slot - shows description until team is determined
 */
export interface PlaceholderTeamSlot {
  type: 'placeholder';
  description: string;
  /** Optional source for auto-population */
  source?: {
    type: 'group';
    groupIndex: number;
    rank: number;
  } | {
    type: 'standing';
    rank: number;
  };
}

/**
 * Union of all team slot types
 */
export type TeamSlot = StaticTeamSlot | ByeTeamSlot | DependentTeamSlot | PlaceholderTeamSlot;

// =============================================================================
// MATCH EDGE TYPES
// =============================================================================

/**
 * Edge connecting a match to the next match
 */
export interface MatchEdge {
  /** ID of the target match */
  matchId: string;
  /** Which slot (A or B) the team fills in the target match */
  slot: 'A' | 'B';
}

// =============================================================================
// MATCH NODE TYPE
// =============================================================================

/**
 * A match represented as a node in the bracket graph
 *
 * This is the core type for graph-based bracket representation.
 * Unlike the discriminated union Match types, MatchNode focuses on
 * the graph structure rather than tournament-system-specific fields.
 */
export interface MatchNode {
  /** Unique match identifier */
  id: string;

  /** Team A slot (static, bye, dependent, or placeholder) */
  teamA: TeamSlot;

  /** Team B slot */
  teamB: TeamSlot;

  /** Where the winner advances (null = tournament ends for winner) */
  winnerGoesTo: MatchEdge | null;

  /** Where the loser goes (null = eliminated) */
  loserGoesTo: MatchEdge | null;

  /** Round identifier (can be string for named rounds) */
  round: string;

  /** Optional bracket identifier for multi-bracket systems */
  bracket?: string;

  /** Court assignment */
  courtNumber?: number;

  /** Scheduled start time */
  scheduledTime?: string;

  /** Match status */
  status: MatchStatus;

  /** Set scores */
  scores: SetScore[];

  /** Winner team ID (set after match completion) */
  winnerId: string | null;

  /** Assigned referee team */
  refereeTeamId?: string | null;

  /** Position for visualization (ordering within round) */
  position: number;

  /** Metadata for rendering (labels, intervals, etc.) */
  metadata?: MatchNodeMetadata;
}

/**
 * Additional metadata for match rendering and logic
 */
export interface MatchNodeMetadata {
  /** Display label (e.g., "Semifinal 1") */
  label?: string;

  /** For placement trees: current placement interval */
  placementInterval?: { start: number; end: number };

  /** For placement trees: winner's new interval */
  winnerInterval?: { start: number; end: number };

  /** For placement trees: loser's new interval */
  loserInterval?: { start: number; end: number };

  /** Is this the final match for determining 1st place? */
  isFinal?: boolean;

  /** Is this the third-place match? */
  isThirdPlace?: boolean;

  /** Is this a conditional match (only played under certain conditions)? */
  isConditional?: boolean;

  /** Condition for conditional matches (e.g., "if loser bracket winner wins final") */
  condition?: {
    matchId: string;
    requiredWinner: 'teamA' | 'teamB';
  };
}

// =============================================================================
// TYPE GUARDS FOR TEAM SLOTS
// =============================================================================

/**
 * Check if a team slot is a static (known) team
 */
export function isStaticSlot(slot: TeamSlot): slot is StaticTeamSlot {
  return slot.type === 'static';
}

/**
 * Check if a team slot is a bye
 */
export function isByeSlot(slot: TeamSlot): slot is ByeTeamSlot {
  return slot.type === 'bye';
}

/**
 * Check if a team slot depends on another match
 */
export function isDependentSlot(slot: TeamSlot): slot is DependentTeamSlot {
  return slot.type === 'dependent';
}

/**
 * Check if a team slot is a placeholder
 */
export function isPlaceholderSlot(slot: TeamSlot): slot is PlaceholderTeamSlot {
  return slot.type === 'placeholder';
}

/**
 * Check if a team slot is resolved (has a known team or is a bye)
 */
export function isSlotResolved(slot: TeamSlot): boolean {
  return slot.type === 'static' || slot.type === 'bye';
}

// =============================================================================
// MATCH NODE UTILITIES
// =============================================================================

/**
 * Check if a match node is ready to be played
 */
export function isNodeReady(node: MatchNode): boolean {
  if (node.status === 'completed') return false;
  return isSlotResolved(node.teamA) && isSlotResolved(node.teamB);
}

/**
 * Check if a match node is a bye match (one team gets free pass)
 */
export function isByeMatch(node: MatchNode): boolean {
  return isByeSlot(node.teamA) || isByeSlot(node.teamB);
}

/**
 * Get the team ID from a slot if it's resolved
 */
export function getTeamIdFromSlot(slot: TeamSlot): string | null {
  if (isStaticSlot(slot)) return slot.teamId;
  return null;
}

/**
 * Get display text for a team slot
 */
export function getSlotDisplayText(slot: TeamSlot, teamName?: string): string {
  switch (slot.type) {
    case 'static':
      return teamName || slot.teamId;
    case 'bye':
      return 'Freilos';
    case 'dependent':
      return slot.result === 'winner'
        ? `Sieger ${slot.matchId}`
        : `Verlierer ${slot.matchId}`;
    case 'placeholder':
      return slot.description;
  }
}

/**
 * Check if a match is the final (determines 1st place)
 */
export function isFinalMatch(node: MatchNode): boolean {
  return node.metadata?.isFinal === true ||
    (node.winnerGoesTo === null && node.loserGoesTo?.matchId !== undefined);
}

/**
 * Check if a match is a third-place match
 */
export function isThirdPlaceMatchNode(node: MatchNode): boolean {
  return node.metadata?.isThirdPlace === true;
}

/**
 * Check if a match is conditional (may not be played)
 */
export function isConditionalMatch(node: MatchNode): boolean {
  return node.metadata?.isConditional === true;
}

// =============================================================================
// BRACKET GRAPH TYPE
// =============================================================================

/**
 * A complete bracket represented as a graph
 */
export interface BracketGraph {
  /** All match nodes in the bracket */
  nodes: MatchNode[];

  /** Root nodes (matches with no incoming edges - first round) */
  rootNodeIds: string[];

  /** Final node ID (match that determines 1st place) */
  finalNodeId: string;

  /** Third-place match node ID (if applicable) */
  thirdPlaceNodeId?: string;

  /** Bracket type identifier */
  type: 'single-elimination' | 'double-elimination' | 'placement-tree' | 'split-bracket';

  /** Metadata about the bracket */
  metadata?: {
    /** Number of teams in the bracket */
    teamCount: number;
    /** Number of groups (for group-based brackets) */
    groupCount?: number;
    /** Total rounds in the bracket */
    totalRounds: number;
  };
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a static team slot
 */
export function createStaticSlot(teamId: string): StaticTeamSlot {
  return { type: 'static', teamId };
}

/**
 * Create a bye slot
 */
export function createByeSlot(): ByeTeamSlot {
  return { type: 'bye' };
}

/**
 * Create a dependent team slot
 */
export function createDependentSlot(
  matchId: string,
  result: 'winner' | 'loser'
): DependentTeamSlot {
  return { type: 'dependent', matchId, result };
}

/**
 * Create a placeholder team slot
 */
export function createPlaceholderSlot(
  description: string,
  source?: PlaceholderTeamSlot['source']
): PlaceholderTeamSlot {
  return { type: 'placeholder', description, source };
}

/**
 * Create a match edge
 */
export function createMatchEdge(matchId: string, slot: 'A' | 'B'): MatchEdge {
  return { matchId, slot };
}

/**
 * Create a new match node
 */
export function createMatchNode(
  params: Omit<MatchNode, 'scores' | 'winnerId' | 'status'> & {
    scores?: SetScore[];
    winnerId?: string | null;
    status?: MatchStatus;
  }
): MatchNode {
  return {
    scores: [],
    winnerId: null,
    status: 'pending',
    ...params,
  };
}

// =============================================================================
// GRAPH TRAVERSAL UTILITIES
// =============================================================================

/**
 * Find a match node by ID
 */
export function findNodeById(graph: BracketGraph, id: string): MatchNode | undefined {
  return graph.nodes.find(n => n.id === id);
}

/**
 * Get all matches that depend on a given match
 */
export function getDependentMatches(graph: BracketGraph, matchId: string): MatchNode[] {
  return graph.nodes.filter(node => {
    if (isDependentSlot(node.teamA) && node.teamA.matchId === matchId) return true;
    if (isDependentSlot(node.teamB) && node.teamB.matchId === matchId) return true;
    return false;
  });
}

/**
 * Get the match that a team advances to (winner path)
 */
export function getWinnerNextMatch(graph: BracketGraph, matchId: string): MatchNode | undefined {
  const node = findNodeById(graph, matchId);
  if (!node?.winnerGoesTo) return undefined;
  return findNodeById(graph, node.winnerGoesTo.matchId);
}

/**
 * Get the match that the loser advances to (consolation path)
 */
export function getLoserNextMatch(graph: BracketGraph, matchId: string): MatchNode | undefined {
  const node = findNodeById(graph, matchId);
  if (!node?.loserGoesTo) return undefined;
  return findNodeById(graph, node.loserGoesTo.matchId);
}

/**
 * Get all root matches (first round, no dependencies)
 */
export function getRootMatches(graph: BracketGraph): MatchNode[] {
  return graph.rootNodeIds.map(id => findNodeById(graph, id)).filter(Boolean) as MatchNode[];
}

/**
 * Get matches grouped by round
 */
export function getMatchesByRound(graph: BracketGraph): Map<string, MatchNode[]> {
  const byRound = new Map<string, MatchNode[]>();

  for (const node of graph.nodes) {
    const existing = byRound.get(node.round) || [];
    existing.push(node);
    byRound.set(node.round, existing);
  }

  return byRound;
}

/**
 * Propagate a match result through the bracket
 * Returns the updated nodes that were affected
 */
export function propagateResult(
  graph: BracketGraph,
  matchId: string,
  winnerId: string,
  loserId: string
): MatchNode[] {
  const node = findNodeById(graph, matchId);
  if (!node) return [];

  const updatedNodes: MatchNode[] = [];

  // Update winner path
  if (node.winnerGoesTo) {
    const nextMatch = findNodeById(graph, node.winnerGoesTo.matchId);
    if (nextMatch) {
      const slot = node.winnerGoesTo.slot;
      if (slot === 'A') {
        nextMatch.teamA = createStaticSlot(winnerId);
      } else {
        nextMatch.teamB = createStaticSlot(winnerId);
      }
      updatedNodes.push(nextMatch);
    }
  }

  // Update loser path
  if (node.loserGoesTo) {
    const nextMatch = findNodeById(graph, node.loserGoesTo.matchId);
    if (nextMatch) {
      const slot = node.loserGoesTo.slot;
      if (slot === 'A') {
        nextMatch.teamA = createStaticSlot(loserId);
      } else {
        nextMatch.teamB = createStaticSlot(loserId);
      }
      updatedNodes.push(nextMatch);
    }
  }

  return updatedNodes;
}
