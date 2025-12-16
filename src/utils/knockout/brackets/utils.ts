/**
 * Get group letter from index (0 -> A, 1 -> B, etc.)
 */
export function getGroupLetter(index: number): string {
  return String.fromCharCode(65 + index); // 65 = 'A'
}

/**
 * Get rank suffix in German (1. Platz, 2. Platz, etc.)
 */
export function getRankLabel(rank: number): string {
  return `${rank}. Platz`;
}
