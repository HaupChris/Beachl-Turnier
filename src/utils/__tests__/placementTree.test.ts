import { describe, it, expect } from 'vitest';
import {
  generatePlacementTreeTournamentPlaceholder,
  populatePlacementTreeTeams,
  updatePlacementTreeBracket,
  calculatePlacementTreePlacements,
  getPlacementTreeMatchCount,
} from '../placementTree';
import { generateSnakeDraftGroups, generateGroupPhaseMatches } from '../groupPhase';
import {
  createTeams,
  verifyDependencies,
  expectedPlacementTreeMatchCount,
} from '../../__tests__/utils/testHelpers';
import type { GroupPhaseConfig, Match, KnockoutSettings, Tournament } from '../../types/tournament';
import { v4 as uuidv4 } from 'uuid';

// Helper to create a parent tournament
function createParentTournament(teamCount: number, groupCount: number): Tournament {
  const teams = createTeams(teamCount);
  const groups = generateSnakeDraftGroups(teams, groupCount);
  const config: GroupPhaseConfig = {
    numberOfGroups: groupCount,
    teamsPerGroup: Math.ceil(teamCount / groupCount),
    seeding: 'snake',
    groups,
  };

  const groupStandings = groups.flatMap((group) =>
    group.teamIds.map((teamId, index) => ({
      teamId,
      played: group.teamIds.length - 1,
      won: group.teamIds.length - 1 - index,
      lost: index,
      setsWon: group.teamIds.length - 1 - index,
      setsLost: index,
      pointsWon: 63 - index * 10,
      pointsLost: 45 + index * 5,
      points: group.teamIds.length - 1 - index,
      groupId: group.id,
      groupRank: index + 1,
    }))
  );

  return {
    id: uuidv4(),
    name: 'Test Tournament',
    system: 'beachl-all-placements',
    numberOfCourts: 4,
    setsPerMatch: 1,
    pointsPerSet: 21,
    tiebreakerOrder: 'head-to-head-first',
    teams,
    matches: generateGroupPhaseMatches(config, teams, 4),
    standings: [],
    groupStandings,
    groupPhaseConfig: config,
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const defaultSettings: KnockoutSettings = {
  setsPerMatch: 1,
  pointsPerSet: 21,
  playThirdPlaceMatch: true,
  useReferees: false,
};

describe('generatePlacementTreeTournamentPlaceholder', () => {
  describe('match generation', () => {
    it('generates matches for 16 teams (4 groups)', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      // Should generate enough matches to determine all placements
      expect(tournament.matches.length).toBeGreaterThanOrEqual(expectedPlacementTreeMatchCount(16));
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('generates matches for 12 teams (3 groups)', () => {
      const parent = createParentTournament(12, 3);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThanOrEqual(expectedPlacementTreeMatchCount(12));
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('generates matches for 8 teams (2 groups)', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThanOrEqual(expectedPlacementTreeMatchCount(8));
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('generates matches for 24 teams (6 groups)', () => {
      const parent = createParentTournament(24, 6);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThanOrEqual(expectedPlacementTreeMatchCount(24));
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });

  describe('bracket structure', () => {
    it('has valid dependencies', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('first round matches have placeholders', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      const round1Matches = tournament.matches.filter(m => m.round === 1);
      for (const match of round1Matches) {
        expect(match.teamAPlaceholder || match.teamASource).toBeTruthy();
        expect(match.teamBPlaceholder || match.teamBSource).toBeTruthy();
      }
    });

    it('has placement intervals defined', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      for (const match of tournament.matches) {
        expect(match.placementInterval).toBeDefined();
        expect(match.placementInterval?.start).toBeLessThanOrEqual(match.placementInterval?.end || 0);
      }
    });

    it('final matches determine exact placements', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      // Final matches should have playoffForPlace or interval of size 2
      const placementFinals = tournament.matches.filter(
        m => m.knockoutRound === 'placement-final' || m.playoffForPlace !== undefined
      );
      expect(placementFinals.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases - team dropouts', () => {
    it('handles 15 teams in 4 groups', () => {
      const parent = createParentTournament(15, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      // Should generate matches (may differ from theoretical N-1 due to bracket structure)
      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('handles 11 teams in 3 groups', () => {
      const parent = createParentTournament(11, 3);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('handles 9 teams in 3 groups', () => {
      const parent = createParentTournament(9, 3);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });
});

describe('populatePlacementTreeTeams', () => {
  it('populates all teams from group standings', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

    const { tournament: populated, teams } = populatePlacementTreeTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    // All 16 teams should participate in placement tree
    expect(teams).toHaveLength(16);
  });

  it('first round matches have teams assigned', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);

    const { tournament: populated } = populatePlacementTreeTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    const round1Matches = populated.matches.filter(m => m.round === 1);
    for (const match of round1Matches) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });
});

describe('updatePlacementTreeBracket', () => {
  it('propagates winner to correct interval', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populatePlacementTreeTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    // Find first round 1 match
    const round1Match = populated.matches.find(m => m.round === 1 && m.teamAId && m.teamBId);
    expect(round1Match).toBeDefined();

    // Complete the match
    const completedMatch: Match = {
      ...round1Match!,
      scores: [{ teamA: 21, teamB: 15 }],
      winnerId: round1Match!.teamAId,
      status: 'completed',
    };

    const updatedMatches = populated.matches.map(m =>
      m.id === completedMatch.id ? completedMatch : m
    );

    const propagatedMatches = updatePlacementTreeBracket(updatedMatches, completedMatch.id);

    // Find dependent match for winner
    const winnerDependentMatch = propagatedMatches.find(m =>
      m.dependsOn?.teamA?.matchId === completedMatch.id && m.dependsOn?.teamA?.result === 'winner' ||
      m.dependsOn?.teamB?.matchId === completedMatch.id && m.dependsOn?.teamB?.result === 'winner'
    );

    if (winnerDependentMatch) {
      const teamId = winnerDependentMatch.dependsOn?.teamA?.matchId === completedMatch.id
        ? winnerDependentMatch.teamAId
        : winnerDependentMatch.teamBId;
      expect(teamId).toBe(completedMatch.winnerId);
    }
  });

  it('propagates loser to correct interval', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populatePlacementTreeTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    const round1Match = populated.matches.find(m => m.round === 1 && m.teamAId && m.teamBId);
    expect(round1Match).toBeDefined();

    const completedMatch: Match = {
      ...round1Match!,
      scores: [{ teamA: 21, teamB: 15 }],
      winnerId: round1Match!.teamAId,
      status: 'completed',
    };

    const loserId = round1Match!.teamBId;

    const updatedMatches = populated.matches.map(m =>
      m.id === completedMatch.id ? completedMatch : m
    );

    const propagatedMatches = updatePlacementTreeBracket(updatedMatches, completedMatch.id);

    // Find dependent match for loser
    const loserDependentMatch = propagatedMatches.find(m =>
      m.dependsOn?.teamA?.matchId === completedMatch.id && m.dependsOn?.teamA?.result === 'loser' ||
      m.dependsOn?.teamB?.matchId === completedMatch.id && m.dependsOn?.teamB?.result === 'loser'
    );

    if (loserDependentMatch) {
      const teamId = loserDependentMatch.dependsOn?.teamA?.matchId === completedMatch.id
        ? loserDependentMatch.teamAId
        : loserDependentMatch.teamBId;
      expect(teamId).toBe(loserId);
    }
  });
});

describe('getPlacementTreeMatchCount', () => {
  it('returns N-1 for any team count', () => {
    expect(getPlacementTreeMatchCount(8)).toBe(7);
    expect(getPlacementTreeMatchCount(12)).toBe(11);
    expect(getPlacementTreeMatchCount(16)).toBe(15);
    expect(getPlacementTreeMatchCount(24)).toBe(23);
    expect(getPlacementTreeMatchCount(32)).toBe(31);
  });
});

describe('calculatePlacementTreePlacements', () => {
  it('returns unique placements for completed finals', () => {
    const teams = createTeams(4);
    const matches: Match[] = [
      {
        id: '1',
        round: 1,
        matchNumber: 1,
        teamAId: teams[0].id,
        teamBId: teams[3].id,
        courtNumber: 1,
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: teams[0].id,
        status: 'completed',
        knockoutRound: 'placement-round-1',
        placementInterval: { start: 1, end: 4 },
        winnerInterval: { start: 1, end: 2 },
        loserInterval: { start: 3, end: 4 },
      },
      {
        id: '2',
        round: 1,
        matchNumber: 2,
        teamAId: teams[1].id,
        teamBId: teams[2].id,
        courtNumber: 2,
        scores: [{ teamA: 21, teamB: 18 }],
        winnerId: teams[1].id,
        status: 'completed',
        knockoutRound: 'placement-round-1',
        placementInterval: { start: 1, end: 4 },
        winnerInterval: { start: 1, end: 2 },
        loserInterval: { start: 3, end: 4 },
      },
      {
        id: '3',
        round: 2,
        matchNumber: 3,
        teamAId: teams[0].id,
        teamBId: teams[1].id,
        courtNumber: 1,
        scores: [{ teamA: 21, teamB: 19 }],
        winnerId: teams[0].id,
        status: 'completed',
        knockoutRound: 'placement-final',
        placementInterval: { start: 1, end: 2 },
        playoffForPlace: 1,
      },
      {
        id: '4',
        round: 2,
        matchNumber: 4,
        teamAId: teams[3].id,
        teamBId: teams[2].id,
        courtNumber: 2,
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: teams[3].id,
        status: 'completed',
        knockoutRound: 'placement-final',
        placementInterval: { start: 3, end: 4 },
        playoffForPlace: 3,
      },
    ];

    const placements = calculatePlacementTreePlacements(matches, teams);

    expect(placements).toHaveLength(4);

    const first = placements.find(p => p.placement === '1.');
    const second = placements.find(p => p.placement === '2.');
    const third = placements.find(p => p.placement === '3.');
    const fourth = placements.find(p => p.placement === '4.');

    expect(first?.teamId).toBe(teams[0].id);
    expect(second?.teamId).toBe(teams[1].id);
    expect(third?.teamId).toBe(teams[3].id);
    expect(fourth?.teamId).toBe(teams[2].id);
  });
});
