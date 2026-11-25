import type { Match, Team } from '../../types/tournament';

export interface KnockoutBracket {
  matches: Match[];
  teams: Team[];
  eliminatedTeamIds: string[];
}
