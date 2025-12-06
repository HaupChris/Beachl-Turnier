export type TournamentSystem = 'round-robin' | 'swiss' | 'pool-play-single-out';

export interface Team {
  id: string;
  name: string;
  seedPosition: number;
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
  hasPlayoffRound?: boolean; // True if playoff round has been generated
  playoffSettings?: PlayoffSettings; // Settings for the playoff round
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
