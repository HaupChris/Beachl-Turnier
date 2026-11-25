import type { Match } from '../types/tournament';

const BYE_TEAM_IDS = new Set(['BYE', 'bye']);
const BYE_PREFIX = 'BYE-';

export function isByeTeamId(teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  if (BYE_TEAM_IDS.has(teamId)) return true;
  return teamId.startsWith(BYE_PREFIX);
}

export function isByeMatch(match: Match): boolean {
  return match.isBye === true;
}

export function filterPlayableMatches(matches: Match[]): Match[] {
  return matches.filter((match) => !isByeMatch(match));
}
