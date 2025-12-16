import type { Match, Team, KnockoutRoundType } from '../../types/tournament';

/**
 * Calculates final placements for placement tree
 */
export function calculatePlacementTreePlacements(
  matches: Match[],
  _teams: Team[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  const finalMatches = matches.filter(m =>
    m.knockoutRound === 'placement-final' || m.playoffForPlace !== undefined
  );

  finalMatches.forEach(match => {
    if (match.status !== 'completed' || !match.winnerId) return;

    const place = match.playoffForPlace || match.placementInterval?.start;
    if (place === undefined) return;

    placements.push({ teamId: match.winnerId, placement: `${place}.` });

    const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
    if (loserId) {
      placements.push({ teamId: loserId, placement: `${place + 1}.` });
    }
  });

  return placements.sort((a, b) => parseInt(a.placement) - parseInt(b.placement));
}

/**
 * Gets the placement round label in German
 */
export function getPlacementRoundLabel(
  round: KnockoutRoundType,
  interval?: { start: number; end: number }
): string {
  if (round === 'placement-final' && interval) {
    return `Spiel um Platz ${interval.start}`;
  }

  switch (round) {
    case 'placement-round-1':
      return 'Platzierungsrunde 1';
    case 'placement-round-2':
      return 'Platzierungsrunde 2';
    case 'placement-round-3':
      return 'Platzierungsrunde 3';
    case 'placement-round-4':
      return 'Platzierungsrunde 4';
    case 'placement-final':
      return 'Platzierungsfinale';
    default:
      return 'Platzierungsrunde';
  }
}

/**
 * Returns the total number of matches in placement tree format
 * For N teams: N-1 matches
 */
export function getPlacementTreeMatchCount(numTeams: number): number {
  return numTeams - 1;
}
