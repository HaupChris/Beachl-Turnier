import { describe, it, expect } from 'vitest';
import {
  generateShortMainRoundTournamentPlaceholder,
  populateShortMainRoundTeams,
  updateShortMainRoundBracket,
  calculateShortMainRoundPlacements,
  getShortMainRoundMatchCount,
} from '../shortMainRound';
import { generateSnakeDraftGroups, generateGroupPhaseMatches } from '../groupPhase';
import {
  createTeams,
  verifyDependencies,
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
    system: 'beachl-short-main',
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

describe('generateShortMainRoundTournamentPlaceholder', () => {
  describe('4 groups (16 teams) - standard format', () => {
    it('generates 24 matches for 16 teams', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches).toHaveLength(24);
    });

    it('has valid dependencies', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('has qualification round matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const qualiMatches = tournament.matches.filter(m => m.knockoutRound === 'qualification');
      expect(qualiMatches).toHaveLength(4);
    });

    it('has quarterfinal matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const qfMatches = tournament.matches.filter(m => m.knockoutRound === 'top-quarterfinal');
      expect(qfMatches).toHaveLength(4);
    });

    it('has semifinal matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const sfMatches = tournament.matches.filter(m => m.knockoutRound === 'top-semifinal');
      expect(sfMatches).toHaveLength(2);
    });

    it('has final and 3rd place match', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const final = tournament.matches.filter(m => m.knockoutRound === 'top-final');
      const thirdPlace = tournament.matches.filter(m => m.knockoutRound === 'third-place');
      expect(final).toHaveLength(1);
      expect(thirdPlace).toHaveLength(1);
    });

    it('has 13-16 bracket matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const bracket1316 = tournament.matches.filter(m => m.knockoutRound === 'placement-13-16');
      expect(bracket1316).toHaveLength(4); // 2 semis + 2 finals
    });

    it('has 9-12 bracket matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const bracket912 = tournament.matches.filter(m => m.knockoutRound === 'placement-9-12');
      expect(bracket912).toHaveLength(4); // 2 semis + 2 finals
    });

    it('has 5-8 bracket matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      const bracket58 = tournament.matches.filter(m => m.knockoutRound === 'placement-5-8');
      expect(bracket58).toHaveLength(4); // 2 semis + 2 finals
    });
  });

  describe('2 groups (8 teams)', () => {
    it('generates bracket for 8 teams', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });

  describe('3 groups (12 teams)', () => {
    it('generates bracket for 12 teams', () => {
      const parent = createParentTournament(12, 3);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases - team dropouts', () => {
    it('handles 15 teams in 4 groups', () => {
      const parent = createParentTournament(15, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('handles 11 teams in 3 groups', () => {
      const parent = createParentTournament(11, 3);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });

    it('handles 7 teams in 2 groups', () => {
      const parent = createParentTournament(7, 2);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

      expect(tournament.matches.length).toBeGreaterThan(0);
      const result = verifyDependencies(tournament.matches);
      expect(result.valid).toBe(true);
    });
  });
});

describe('populateShortMainRoundTeams', () => {
  it('populates all teams from group standings', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

    const { teams } = populateShortMainRoundTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    // All 16 teams should participate
    expect(teams).toHaveLength(16);
  });

  it('qualification matches have teams assigned', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

    const { tournament: populated } = populateShortMainRoundTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    const qualiMatches = populated.matches.filter(m => m.knockoutRound === 'qualification');
    for (const match of qualiMatches) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });

  it('bottom bracket semis have teams assigned', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);

    const { tournament: populated } = populateShortMainRoundTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    const bottomSemis = populated.matches.filter(
      m => m.knockoutRound === 'placement-13-16' && m.round === 1
    );
    for (const match of bottomSemis) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });
});

describe('updateShortMainRoundBracket', () => {
  it('propagates winner from qualification to QF', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateShortMainRoundTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    // Find first qualification match
    const qualiMatch = populated.matches.find(
      m => m.knockoutRound === 'qualification' && m.teamAId && m.teamBId
    );
    expect(qualiMatch).toBeDefined();

    const completedMatch: Match = {
      ...qualiMatch!,
      scores: [{ teamA: 21, teamB: 15 }],
      winnerId: qualiMatch!.teamAId,
      status: 'completed',
    };

    const updatedMatches = populated.matches.map(m =>
      m.id === completedMatch.id ? completedMatch : m
    );

    const propagatedMatches = updateShortMainRoundBracket(updatedMatches, completedMatch.id);

    // Find QF match that depends on this qualification match
    const qfMatch = propagatedMatches.find(m =>
      m.knockoutRound === 'top-quarterfinal' &&
      m.dependsOn?.teamB?.matchId === completedMatch.id
    );

    if (qfMatch) {
      expect(qfMatch.teamBId).toBe(completedMatch.winnerId);
    }
  });

  it('propagates loser from qualification to 9-12 bracket', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateShortMainRoundTeams(
      placeholder,
      parent,
      parent.groupStandings!
    );

    const qualiMatch = populated.matches.find(
      m => m.knockoutRound === 'qualification' && m.teamAId && m.teamBId
    );
    expect(qualiMatch).toBeDefined();

    const loserId = qualiMatch!.teamBId;
    const completedMatch: Match = {
      ...qualiMatch!,
      scores: [{ teamA: 21, teamB: 15 }],
      winnerId: qualiMatch!.teamAId,
      status: 'completed',
    };

    const updatedMatches = populated.matches.map(m =>
      m.id === completedMatch.id ? completedMatch : m
    );

    const propagatedMatches = updateShortMainRoundBracket(updatedMatches, completedMatch.id);

    // Find 9-12 match that depends on this qualification match loser
    const bracket912Match = propagatedMatches.find(m =>
      m.knockoutRound === 'placement-9-12' &&
      (m.dependsOn?.teamA?.matchId === completedMatch.id && m.dependsOn?.teamA?.result === 'loser' ||
       m.dependsOn?.teamB?.matchId === completedMatch.id && m.dependsOn?.teamB?.result === 'loser')
    );

    if (bracket912Match) {
      const teamId = bracket912Match.dependsOn?.teamA?.matchId === completedMatch.id
        ? bracket912Match.teamAId
        : bracket912Match.teamBId;
      expect(teamId).toBe(loserId);
    }
  });
});

describe('getShortMainRoundMatchCount', () => {
  it('returns 24 for standard 16-team format', () => {
    expect(getShortMainRoundMatchCount()).toBe(24);
  });
});

describe('calculateShortMainRoundPlacements', () => {
  it('returns placements for completed placement matches', () => {
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
        knockoutRound: 'top-semifinal',
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
        knockoutRound: 'top-semifinal',
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
        knockoutRound: 'top-final',
        playoffForPlace: 1,
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
        playoffForPlace: 3,
      },
    ];

    const placements = calculateShortMainRoundPlacements(matches, teams);

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
