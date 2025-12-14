import { describe, it, expect } from 'vitest';
import { calculateKnockoutPlacements } from '../knockout';
import { createTeams } from '../../__tests__/utils/testHelpers';
import type { Match } from '../../types/tournament';

describe('calculateKnockoutPlacements', () => {
  it('returns placements for completed matches', () => {
    const teams = createTeams(4);
    const matches: Match[] = [
      {
        id: '1', round: 1, matchNumber: 1, teamAId: teams[0].id, teamBId: teams[1].id, courtNumber: 1,
        scores: [{ teamA: 21, teamB: 15 }], winnerId: teams[0].id, status: 'completed', knockoutRound: 'semifinal',
      },
      {
        id: '2', round: 1, matchNumber: 2, teamAId: teams[2].id, teamBId: teams[3].id, courtNumber: 2,
        scores: [{ teamA: 21, teamB: 18 }], winnerId: teams[2].id, status: 'completed', knockoutRound: 'semifinal',
      },
      {
        id: '3', round: 2, matchNumber: 3, teamAId: teams[0].id, teamBId: teams[2].id, courtNumber: 1,
        scores: [{ teamA: 21, teamB: 19 }], winnerId: teams[0].id, status: 'completed', knockoutRound: 'final',
      },
      {
        id: '4', round: 2, matchNumber: 4, teamAId: teams[1].id, teamBId: teams[3].id, courtNumber: 2,
        scores: [{ teamA: 21, teamB: 15 }], winnerId: teams[1].id, status: 'completed', knockoutRound: 'third-place',
      },
    ];

    const placements = calculateKnockoutPlacements(matches, teams, []);

    expect(placements.find(p => p.placement === '1.')?.teamId).toBe(teams[0].id);
    expect(placements.find(p => p.placement === '2.')?.teamId).toBe(teams[2].id);
    expect(placements.find(p => p.placement === '3.')?.teamId).toBe(teams[1].id);
    expect(placements.find(p => p.placement === '4.')?.teamId).toBe(teams[3].id);
  });
});
