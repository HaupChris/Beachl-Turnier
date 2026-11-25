import type { GroupStandingEntry, Group } from '../../types/tournament';

/**
 * Creates the seed order from group standings
 * Priority: Group rank first, then within same rank by group order
 */
export function createSeedOrder(
  groupStandings: GroupStandingEntry[],
  groups: Group[]
): GroupStandingEntry[] {
  const maxRank = Math.max(...groupStandings.map(s => s.groupRank));
  const result: GroupStandingEntry[] = [];

  for (let rank = 1; rank <= maxRank; rank++) {
    const teamsWithRank = groupStandings
      .filter(s => s.groupRank === rank)
      .sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        const setDiffA = a.setsWon - a.setsLost;
        const setDiffB = b.setsWon - b.setsLost;
        if (setDiffA !== setDiffB) return setDiffB - setDiffA;
        const pointDiffA = a.pointsWon - a.pointsLost;
        const pointDiffB = b.pointsWon - b.pointsLost;
        if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA;
        const groupIndexA = groups.findIndex(g => g.id === a.groupId);
        const groupIndexB = groups.findIndex(g => g.id === b.groupId);
        return groupIndexA - groupIndexB;
      });
    result.push(...teamsWithRank);
  }

  return result;
}

/**
 * Get group letter from index (0 -> A, 1 -> B, etc.)
 */
export function getGroupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Get rank suffix in German (1. Platz, 2. Platz, etc.)
 */
export function getRankLabel(rank: number): string {
  return `${rank}. Platz`;
}
