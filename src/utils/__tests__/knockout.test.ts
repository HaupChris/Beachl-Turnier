import { describe, it, expect } from 'vitest';
import {
  generateKnockoutTournamentPlaceholder,
  updateKnockoutBracket,
  calculateKnockoutPlacements,
  populateKnockoutTeams,
  getSSVBKnockoutMatchCount,
} from '../knockout';
import {
  generateSnakeDraftGroups,
  generateGroupPhaseMatches,
} from '../groupPhase';
import {
  createTeams,
  verifyDependencies,
} from '../../__tests__/utils/testHelpers';
import type { GroupPhaseConfig, Match, KnockoutSettings, Tournament } from '../../types/tournament';
import { v4 as uuidv4 } from 'uuid';

// Helper to create a parent tournament with completed group phase
function createParentTournament(teamCount: number, groupCount: number): Tournament {
  const teams = createTeams(teamCount);
  const groups = generateSnakeDraftGroups(teams, groupCount);
  const config: GroupPhaseConfig = {
    numberOfGroups: groupCount,
    teamsPerGroup: Math.ceil(teamCount / groupCount),
    seeding: 'snake',
    groups,
  };

  // Create mock group standings
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
    system: 'group-phase',
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

describe('generateKnockoutTournamentPlaceholder', () => {
  describe('2 groups (8 teams)', () => {
    it('generates correct bracket structure', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

      // 2 groups: Semifinals + Final + 3rd place = 4 matches
      expect(tournament.matches).toHaveLength(4);
    });

    it('has valid dependencies', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('has semifinal matches', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const semifinals = tournament.matches.filter(m => m.knockoutRound === 'semifinal');
      expect(semifinals).toHaveLength(2);
    });
  });

  describe('3 groups (12 teams)', () => {
    it('generates bracket structure', () => {
      const parent = createParentTournament(12, 3);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

      // Should have matches
      expect(tournament.matches.length).toBeGreaterThanOrEqual(3);
    });

    it('has valid dependencies', () => {
      const parent = createParentTournament(12, 3);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });

  describe('4 groups (16 teams)', () => {
    it('generates correct bracket structure', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

      // 4 groups: Intermediate (4) + QF (4) + SF (2) + Final (1) + 3rd (1) = 12
      expect(tournament.matches).toHaveLength(12);
    });

    it('has intermediate round', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const intermediate = tournament.matches.filter(m => m.knockoutRound === 'intermediate');
      expect(intermediate).toHaveLength(4);
    });

    it('has quarterfinals', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const qf = tournament.matches.filter(m => m.knockoutRound === 'quarterfinal');
      expect(qf).toHaveLength(4);
    });

    it('has semifinals', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const sf = tournament.matches.filter(m => m.knockoutRound === 'semifinal');
      expect(sf).toHaveLength(2);
    });

    it('has final and 3rd place match', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const final = tournament.matches.filter(m => m.knockoutRound === 'final');
      const thirdPlace = tournament.matches.filter(m => m.knockoutRound === 'third-place');
      expect(final).toHaveLength(1);
      expect(thirdPlace).toHaveLength(1);
    });

    it('has valid dependencies', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('all matches have placeholders or team sources', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

      for (const match of tournament.matches) {
        const hasTeamA = match.teamAPlaceholder || match.teamAId || match.teamASource || match.dependsOn?.teamA;
        const hasTeamB = match.teamBPlaceholder || match.teamBId || match.teamBSource || match.dependsOn?.teamB;
        expect(hasTeamA).toBeTruthy();
        expect(hasTeamB).toBeTruthy();
      }
    });
  });

  describe('5-8 groups (20-32 teams)', () => {
    it('generates bracket for 5 groups (20 teams)', () => {
      const parent = createParentTournament(20, 5);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);

      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('generates bracket for 6 groups (24 teams)', () => {
      const parent = createParentTournament(24, 6);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);

      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('generates bracket for 8 groups (32 teams)', () => {
      const parent = createParentTournament(32, 8);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);

      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });

  describe('without 3rd place match', () => {
    it('excludes 3rd place match when playThirdPlaceMatch is false', () => {
      const parent = createParentTournament(16, 4);
      const settings: KnockoutSettings = { ...defaultSettings, playThirdPlaceMatch: false };
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, settings);
      const thirdPlace = tournament.matches.filter(m => m.knockoutRound === 'third-place');
      expect(thirdPlace).toHaveLength(0);
    });
  });

  describe('with referees', () => {
    it('includes referee placeholders when useReferees is true', () => {
      const parent = createParentTournament(16, 4);
      const settings: KnockoutSettings = { ...defaultSettings, useReferees: true };
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, settings);

      // Some matches should have referee placeholders
      const matchesWithReferee = tournament.matches.filter(m => m.refereePlaceholder);
      expect(matchesWithReferee.length).toBeGreaterThan(0);
    });
  });
});

describe('populateKnockoutTeams', () => {
  it('populates teams from group standings for 16 teams', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: knockoutPlaceholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

    const { tournament: populated, teams } = populateKnockoutTeams(
      knockoutPlaceholder,
      parent,
      parent.groupStandings!
    );

    // Should have teams now (12 teams qualify, 4 are eliminated)
    expect(teams).toHaveLength(12);

    // Intermediate matches should have teams assigned
    const intermediateMatches = populated.matches.filter(m => m.knockoutRound === 'intermediate');
    for (const match of intermediateMatches) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });

  it('group winners go directly to QF', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: knockoutPlaceholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

    const { tournament: populated } = populateKnockoutTeams(
      knockoutPlaceholder,
      parent,
      parent.groupStandings!
    );

    const qfMatches = populated.matches.filter(m => m.knockoutRound === 'quarterfinal');

    // Each QF match should have one team already assigned (group winner)
    for (const match of qfMatches) {
      const hasGroupWinner = match.teamAId !== null;
      expect(hasGroupWinner).toBe(true);
    }
  });
});

describe('updateKnockoutBracket', () => {
  it('propagates winner to dependent match', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: knockoutPlaceholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateKnockoutTeams(
      knockoutPlaceholder,
      parent,
      parent.groupStandings!
    );

    // Find first intermediate match (should have teams assigned)
    const intermediateMatch = populated.matches.find(
      m => m.knockoutRound === 'intermediate' && m.teamAId && m.teamBId
    );
    expect(intermediateMatch).toBeDefined();

    // Complete the match
    const completedMatch: Match = {
      ...intermediateMatch!,
      scores: [{ teamA: 21, teamB: 15 }],
      winnerId: intermediateMatch!.teamAId,
      status: 'completed',
    };

    // Update matches array
    const updatedMatches = populated.matches.map(m =>
      m.id === completedMatch.id ? completedMatch : m
    );

    // Apply bracket update
    const propagatedMatches = updateKnockoutBracket(updatedMatches, completedMatch.id);

    // Find QF match that depends on this intermediate match
    const dependentMatch = propagatedMatches.find(m =>
      m.knockoutRound === 'quarterfinal' &&
      m.dependsOn?.teamB?.matchId === completedMatch.id
    );

    expect(dependentMatch).toBeDefined();
    expect(dependentMatch?.teamBId).toBe(completedMatch.winnerId);
  });

  it('changes match status from pending to scheduled when both teams assigned', () => {
    const parent = createParentTournament(8, 2);
    const { tournament: knockoutPlaceholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateKnockoutTeams(
      knockoutPlaceholder,
      parent,
      parent.groupStandings!
    );

    // Get semifinal matches
    const semis = populated.matches.filter(m => m.knockoutRound === 'semifinal');
    expect(semis).toHaveLength(2);

    // Complete both semifinals
    let matches = populated.matches;

    for (const semi of semis) {
      const completedMatch: Match = {
        ...matches.find(m => m.id === semi.id)!,
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: semi.teamAId,
        status: 'completed',
      };

      matches = matches.map(m => m.id === completedMatch.id ? completedMatch : m);
      matches = updateKnockoutBracket(matches, completedMatch.id);
    }

    // Final should now be scheduled
    const final = matches.find(m => m.knockoutRound === 'final');
    expect(final?.status).toBe('scheduled');
    expect(final?.teamAId).not.toBeNull();
    expect(final?.teamBId).not.toBeNull();
  });
});

describe('calculateKnockoutPlacements', () => {
  it('returns placements for completed matches', () => {
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
        knockoutRound: 'semifinal',
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
        knockoutRound: 'semifinal',
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
        knockoutRound: 'final',
      },
      {
        id: '4',
        round: 2,
        matchNumber: 4,
        teamAId: teams[1].id,
        teamBId: teams[3].id,
        courtNumber: 2,
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: teams[1].id,
        status: 'completed',
        knockoutRound: 'third-place',
      },
    ];

    const placements = calculateKnockoutPlacements(matches, teams, []);

    const first = placements.find(p => p.placement === '1.');
    const second = placements.find(p => p.placement === '2.');
    const third = placements.find(p => p.placement === '3.');
    const fourth = placements.find(p => p.placement === '4.');

    expect(first?.teamId).toBe(teams[0].id);
    expect(second?.teamId).toBe(teams[2].id);
    expect(third?.teamId).toBe(teams[1].id);
    expect(fourth?.teamId).toBe(teams[3].id);
  });
});

describe('getSSVBKnockoutMatchCount', () => {
  it('returns 12 with 3rd place match', () => {
    expect(getSSVBKnockoutMatchCount(true)).toBe(12);
  });

  it('returns 11 without 3rd place match', () => {
    expect(getSSVBKnockoutMatchCount(false)).toBe(11);
  });
});

describe('edge cases - team dropouts', () => {
  it('handles 15 teams in 4 groups (one group has 3 teams)', () => {
    const parent = createParentTournament(15, 4);

    // Verify one group has 3 teams
    const groupSizes = parent.groupPhaseConfig!.groups.map(g => g.teamIds.length);
    expect(groupSizes.filter(s => s === 3)).toHaveLength(1);

    const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

    expect(tournament.matches.length).toBeGreaterThan(0);
    const result = verifyDependencies(tournament.matches);
    expect(result.valid).toBe(true);
  });

  it('handles 11 teams in 3 groups', () => {
    const parent = createParentTournament(11, 3);

    const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

    expect(tournament.matches.length).toBeGreaterThan(0);
    const result = verifyDependencies(tournament.matches);
    expect(result.valid).toBe(true);
  });

  it('handles 9 teams in 3 groups (3 teams per group)', () => {
    const parent = createParentTournament(9, 3);

    const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

    expect(tournament.matches.length).toBeGreaterThan(0);
    const result = verifyDependencies(tournament.matches);
    expect(result.valid).toBe(true);
  });

  it('handles 7 teams in 2 groups', () => {
    const parent = createParentTournament(7, 2);

    const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);

    expect(tournament.matches.length).toBeGreaterThan(0);
    const result = verifyDependencies(tournament.matches);
    expect(result.valid).toBe(true);
  });
});
