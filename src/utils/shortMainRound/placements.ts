import type { Match, Team, KnockoutRoundType } from '../../types/tournament';

/**
 * Calculates final placements for shortened main round
 */
export function calculateShortMainRoundPlacements(
  matches: Match[],
  _teams: Team[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  // Find all matches with playoffForPlace
  const placementMatches = matches.filter(m => m.playoffForPlace !== undefined);

  placementMatches.forEach(match => {
    if (match.status !== 'completed' || !match.winnerId) return;

    const place = match.playoffForPlace!;
    placements.push({ teamId: match.winnerId, placement: `${place}.` });

    const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
    if (loserId) {
      placements.push({ teamId: loserId, placement: `${place + 1}.` });
    }
  });

  return placements.sort((a, b) => parseInt(a.placement) - parseInt(b.placement));
}

/**
 * Gets the knockout round label in German for shortened main round
 */
export function getShortMainRoundLabel(round: KnockoutRoundType, interval?: { start: number; end: number }): string {
  switch (round) {
    case 'qualification':
      return 'Qualifikation';
    case 'top-quarterfinal':
      return 'Viertelfinale';
    case 'top-semifinal':
      return 'Halbfinale';
    case 'top-final':
      return 'Finale';
    case 'third-place':
      return 'Spiel um Platz 3';
    case 'placement-5-8':
      if (interval) {
        if (interval.start === 5 && interval.end === 6) return 'Spiel um Platz 5';
        if (interval.start === 7 && interval.end === 8) return 'Spiel um Platz 7';
      }
      return 'Platzierung 5-8';
    case 'placement-9-12':
      if (interval) {
        if (interval.start === 9 && interval.end === 10) return 'Spiel um Platz 9';
        if (interval.start === 11 && interval.end === 12) return 'Spiel um Platz 11';
      }
      return 'Platzierung 9-12';
    case 'placement-13-16':
      if (interval) {
        if (interval.start === 13 && interval.end === 14) return 'Spiel um Platz 13';
        if (interval.start === 15 && interval.end === 16) return 'Spiel um Platz 15';
      }
      return 'Platzierung 13-16';
    default:
      return 'Hauptrunde';
  }
}

/**
 * Returns the total number of matches for shortened main round (16 teams)
 */
export function getShortMainRoundMatchCount(): number {
  // Quali: 4 + Bottom Semis: 2 + QF: 4 + 9-12 Semis: 2 + 13/15 Finals: 2 +
  // SF: 2 + 5-8 Semis: 2 + 9/11 Finals: 2 + Final: 1 + 3rd: 1 + 5/7 Finals: 2 = 24
  return 24;
}
