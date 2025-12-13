export type TournamentSystem =
  | 'round-robin'
  | 'swiss'
  | 'pool-play-single-out'
  | 'playoff'
  | 'group-phase'
  | 'knockout'
  | 'beachl-all-placements'      // BeachL-All-Platzierungen: Full placement tree
  | 'beachl-short-main'          // BeachL-Kurze-Hauptrunde: Shortened main round with byes
  | 'placement-tree'             // Internal: Full placement tree knockout phase
  | 'short-main-knockout';       // Internal: Shortened main round knockout phase

// Knockout round types for SSVB format and placement tree
export type KnockoutRoundType =
  | 'intermediate'      // Zwischenrunde: 2. vs 3. from different groups (SSVB)
  | 'quarterfinal'      // Viertelfinale
  | 'semifinal'         // Halbfinale
  | 'third-place'       // Spiel um Platz 3
  | 'final'             // Finale
  // Placement tree specific rounds
  | 'placement-round-1' // Erste Platzierungsrunde (teilt [1..N] in [1..N/2] und [N/2+1..N])
  | 'placement-round-2' // Zweite Platzierungsrunde
  | 'placement-round-3' // Dritte Platzierungsrunde
  | 'placement-round-4' // Vierte Platzierungsrunde
  | 'placement-final'   // Platzierungsfinale (Intervall der Größe 2)
  // Shortened main round specific
  | 'qualification'     // Qualifikationsrunde (B-Teams)
  | 'top-quarterfinal'  // Viertelfinale im Top-K Bereich
  | 'top-semifinal'     // Halbfinale im Top-K Bereich
  | 'top-final'         // Finale im Top-K Bereich
  | 'placement-5-8'     // Platzierungsbaum 5-8
  | 'placement-9-12'    // Platzierungsbaum 9-12
  | 'placement-13-16';  // Platzierungsbaum 13-16 (Bottom-Bracket)

// Group structure for group phase tournaments
export interface Group {
  id: string;
  name: string; // e.g., "Gruppe A", "Gruppe B"
  teamIds: string[];
}

// Group phase configuration
export interface GroupPhaseConfig {
  numberOfGroups: number;
  teamsPerGroup: number; // Should be 4 for SSVB
  groups: Group[];
  seeding: 'snake' | 'random' | 'manual';
}

// Knockout phase configuration
export interface KnockoutConfig {
  // Qualification rules from group phase
  directQualification: number;     // Teams that go directly to knockout (e.g., 1 = group winners)
  playoffQualification: number;    // Teams that play intermediate round (e.g., 2 = 2nd and 3rd place)
  eliminated: number;              // Teams eliminated after group phase (e.g., 1 = last place)

  // Match options
  playThirdPlaceMatch: boolean;    // Whether to play 3rd place match

  // Referee settings
  useReferees: boolean;            // Whether to assign referees
}

export interface Team {
  id: string;
  name: string;
  seedPosition: number;
  isPresent?: boolean; // Whether the team is present and ready to play
}

export interface SetScore {
  teamA: number;
  teamB: number;
}

export interface Match {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  courtNumber: number | null;
  scores: SetScore[];
  winnerId: string | null;
  status: 'scheduled' | 'in-progress' | 'completed' | 'pending';
  dependsOn?: {
    teamA?: { matchId: string; result: 'winner' | 'loser' };
    teamB?: { matchId: string; result: 'winner' | 'loser' };
  };
  isPlayoff?: boolean; // True if this is a playoff match for final placements
  playoffForPlace?: number; // The place being contested (e.g., 1 for 1st/2nd place match)
  // Group phase specific
  groupId?: string; // Which group this match belongs to
  // Knockout specific
  knockoutRound?: KnockoutRoundType; // Type of knockout round
  bracketPosition?: number; // Position in bracket for visualization
  // Referee assignment
  refereeTeamId?: string | null; // Team assigned as referee for this match
  // Placement tree specific
  placementInterval?: { start: number; end: number }; // Current placement interval [start..end]
  winnerInterval?: { start: number; end: number }; // Interval winner goes to
  loserInterval?: { start: number; end: number }; // Interval loser goes to
}

export interface StandingEntry {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  points: number;
}

// Group standing (extends regular standing with group info)
export interface GroupStandingEntry extends StandingEntry {
  groupId: string;
  groupRank: number; // 1-4 within the group
}

export type TiebreakerOrder = 'head-to-head-first' | 'point-diff-first';

export interface PlayoffSettings {
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
}

// Scheduling settings for time planning
export interface SchedulingSettings {
  startTime: string; // Format: "HH:MM" (e.g., "09:00")
  endTime: string; // Format: "HH:MM" (e.g., "17:00") - for warning if exceeded
  minutesPer21PointSet: number; // Default: 20
  minutesPer15PointSet: number; // Default: 12
  minutesBetweenMatches: number; // Default: 5
  minutesBetweenPhases: number; // Default: 0
}

export interface Tournament {
  id: string;
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number; // For Best of 3, defaults to 15
  tiebreakerOrder: TiebreakerOrder; // Tiebreaker priority
  numberOfRounds?: number; // For Swiss system
  scheduling?: SchedulingSettings; // Time scheduling settings
  teams: Team[];
  matches: Match[];
  standings: StandingEntry[];
  currentRound?: number; // For Swiss system
  status: 'configuration' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  // Phase/Container support
  containerId?: string; // Reference to parent TournamentContainer
  phaseOrder?: number; // Order within container (1, 2, 3...)
  phaseName?: string; // Display name for this phase (e.g., "Vorrunde", "Finale")
  parentPhaseId?: string; // ID of the phase from which teams were seeded
  // Group phase specific
  groupPhaseConfig?: GroupPhaseConfig; // Configuration for group phase
  groupStandings?: GroupStandingEntry[]; // Standings per group
  // Knockout phase specific
  knockoutConfig?: KnockoutConfig; // Configuration for knockout phase
  knockoutSettings?: KnockoutSettings; // Pre-configured settings for knockout phase (SSVB)
  // Eliminated teams (for referee assignment)
  eliminatedTeamIds?: string[]; // Teams that have been eliminated
}

// TournamentContainer: Groups multiple tournament phases together
export interface TournamentContainer {
  id: string;
  name: string;
  phases: TournamentPhaseRef[];
  currentPhaseIndex: number; // Index of the currently active phase
  status: 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentPhaseRef {
  tournamentId: string;
  order: number;
  name: string; // Display name (e.g., "Vorrunde", "Finale")
}

export interface TournamentConfig {
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number; // For Best of 3, defaults to 15
  tiebreakerOrder: TiebreakerOrder; // Tiebreaker priority
  numberOfRounds?: number; // For Swiss system
  scheduling?: SchedulingSettings; // Time scheduling settings
  teams: Omit<Team, 'id'>[];
  // Group phase specific
  groupPhaseConfig?: Omit<GroupPhaseConfig, 'groups'>; // Groups will be generated
  // Knockout phase specific
  knockoutConfig?: KnockoutConfig;
  knockoutSettings?: KnockoutSettings; // Pre-configured settings for knockout phase (SSVB)
}

// Settings for creating knockout phase from group phase
export interface KnockoutSettings {
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
  playThirdPlaceMatch: boolean;
  useReferees: boolean;
}
