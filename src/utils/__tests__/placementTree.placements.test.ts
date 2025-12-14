import { describe, it, expect } from 'vitest';
import { calculatePlacementTreePlacements } from '../placementTree';
import { createTeams } from '../../__tests__/utils/testHelpers';
import type { Match } from '../../types/tournament';

describe('calculatePlacementTreePlacements', () => {
  it('returns unique placements for completed finals', () => {
    const teams = createTeams(4);
    const matches: Match[] = [
      {
        id: '1', round: 1, matchNumber: 1, teamAId: teams[0].id, teamBId: teams[3].id, courtNumber: 1,
        scores: [{ teamA: 21, teamB: 15 }], winnerId: teams[0].id, status: 'completed',
        knockoutRound: 'placement-round-1', placementInterval: { start: 1, end: 4 },
        winnerInterval: { start: 1, end: 2 }, loserInterval: { start: 3, end: 4 },
      },
      {
        id: '2', round: 1, matchNumber: 2, teamAId: teams[1].id, teamBId: teams[2].id, courtNumber: 2,
        scores: [{ teamA: 21, teamB: 18 }], winnerId: teams[1].id, status: 'completed',
        knockoutRound: 'placement-round-1', placementInterval: { start: 1, end: 4 },
        winnerInterval: { start: 1, end: 2 }, loserInterval: { start: 3, end: 4 },
      },
      {
        id: '3', round: 2, matchNumber: 3, teamAId: teams[0].id, teamBId: teams[1].id, courtNumber: 1,
        scores: [{ teamA: 21, teamB: 19 }], winnerId: teams[0].id, status: 'completed',
        knockoutRound: 'placement-final', placementInterval: { start: 1, end: 2 }, playoffForPlace: 1,
      },
      {
        id: '4', round: 2, matchNumber: 4, teamAId: teams[3].id, teamBId: teams[2].id, courtNumber: 2,
        scores: [{ teamA: 21, teamB: 15 }], winnerId: teams[3].id, status: 'completed',
        knockoutRound: 'placement-final', placementInterval: { start: 3, end: 4 }, playoffForPlace: 3,
      },
    ];

    const placements = calculatePlacementTreePlacements(matches, teams);
    expect(placements).toHaveLength(4);

    expect(placements.find(p => p.placement === '1.')?.teamId).toBe(teams[0].id);
    expect(placements.find(p => p.placement === '2.')?.teamId).toBe(teams[1].id);
    expect(placements.find(p => p.placement === '3.')?.teamId).toBe(teams[3].id);
    expect(placements.find(p => p.placement === '4.')?.teamId).toBe(teams[2].id);
  });
});
