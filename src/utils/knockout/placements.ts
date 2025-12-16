import type { Match, Team, KnockoutRoundType } from '../../types/tournament';

/**
 * Gets the knockout round label in German
 */
export function getKnockoutRoundLabel(round: KnockoutRoundType): string {
  switch (round) {
    case 'intermediate':
      return 'Zwischenrunde';
    case 'quarterfinal':
      return 'Viertelfinale';
    case 'semifinal':
      return 'Halbfinale';
    case 'third-place':
      return 'Spiel um Platz 3';
    case 'final':
      return 'Finale';
    default:
      return 'K.O.-Runde';
  }
}

/**
 * Calculates final placements for knockout phase
 */
export function calculateKnockoutPlacements(
  matches: Match[],
  _teams: Team[],
  eliminatedTeamIds: string[]
): { teamId: string; placement: string }[] {
  const placements: { teamId: string; placement: string }[] = [];

  // Find final match
  const finalMatch = matches.find(m => m.knockoutRound === 'final');
  const thirdPlaceMatch = matches.find(m => m.knockoutRound === 'third-place');
  const quarterfinalMatches = matches.filter(m => m.knockoutRound === 'quarterfinal');
  const intermediateMatches = matches.filter(m => m.knockoutRound === 'intermediate');

  // 1st & 2nd place
  if (finalMatch?.status === 'completed' && finalMatch.winnerId) {
    placements.push({ teamId: finalMatch.winnerId, placement: '1.' });
    const loserId = finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId;
    if (loserId) placements.push({ teamId: loserId, placement: '2.' });
  }

  // 3rd & 4th place
  if (thirdPlaceMatch?.status === 'completed' && thirdPlaceMatch.winnerId) {
    placements.push({ teamId: thirdPlaceMatch.winnerId, placement: '3.' });
    const loserId = thirdPlaceMatch.teamAId === thirdPlaceMatch.winnerId
      ? thirdPlaceMatch.teamBId
      : thirdPlaceMatch.teamAId;
    if (loserId) placements.push({ teamId: loserId, placement: '4.' });
  }

  // 5th-8th place (quarterfinal losers)
  const qfLosers = quarterfinalMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  if (qfLosers.length > 0) {
    qfLosers.forEach(id => {
      placements.push({ teamId: id, placement: '5.-8.' });
    });
  }

  // 9th-12th place (intermediate round losers)
  const intermediateLosers = intermediateMatches
    .filter(m => m.status === 'completed' && m.winnerId)
    .map(m => m.teamAId === m.winnerId ? m.teamBId : m.teamAId)
    .filter((id): id is string => id !== null);

  if (intermediateLosers.length > 0) {
    intermediateLosers.forEach(id => {
      placements.push({ teamId: id, placement: '9.-12.' });
    });
  }

  // 13th-16th place (group phase eliminated - 4th place in groups)
  eliminatedTeamIds.forEach(id => {
    placements.push({ teamId: id, placement: '13.-16.' });
  });

  return placements;
}

/**
 * Returns the total number of matches in SSVB knockout format
 */
export function getSSVBKnockoutMatchCount(playThirdPlaceMatch: boolean): number {
  // 4 intermediate + 4 quarterfinal + 2 semifinal + final + optional 3rd place
  return playThirdPlaceMatch ? 12 : 11;
}
