/**
 * Type definitions for shortened main round tournament
 */

export interface TeamSeed {
  teamId: string;
  groupId: string;
  groupRank: number;
  category: 'A' | 'B' | 'C'; // A=winner, B=2nd/3rd, C=4th
}

export interface SeedMapping {
  A: TeamSeed[];
  B: TeamSeed[];
  C: TeamSeed[];
}
