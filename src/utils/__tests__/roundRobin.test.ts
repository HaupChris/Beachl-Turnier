import { describe, it, expect } from 'vitest';
import { generateRoundRobinMatches } from '../roundRobin';
import {
  createTeams,
  expectedRoundRobinMatchCount,
  verifyNoSelfMatches,
  verifyNoDuplicateMatchups,
  verifyAllTeamsParticipate,
  verifyCourtNumbers,
} from '../../__tests__/utils/testHelpers';

describe('generateRoundRobinMatches', () => {
  describe('match count', () => {
    it('generates correct match count for 4 teams', () => {
      const teams = createTeams(4);
      const matches = generateRoundRobinMatches(teams, 2);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(4)); // 6
    });

    it('generates correct match count for 6 teams', () => {
      const teams = createTeams(6);
      const matches = generateRoundRobinMatches(teams, 3);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(6)); // 15
    });

    it('generates correct match count for 8 teams', () => {
      const teams = createTeams(8);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(8)); // 28
    });

    it('generates correct match count for 10 teams', () => {
      const teams = createTeams(10);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(10)); // 45
    });

    it('generates correct match count for 12 teams', () => {
      const teams = createTeams(12);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(12)); // 66
    });
  });

  describe('odd team count (bye handling)', () => {
    it('handles 5 teams correctly with bye', () => {
      const teams = createTeams(5);
      const matches = generateRoundRobinMatches(teams, 2);
      // With 5 teams + 1 bye = 6 "teams", we get (6*5)/2 = 15 total pairings
      // But matches with 'bye' are skipped, so we get 5*4/2 = 10 actual matches
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(5)); // 10
    });

    it('handles 7 teams correctly with bye', () => {
      const teams = createTeams(7);
      const matches = generateRoundRobinMatches(teams, 3);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(7)); // 21
    });

    it('handles 9 teams correctly with bye', () => {
      const teams = createTeams(9);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(9)); // 36
    });

    it('handles 11 teams correctly with bye (edge case: 12 planned, 1 dropout)', () => {
      const teams = createTeams(11);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(11)); // 55
    });

    it('handles 15 teams correctly with bye (edge case: 16 planned, 1 dropout)', () => {
      const teams = createTeams(15);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(15)); // 105
    });
  });

  describe('match integrity', () => {
    it('no team plays against itself', () => {
      const teams = createTeams(8);
      const matches = generateRoundRobinMatches(teams, 4);
      const result = verifyNoSelfMatches(matches);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('no duplicate matchups', () => {
      const teams = createTeams(8);
      const matches = generateRoundRobinMatches(teams, 4);
      const result = verifyNoDuplicateMatchups(matches);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('all teams participate in matches', () => {
      const teams = createTeams(8);
      const matches = generateRoundRobinMatches(teams, 4);
      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('all teams participate even with odd count', () => {
      const teams = createTeams(7);
      const matches = generateRoundRobinMatches(teams, 3);
      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('court assignment', () => {
    it('assigns courts within valid range', () => {
      const teams = createTeams(8);
      const numberOfCourts = 4;
      const matches = generateRoundRobinMatches(teams, numberOfCourts);
      const result = verifyCourtNumbers(matches, numberOfCourts);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('cycles through available courts', () => {
      const teams = createTeams(4);
      const numberOfCourts = 2;
      const matches = generateRoundRobinMatches(teams, numberOfCourts);

      // Check that courts are assigned in a cycling pattern
      const courtNumbers = matches.map(m => m.courtNumber);
      expect(courtNumbers.filter(c => c === 1)).toHaveLength(3);
      expect(courtNumbers.filter(c => c === 2)).toHaveLength(3);
    });

    it('handles single court correctly', () => {
      const teams = createTeams(4);
      const numberOfCourts = 1;
      const matches = generateRoundRobinMatches(teams, numberOfCourts);

      // First match per round gets court 1, rest get null (sequential play)
      const court1Matches = matches.filter(m => m.courtNumber === 1);
      const nullCourtMatches = matches.filter(m => m.courtNumber === null);

      // With 1 court, only first match per "cycle" gets court 1
      expect(court1Matches.length).toBeGreaterThan(0);
      expect(court1Matches.length + nullCourtMatches.length).toBe(matches.length);
    });

    it('handles more courts than matches in round', () => {
      const teams = createTeams(4);
      const numberOfCourts = 8; // More courts than needed
      const matches = generateRoundRobinMatches(teams, numberOfCourts);

      // Courts should still be assigned (1, 2, 3, ...)
      const result = verifyCourtNumbers(matches, numberOfCourts);
      expect(result.valid).toBe(true);
    });
  });

  describe('match properties', () => {
    it('all matches have scheduled status', () => {
      const teams = createTeams(6);
      const matches = generateRoundRobinMatches(teams, 3);
      expect(matches.every(m => m.status === 'scheduled')).toBe(true);
    });

    it('all matches have empty scores', () => {
      const teams = createTeams(6);
      const matches = generateRoundRobinMatches(teams, 3);
      expect(matches.every(m => m.scores.length === 0)).toBe(true);
    });

    it('all matches have null winnerId', () => {
      const teams = createTeams(6);
      const matches = generateRoundRobinMatches(teams, 3);
      expect(matches.every(m => m.winnerId === null)).toBe(true);
    });

    it('match numbers are sequential', () => {
      const teams = createTeams(6);
      const matches = generateRoundRobinMatches(teams, 3);
      const matchNumbers = matches.map(m => m.matchNumber);
      expect(matchNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    });

    it('each match has unique ID', () => {
      const teams = createTeams(8);
      const matches = generateRoundRobinMatches(teams, 4);
      const ids = matches.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('round distribution', () => {
    it('distributes matches across rounds', () => {
      const teams = createTeams(4);
      const matches = generateRoundRobinMatches(teams, 2);

      // 4 teams should have 3 rounds
      const rounds = new Set(matches.map(m => m.round));
      expect(rounds.size).toBe(3);
    });

    it('each team plays once per round (even teams)', () => {
      const teams = createTeams(4);
      const matches = generateRoundRobinMatches(teams, 2);

      // Group matches by round
      const byRound = new Map<number, typeof matches>();
      for (const match of matches) {
        if (!byRound.has(match.round)) byRound.set(match.round, []);
        byRound.get(match.round)!.push(match);
      }

      // In each round, each team should appear exactly once
      for (const [, roundMatches] of byRound) {
        const teamCounts = new Map<string, number>();
        for (const match of roundMatches) {
          if (match.teamAId) teamCounts.set(match.teamAId, (teamCounts.get(match.teamAId) || 0) + 1);
          if (match.teamBId) teamCounts.set(match.teamBId, (teamCounts.get(match.teamBId) || 0) + 1);
        }
        // Each team appears exactly once per round
        for (const count of teamCounts.values()) {
          expect(count).toBe(1);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('handles minimum team count (2 teams)', () => {
      const teams = createTeams(2);
      const matches = generateRoundRobinMatches(teams, 1);
      expect(matches).toHaveLength(1);
      expect(matches[0].teamAId).toBe(teams[0].id);
      expect(matches[0].teamBId).toBe(teams[1].id);
    });

    it('handles 3 teams (smallest odd)', () => {
      const teams = createTeams(3);
      const matches = generateRoundRobinMatches(teams, 2);
      expect(matches).toHaveLength(3); // 3*2/2 = 3

      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
    });

    it('handles larger tournament (16 teams)', () => {
      const teams = createTeams(16);
      const matches = generateRoundRobinMatches(teams, 4);
      expect(matches).toHaveLength(expectedRoundRobinMatchCount(16)); // 120

      const noSelfMatches = verifyNoSelfMatches(matches);
      const noDuplicates = verifyNoDuplicateMatchups(matches);
      const allParticipate = verifyAllTeamsParticipate(matches, teams);

      expect(noSelfMatches.valid).toBe(true);
      expect(noDuplicates.valid).toBe(true);
      expect(allParticipate.valid).toBe(true);
    });
  });
});
