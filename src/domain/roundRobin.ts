import { v4 as uuidv4 } from 'uuid';
import type { Team, Match } from '../types/tournament';
import { RoundRobinGenerator } from './generators/RoundRobinGenerator';

/**
 * Generate round-robin matches using the new domain generator.
 *
 * This function maintains backward compatibility with the existing API
 * while using the new RoundRobinGenerator internally.
 */
export function generateRoundRobinMatches(teams: Team[], numberOfCourts: number): Match[] {
  if (teams.length < 2) {
    return [];
  }

  // Use new domain generator
  const generator = new RoundRobinGenerator();
  const result = generator.generate(
    teams.map(t => ({ id: t.id, seedPosition: t.seedPosition })),
    { courts: numberOfCourts }
  );

  // Convert domain matches to legacy Match format
  return result.matches.map(m => ({
    id: uuidv4(),
    round: m.round,
    matchNumber: m.matchNumber,
    teamAId: m.teamAId!,
    teamBId: m.teamBId!,
    courtNumber: m.courtNumber,
    scores: [],
    winnerId: null,
    status: 'scheduled' as const,
  }));
}
