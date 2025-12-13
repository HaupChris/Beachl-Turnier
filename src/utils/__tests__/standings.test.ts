import { describe, it, expect } from 'vitest';
import { calculateStandings } from '../standings';
import { createTeams } from '../../__tests__/utils/testHelpers';
import type { Match, StandingEntry } from '../../types/tournament';

describe('calculateStandings', () => {
  describe('basic ranking', () => {
    it('ranks teams by wins in 1-set format', () => {
      const teams = createTeams(4);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 15 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
        {
          id: '2',
          round: 1,
          matchNumber: 2,
          teamAId: teams[2].id,
          teamBId: teams[3].id,
          courtNumber: 2,
          scores: [{ teamA: 21, teamB: 18 }],
          winnerId: teams[2].id,
          status: 'completed',
        },
        {
          id: '3',
          round: 2,
          matchNumber: 3,
          teamAId: teams[0].id,
          teamBId: teams[2].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 19 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      // Team 0: 2 wins
      // Team 2: 1 win
      // Team 1: 0 wins
      // Team 3: 0 wins
      expect(standings[0].teamId).toBe(teams[0].id);
      expect(standings[0].won).toBe(2);

      expect(standings[1].teamId).toBe(teams[2].id);
      expect(standings[1].won).toBe(1);
    });

    it('ranks teams by sets won in 2-set format', () => {
      const teams = createTeams(3);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 15 }, { teamA: 21, teamB: 18 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
        {
          id: '2',
          round: 1,
          matchNumber: 2,
          teamAId: teams[0].id,
          teamBId: teams[2].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 19 }, { teamA: 19, teamB: 21 }],
          winnerId: null, // Draw in 2-set format
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 2,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      // Team 0: 3 sets won (2 + 1)
      // Team 1: 0 sets won
      // Team 2: 1 set won
      expect(standings[0].teamId).toBe(teams[0].id);
      expect(standings[0].setsWon).toBe(3);
    });
  });

  describe('tiebreakers', () => {
    it('applies head-to-head first when configured', () => {
      const teams = createTeams(3);
      // All teams have 1 win each (circular)
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 15 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
        {
          id: '2',
          round: 1,
          matchNumber: 2,
          teamAId: teams[1].id,
          teamBId: teams[2].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 18 }],
          winnerId: teams[1].id,
          status: 'completed',
        },
        {
          id: '3',
          round: 2,
          matchNumber: 3,
          teamAId: teams[2].id,
          teamBId: teams[0].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 19 }],
          winnerId: teams[2].id,
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      // All have 1 win, so head-to-head or point diff applies
      expect(standings).toHaveLength(3);
      // All teams should have 1 win
      expect(standings.every(s => s.won === 1)).toBe(true);
    });

    it('applies point-diff first when configured', () => {
      const teams = createTeams(2);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 10 }], // Big point difference
          winnerId: teams[0].id,
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'point-diff-first',
        system: 'round-robin',
      });

      expect(standings[0].teamId).toBe(teams[0].id);
      expect(standings[0].pointsWon - standings[0].pointsLost).toBe(11);
    });
  });

  describe('statistics calculation', () => {
    it('calculates correct played count', () => {
      const teams = createTeams(4);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 15 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
        {
          id: '2',
          round: 1,
          matchNumber: 2,
          teamAId: teams[0].id,
          teamBId: teams[2].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 18 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
        {
          id: '3',
          round: 2,
          matchNumber: 3,
          teamAId: teams[0].id,
          teamBId: teams[3].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 12 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      const team0Standing = standings.find(s => s.teamId === teams[0].id);
      expect(team0Standing?.played).toBe(3);
      expect(team0Standing?.won).toBe(3);
      expect(team0Standing?.lost).toBe(0);
    });

    it('calculates correct points for all teams', () => {
      const teams = createTeams(2);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [{ teamA: 21, teamB: 15 }],
          winnerId: teams[0].id,
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      const team0 = standings.find(s => s.teamId === teams[0].id);
      const team1 = standings.find(s => s.teamId === teams[1].id);

      expect(team0?.pointsWon).toBe(21);
      expect(team0?.pointsLost).toBe(15);
      expect(team1?.pointsWon).toBe(15);
      expect(team1?.pointsLost).toBe(21);
    });
  });

  describe('incomplete matches', () => {
    it('ignores scheduled matches', () => {
      const teams = createTeams(2);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [],
          winnerId: null,
          status: 'scheduled',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      expect(standings[0].played).toBe(0);
      expect(standings[1].played).toBe(0);
    });

    it('ignores pending matches', () => {
      const teams = createTeams(2);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [],
          winnerId: null,
          status: 'pending',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      expect(standings[0].played).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles no matches', () => {
      const teams = createTeams(4);
      const matches: Match[] = [];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      expect(standings).toHaveLength(4);
      expect(standings.every(s => s.played === 0)).toBe(true);
    });

    it('handles single team', () => {
      const teams = createTeams(1);
      const matches: Match[] = [];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 1,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      expect(standings).toHaveLength(1);
    });

    it('handles best-of-3 set format', () => {
      const teams = createTeams(2);
      const matches: Match[] = [
        {
          id: '1',
          round: 1,
          matchNumber: 1,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          courtNumber: 1,
          scores: [
            { teamA: 21, teamB: 15 },
            { teamA: 18, teamB: 21 },
            { teamA: 15, teamB: 10 },
          ],
          winnerId: teams[0].id,
          status: 'completed',
        },
      ];

      const standings = calculateStandings(teams, matches, {
        setsPerMatch: 3,
        tiebreakerOrder: 'head-to-head-first',
        system: 'round-robin',
      });

      const team0 = standings.find(s => s.teamId === teams[0].id);
      const team1 = standings.find(s => s.teamId === teams[1].id);

      expect(team0?.setsWon).toBe(2);
      expect(team0?.setsLost).toBe(1);
      expect(team1?.setsWon).toBe(1);
      expect(team1?.setsLost).toBe(2);
    });
  });
});
