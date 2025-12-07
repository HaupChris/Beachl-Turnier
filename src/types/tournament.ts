export type TournamentSystem = 'round-robin' | 'swiss' | 'pool-play-single-out' | 'playoff';

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

export type TiebreakerOrder = 'head-to-head-first' | 'point-diff-first';

export interface PlayoffSettings {
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
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
  teams: Omit<Team, 'id'>[];
}
