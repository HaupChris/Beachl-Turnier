/**
 * Tournament Start Orchestrator
 *
 * Orchestrates the complex logic of starting a tournament:
 * 1. Generate appropriate matches based on tournament system
 * 2. Initialize standings/group standings
 * 3. Create knockout phase placeholder for group-based systems
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
 * Team data for tournament start
 */
export interface TeamData {
  id: string;
  name: string;
  seed?: number;
}

/**
 * Group configuration
 */
export interface GroupConfig {
  id: string;
  name: string;
  teamIds: string[];
}

/**
 * Group phase configuration
 */
export interface GroupPhaseConfig {
  numberOfGroups: number;
  teamsPerGroup: number;
  groups: GroupConfig[];
}

/**
 * Match to be generated
 */
export interface GeneratedMatch {
  id: string;
  teamAId: string;
  teamBId: string | null;
  status: 'scheduled' | 'pending';
  round?: number;
  group?: string;
  court?: number;
  scheduledTime?: string;
}

/**
 * Standing initialization data
 */
export interface InitialStanding {
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
 * Knockout settings
 */
export interface KnockoutSettings {
  useReferees?: boolean;
  matchDuration?: number;
  numberOfCourts?: number;
}

/**
 * Knockout phase placeholder
 */
export interface KnockoutPhasePlaceholder {
  id: string;
  name: string;
  system: 'knockout' | 'placement-tree' | 'short-main-knockout' | 'playoff';
  matches: GeneratedMatch[];
  parentPhaseId: string;
  phaseOrder: number;
  phaseName: string;
}

/**
 * Tournament start configuration
 */
export interface TournamentStartConfig {
  id: string;
  system: TournamentSystem;
  teams: TeamData[];
  numberOfCourts: number;
  groupPhaseConfig?: GroupPhaseConfig;
  knockoutSettings?: KnockoutSettings;
  swissRounds?: number;
}

/**
 * Result of tournament start
 */
export interface TournamentStartResult {
  /** Generated matches for phase 1 */
  matches: GeneratedMatch[];

  /** Initial standings (for non-group systems) */
  standings: InitialStanding[];

  /** Initial group standings (for group systems) */
  groupStandings: InitialStanding[];

  /** Current round (for Swiss) */
  currentRound: number;

  /** Knockout phase placeholder (if applicable) */
  knockoutPhase?: KnockoutPhasePlaceholder;

  /** New tournament status */
  status: 'in-progress';
}

// =============================================================================
// TOURNAMENT START ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates tournament start logic
 */
export class TournamentStartOrchestrator {
  private idGenerator: () => string;

  constructor(idGenerator: () => string = () => crypto.randomUUID()) {
    this.idGenerator = idGenerator;
  }

  /**
   * Start a tournament and generate all necessary data
   */
  start(config: TournamentStartConfig): TournamentStartResult {
    const result: TournamentStartResult = {
      matches: [],
      standings: [],
      groupStandings: [],
      currentRound: 1,
      status: 'in-progress',
    };

    // Generate matches based on system
    if (config.system === 'round-robin' || config.system === 'round-robin-playoff' || config.system === 'playoff') {
      result.matches = this.generateRoundRobinMatches(config.teams, config.numberOfCourts);
      result.standings = this.initializeStandings(config.teams);
    } else if (config.system === 'swiss') {
      result.matches = this.generateSwissRound1Matches(config.teams, config.numberOfCourts);
      result.standings = this.initializeStandings(config.teams);
      result.currentRound = 1;
    } else if (isGroupBasedSystem(config.system) && config.groupPhaseConfig) {
      result.matches = this.generateGroupPhaseMatches(config.groupPhaseConfig, config.numberOfCourts);
      result.groupStandings = this.initializeGroupStandings(config.groupPhaseConfig);
    }

    // Create knockout phase placeholder if needed
    if (this.shouldCreateKnockoutPhase(config)) {
      result.knockoutPhase = this.createKnockoutPhasePlaceholder(config);
    }

    return result;
  }

  /**
   * Generate round-robin matches using polygon method
   */
  private generateRoundRobinMatches(teams: TeamData[], numberOfCourts: number): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];
    const n = teams.length;

    if (n < 2) return matches;

    // Handle odd number of teams with bye
    const teamsList = [...teams];
    const hasBye = n % 2 === 1;
    if (hasBye) {
      teamsList.push({ id: 'BYE', name: 'Bye' });
    }

    const numTeams = teamsList.length;
    const numRounds = numTeams - 1;

    // Polygon method
    for (let round = 0; round < numRounds; round++) {
      const roundMatches: { teamA: TeamData; teamB: TeamData }[] = [];

      for (let i = 0; i < numTeams / 2; i++) {
        const home = (round + i) % (numTeams - 1);
        let away = (numTeams - 1 - i + round) % (numTeams - 1);

        if (i === 0) {
          away = numTeams - 1;
        }

        const teamA = teamsList[home];
        const teamB = teamsList[away];

        // Skip bye matches
        if (teamA.id !== 'BYE' && teamB.id !== 'BYE') {
          roundMatches.push({ teamA, teamB });
        }
      }

      // Assign courts and create matches
      roundMatches.forEach((pairing, index) => {
        matches.push({
          id: this.idGenerator(),
          teamAId: pairing.teamA.id,
          teamBId: pairing.teamB.id,
          status: 'scheduled',
          round: round + 1,
          court: (index % numberOfCourts) + 1,
        });
      });
    }

    return matches;
  }

  /**
   * Generate Swiss round 1 matches (random pairing)
   */
  private generateSwissRound1Matches(teams: TeamData[], numberOfCourts: number): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];

    // Sort by seed if available, otherwise shuffle
    const sortedTeams = [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

    // Pair top half with bottom half
    const half = Math.ceil(sortedTeams.length / 2);
    const topHalf = sortedTeams.slice(0, half);
    const bottomHalf = sortedTeams.slice(half);

    for (let i = 0; i < topHalf.length; i++) {
      const teamA = topHalf[i];
      const teamB = bottomHalf[i];

      if (teamB) {
        matches.push({
          id: this.idGenerator(),
          teamAId: teamA.id,
          teamBId: teamB.id,
          status: 'scheduled',
          round: 1,
          court: (i % numberOfCourts) + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Generate group phase matches
   */
  private generateGroupPhaseMatches(config: GroupPhaseConfig, numberOfCourts: number): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];
    let courtIndex = 0;

    for (const group of config.groups) {
      const groupMatches = this.generateGroupRoundRobin(group.teamIds, group.id, numberOfCourts, courtIndex);
      matches.push(...groupMatches);
      courtIndex = (courtIndex + groupMatches.length) % numberOfCourts;
    }

    return matches;
  }

  /**
   * Generate round-robin matches within a group
   */
  private generateGroupRoundRobin(
    teamIds: string[],
    groupId: string,
    numberOfCourts: number,
    startCourtIndex: number
  ): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];
    const n = teamIds.length;

    if (n < 2) return matches;

    // Simple round-robin within group
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        matches.push({
          id: this.idGenerator(),
          teamAId: teamIds[i],
          teamBId: teamIds[j],
          status: 'scheduled',
          group: groupId,
          court: ((startCourtIndex + matches.length) % numberOfCourts) + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Initialize standings for all teams
   */
  private initializeStandings(teams: TeamData[]): InitialStanding[] {
    return teams.map((team, index) => ({
      teamId: team.id,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      points: 0,
      groupRank: index + 1,
    }));
  }

  /**
   * Initialize group standings
   */
  private initializeGroupStandings(config: GroupPhaseConfig): InitialStanding[] {
    const standings: InitialStanding[] = [];

    for (const group of config.groups) {
      group.teamIds.forEach((teamId, index) => {
        standings.push({
          teamId,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
          groupId: group.id,
          groupRank: index + 1,
        });
      });
    }

    return standings;
  }

  /**
   * Check if knockout phase should be created
   */
  private shouldCreateKnockoutPhase(config: TournamentStartConfig): boolean {
    if (!config.knockoutSettings) return false;

    // Group-based systems with knockout settings
    if (isGroupBasedSystem(config.system)) return true;

    // Round-robin with playoff (becomes round-robin-playoff)
    if (config.system === 'round-robin' || config.system === 'round-robin-playoff') return true;

    return false;
  }

  /**
   * Create knockout phase placeholder
   */
  private createKnockoutPhasePlaceholder(config: TournamentStartConfig): KnockoutPhasePlaceholder {
    const knockoutSystem = this.getKnockoutSystemType(config.system);
    const phaseName = this.getKnockoutPhaseName(knockoutSystem);

    return {
      id: this.idGenerator(),
      name: `${config.id}-knockout`,
      system: knockoutSystem,
      matches: [], // Will be populated when group phase completes
      parentPhaseId: config.id,
      phaseOrder: 2,
      phaseName,
    };
  }

  /**
   * Determine knockout system type based on parent system
   */
  private getKnockoutSystemType(
    parentSystem: TournamentSystem
  ): 'knockout' | 'placement-tree' | 'short-main-knockout' | 'playoff' {
    switch (parentSystem) {
      case 'groups-split-bracket':
      case 'beachl-short-main':
        return 'short-main-knockout';
      case 'groups-full-placement':
      case 'beachl-all-placements':
        return 'placement-tree';
      case 'round-robin':
      case 'round-robin-playoff':
        return 'playoff';
      default:
        return 'knockout';
    }
  }

  /**
   * Get display name for knockout phase
   */
  private getKnockoutPhaseName(system: string): string {
    switch (system) {
      case 'short-main-knockout':
        return 'Hauptrunde';
      case 'placement-tree':
        return 'Platzierungsbaum';
      case 'playoff':
        return 'Finale';
      default:
        return 'K.O.-Phase';
    }
  }
}

// =============================================================================
// SWISS ROUND ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates Swiss round generation
 */
export class SwissRoundOrchestrator {
  private idGenerator: () => string;

  constructor(idGenerator: () => string = () => crypto.randomUUID()) {
    this.idGenerator = idGenerator;
  }

  /**
   * Generate next Swiss round pairings
   */
  generateNextRound(
    standings: InitialStanding[],
    previousMatches: GeneratedMatch[],
    roundNumber: number,
    numberOfCourts: number
  ): GeneratedMatch[] {
    // Sort by points (descending)
    const sorted = [...standings].sort((a, b) => b.points - a.points);

    // Get previous opponents for each team
    const previousOpponents = this.getPreviousOpponents(previousMatches);

    // Greedy pairing
    const matches: GeneratedMatch[] = [];
    const paired = new Set<string>();

    for (const team of sorted) {
      if (paired.has(team.teamId)) continue;

      // Find best available opponent (hasn't played this team)
      const opponent = sorted.find(
        t =>
          t.teamId !== team.teamId &&
          !paired.has(t.teamId) &&
          !previousOpponents.get(team.teamId)?.has(t.teamId)
      );

      if (opponent) {
        paired.add(team.teamId);
        paired.add(opponent.teamId);

        matches.push({
          id: this.idGenerator(),
          teamAId: team.teamId,
          teamBId: opponent.teamId,
          status: 'scheduled',
          round: roundNumber,
          court: ((matches.length) % numberOfCourts) + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Get map of previous opponents for each team
   */
  private getPreviousOpponents(matches: GeneratedMatch[]): Map<string, Set<string>> {
    const opponents = new Map<string, Set<string>>();

    for (const match of matches) {
      if (!match.teamAId || !match.teamBId) continue;

      if (!opponents.has(match.teamAId)) {
        opponents.set(match.teamAId, new Set());
      }
      if (!opponents.has(match.teamBId)) {
        opponents.set(match.teamBId, new Set());
      }

      opponents.get(match.teamAId)!.add(match.teamBId);
      opponents.get(match.teamBId)!.add(match.teamAId);
    }

    return opponents;
  }

  /**
   * Check if more rounds are possible
   */
  canGenerateMoreRounds(
    standings: InitialStanding[],
    previousMatches: GeneratedMatch[],
    currentRound: number,
    maxRounds: number
  ): boolean {
    if (currentRound >= maxRounds) return false;

    const opponents = this.getPreviousOpponents(previousMatches);
    const teamCount = standings.length;

    // Check if any valid pairings exist
    for (let i = 0; i < teamCount; i++) {
      for (let j = i + 1; j < teamCount; j++) {
        const teamA = standings[i].teamId;
        const teamB = standings[j].teamId;

        if (!opponents.get(teamA)?.has(teamB)) {
          return true; // At least one valid pairing exists
        }
      }
    }

    return false;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a tournament start orchestrator
 */
export function createTournamentStartOrchestrator(
  idGenerator?: () => string
): TournamentStartOrchestrator {
  return new TournamentStartOrchestrator(idGenerator);
}

/**
 * Create a Swiss round orchestrator
 */
export function createSwissRoundOrchestrator(
  idGenerator?: () => string
): SwissRoundOrchestrator {
  return new SwissRoundOrchestrator(idGenerator);
}

/**
 * Calculate number of matches for round-robin
 */
export function calculateRoundRobinMatchCount(teamCount: number): number {
  return (teamCount * (teamCount - 1)) / 2;
}

/**
 * Calculate number of rounds for round-robin
 */
export function calculateRoundRobinRoundCount(teamCount: number): number {
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

/**
 * Calculate number of matches for group phase
 */
export function calculateGroupPhaseMatchCount(groups: GroupConfig[]): number {
  return groups.reduce((total, group) => {
    const n = group.teamIds.length;
    return total + (n * (n - 1)) / 2;
  }, 0);
}
