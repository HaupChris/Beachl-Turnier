import { describe, it, expect } from 'vitest';
import {
  generateKnockoutTournamentPlaceholder,
  updateKnockoutBracket,
  populateKnockoutTeams,
  getSSVBKnockoutMatchCount,
} from '../knockout';
import { generateSnakeDraftGroups, generateGroupPhaseMatches } from '../groupPhase';
import { createTeams, verifyDependencies } from '../../__tests__/utils/testHelpers';
import type { GroupPhaseConfig, Match, KnockoutSettings, Tournament } from '../../types/tournament';
import { v4 as uuidv4 } from 'uuid';

function createParentTournament(teamCount: number, groupCount: number): Tournament {
  const teams = createTeams(teamCount);
  const groups = generateSnakeDraftGroups(teams, groupCount);
  const config: GroupPhaseConfig = {
    numberOfGroups: groupCount, teamsPerGroup: Math.ceil(teamCount / groupCount), seeding: 'snake', groups,
  };
  const groupStandings = groups.flatMap((group) =>
    group.teamIds.map((teamId, index) => ({
      teamId, played: group.teamIds.length - 1, won: group.teamIds.length - 1 - index, lost: index,
      setsWon: group.teamIds.length - 1 - index, setsLost: index, pointsWon: 63 - index * 10, pointsLost: 45 + index * 5,
      points: group.teamIds.length - 1 - index, groupId: group.id, groupRank: index + 1,
    }))
  );
  return {
    id: uuidv4(), name: 'Test Tournament', system: 'group-phase', numberOfCourts: 4, setsPerMatch: 1, pointsPerSet: 21,
    tiebreakerOrder: 'head-to-head-first', teams, matches: generateGroupPhaseMatches(config, teams, 4), standings: [],
    groupStandings, groupPhaseConfig: config, status: 'completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

const defaultSettings: KnockoutSettings = { setsPerMatch: 1, pointsPerSet: 21, playThirdPlaceMatch: true, useReferees: false };

describe('generateKnockoutTournamentPlaceholder', () => {
  describe('2 groups (8 teams)', () => {
    it('generates correct bracket structure (4 matches)', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches).toHaveLength(4);
    });

    it('has valid dependencies', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });

    it('has 2 semifinal matches', () => {
      const parent = createParentTournament(8, 2);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.filter(m => m.knockoutRound === 'semifinal')).toHaveLength(2);
    });
  });

  describe('4 groups (16 teams)', () => {
    it('generates 12 matches (4 intermediate + 4 QF + 2 SF + 1 final + 1 third)', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches).toHaveLength(12);
    });

    it('has valid dependencies and all rounds', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
      expect(tournament.matches.filter(m => m.knockoutRound === 'intermediate')).toHaveLength(4);
      expect(tournament.matches.filter(m => m.knockoutRound === 'quarterfinal')).toHaveLength(4);
      expect(tournament.matches.filter(m => m.knockoutRound === 'semifinal')).toHaveLength(2);
      expect(tournament.matches.filter(m => m.knockoutRound === 'final')).toHaveLength(1);
      expect(tournament.matches.filter(m => m.knockoutRound === 'third-place')).toHaveLength(1);
    });

    it('all matches have placeholders or team sources', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      for (const match of tournament.matches) {
        expect(match.teamAPlaceholder || match.teamAId || match.teamASource || match.dependsOn?.teamA).toBeTruthy();
        expect(match.teamBPlaceholder || match.teamBId || match.teamBSource || match.dependsOn?.teamB).toBeTruthy();
      }
    });
  });

  describe('5-8 groups (20-32 teams)', () => {
    it.each([[20, 5], [24, 6], [32, 8]])('generates valid bracket for %i teams in %i groups', (teamCount, groupCount) => {
      const parent = createParentTournament(teamCount, groupCount);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });
  });

  describe('options', () => {
    it('excludes 3rd place match when playThirdPlaceMatch is false', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, { ...defaultSettings, playThirdPlaceMatch: false });
      expect(tournament.matches.filter(m => m.knockoutRound === 'third-place')).toHaveLength(0);
    });

    it('includes referee placeholders when useReferees is true', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateKnockoutTournamentPlaceholder(parent, { ...defaultSettings, useReferees: true });
      expect(tournament.matches.filter(m => m.refereePlaceholder).length).toBeGreaterThan(0);
    });
  });
});

describe('populateKnockoutTeams', () => {
  it('populates 12 teams from group standings (4 eliminated)', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { teams } = populateKnockoutTeams(placeholder, parent, parent.groupStandings!);
    expect(teams).toHaveLength(12);
  });

  it('intermediate matches have teams assigned', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateKnockoutTeams(placeholder, parent, parent.groupStandings!);
    for (const match of populated.matches.filter(m => m.knockoutRound === 'intermediate')) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });

  it('group winners go directly to QF', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateKnockoutTeams(placeholder, parent, parent.groupStandings!);
    for (const match of populated.matches.filter(m => m.knockoutRound === 'quarterfinal')) {
      expect(match.teamAId).not.toBeNull();
    }
  });
});

describe('updateKnockoutBracket', () => {
  it('propagates winner to dependent match', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateKnockoutTeams(placeholder, parent, parent.groupStandings!);

    const intermediateMatch = populated.matches.find(m => m.knockoutRound === 'intermediate' && m.teamAId && m.teamBId);
    expect(intermediateMatch).toBeDefined();

    const completedMatch: Match = { ...intermediateMatch!, scores: [{ teamA: 21, teamB: 15 }], winnerId: intermediateMatch!.teamAId, status: 'completed' };
    const updatedMatches = populated.matches.map(m => m.id === completedMatch.id ? completedMatch : m);
    const propagatedMatches = updateKnockoutBracket(updatedMatches, completedMatch.id);

    const dependentMatch = propagatedMatches.find(m => m.knockoutRound === 'quarterfinal' && m.dependsOn?.teamB?.matchId === completedMatch.id);
    expect(dependentMatch?.teamBId).toBe(completedMatch.winnerId);
  });

  it('changes match status to scheduled when both teams assigned', () => {
    const parent = createParentTournament(8, 2);
    const { tournament: placeholder } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateKnockoutTeams(placeholder, parent, parent.groupStandings!);

    let matches = populated.matches;
    for (const semi of populated.matches.filter(m => m.knockoutRound === 'semifinal')) {
      const completedMatch: Match = { ...matches.find(m => m.id === semi.id)!, scores: [{ teamA: 21, teamB: 15 }], winnerId: semi.teamAId, status: 'completed' };
      matches = matches.map(m => m.id === completedMatch.id ? completedMatch : m);
      matches = updateKnockoutBracket(matches, completedMatch.id);
    }

    const final = matches.find(m => m.knockoutRound === 'final');
    expect(final?.status).toBe('scheduled');
    expect(final?.teamAId).not.toBeNull();
    expect(final?.teamBId).not.toBeNull();
  });
});

describe('getSSVBKnockoutMatchCount', () => {
  it('returns 12 with 3rd place match', () => expect(getSSVBKnockoutMatchCount(true)).toBe(12));
  it('returns 11 without 3rd place match', () => expect(getSSVBKnockoutMatchCount(false)).toBe(11));
});

describe('edge cases - team dropouts', () => {
  it.each([[15, 4], [11, 3], [9, 3], [7, 2]])('handles %i teams in %i groups', (teamCount, groupCount) => {
    const parent = createParentTournament(teamCount, groupCount);
    const { tournament } = generateKnockoutTournamentPlaceholder(parent, defaultSettings);
    expect(tournament.matches.length).toBeGreaterThan(0);
    expect(verifyDependencies(tournament.matches).valid).toBe(true);
  });
});
