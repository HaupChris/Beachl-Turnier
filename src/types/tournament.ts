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

export interface TournamentPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  numberOfRounds?: number; // For Swiss system
  teams: Team[];
  matches: Match[];
  standings: StandingEntry[];
  photos: TournamentPhoto[];
  currentRound?: number; // For Swiss system
  status: 'configuration' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentConfig {
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  numberOfRounds?: number; // For Swiss system
  teams: Omit<Team, 'id'>[];
}
