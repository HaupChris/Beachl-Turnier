import { describe, it, expect } from 'vitest';
import { handleByeMatches } from '../byeHandler';
import type { Match } from '../../../types/tournament';

describe('handleByeMatches', () => {
  it('auto-advances team when opponent is missing (bye on team A)', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        round: 1,
        matchNumber: 1,
        teamAId: null, // Bye - no team
        teamBId: 'team-b',
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      },
    ];

    const result = handleByeMatches(matches);

    expect(result[0].winnerId).toBe('team-b');
    expect(result[0].status).toBe('completed');
  });

  it('auto-advances team when opponent is missing (bye on team B)', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: null, // Bye - no team
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      },
    ];

    const result = handleByeMatches(matches);

    expect(result[0].winnerId).toBe('team-a');
    expect(result[0].status).toBe('completed');
  });

  it('propagates winner to dependent matches', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: null, // Bye
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      },
      {
        id: 'match-2',
        round: 2,
        matchNumber: 2,
        teamAId: null,
        teamBId: 'team-c',
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'pending',
        dependsOn: {
          teamA: { matchId: 'match-1', result: 'winner' },
        },
      },
    ];

    const result = handleByeMatches(matches);

    // Match 1: team-a advances
    expect(result[0].winnerId).toBe('team-a');
    expect(result[0].status).toBe('completed');

    // Match 2: team-a propagated to teamA slot
    expect(result[1].teamAId).toBe('team-a');
  });

  it('handles cascading byes', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        round: 1,
        matchNumber: 1,
        teamAId: null, // Bye
        teamBId: null, // Also bye - both missing
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      },
      {
        id: 'match-2',
        round: 1,
        matchNumber: 2,
        teamAId: 'team-a',
        teamBId: null, // Bye
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      },
      {
        id: 'match-3',
        round: 2,
        matchNumber: 3,
        teamAId: null,
        teamBId: null,
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'pending',
        dependsOn: {
          teamA: { matchId: 'match-1', result: 'winner' },
          teamB: { matchId: 'match-2', result: 'winner' },
        },
      },
    ];

    const result = handleByeMatches(matches);

    // Match 1: No winner (both are byes)
    expect(result[0].winnerId).toBeNull();

    // Match 2: team-a advances
    expect(result[1].winnerId).toBe('team-a');
    expect(result[1].status).toBe('completed');

    // Match 3: team-a propagated to teamB, teamA still null (from double-bye match)
    expect(result[2].teamBId).toBe('team-a');
  });

  it('does not affect matches with dependencies for missing team', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: 'team-b',
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'scheduled',
      },
      {
        id: 'match-2',
        round: 2,
        matchNumber: 2,
        teamAId: null, // Will be filled by dependency
        teamBId: 'team-c',
        courtNumber: 1,
        scores: [],
        winnerId: null,
        status: 'pending',
        dependsOn: {
          teamA: { matchId: 'match-1', result: 'winner' },
        },
      },
    ];

    const result = handleByeMatches(matches);

    // Match 2 should not auto-complete because teamA depends on match-1
    expect(result[1].winnerId).toBeNull();
    expect(result[1].status).toBe('pending');
  });

  it('leaves completed matches unchanged', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: 'team-b',
        courtNumber: 1,
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: 'team-a',
        status: 'completed',
      },
    ];

    const result = handleByeMatches(matches);

    expect(result[0]).toEqual(matches[0]);
  });
});
