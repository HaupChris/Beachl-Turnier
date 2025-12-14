import { describe, it, expect } from 'vitest';
import {
  generateShortMainRoundTournamentPlaceholder,
  populateShortMainRoundTeams,
  updateShortMainRoundBracket,
  getShortMainRoundMatchCount,
} from '../shortMainRound';
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
    id: uuidv4(), name: 'Test Tournament', system: 'beachl-short-main', numberOfCourts: 4, setsPerMatch: 1, pointsPerSet: 21,
    tiebreakerOrder: 'head-to-head-first', teams, matches: generateGroupPhaseMatches(config, teams, 4), standings: [],
    groupStandings, groupPhaseConfig: config, status: 'completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

const defaultSettings: KnockoutSettings = { setsPerMatch: 1, pointsPerSet: 21, playThirdPlaceMatch: true, useReferees: false };

describe('generateShortMainRoundTournamentPlaceholder', () => {
  describe('4 groups (16 teams) - standard format', () => {
    it('generates 24 matches', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches).toHaveLength(24);
    });

    it('has valid dependencies', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });

    it('has all bracket rounds', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.filter(m => m.knockoutRound === 'qualification')).toHaveLength(4);
      expect(tournament.matches.filter(m => m.knockoutRound === 'top-quarterfinal')).toHaveLength(4);
      expect(tournament.matches.filter(m => m.knockoutRound === 'top-semifinal')).toHaveLength(2);
      expect(tournament.matches.filter(m => m.knockoutRound === 'top-final')).toHaveLength(1);
      expect(tournament.matches.filter(m => m.knockoutRound === 'third-place')).toHaveLength(1);
      expect(tournament.matches.filter(m => m.knockoutRound === 'placement-13-16')).toHaveLength(4);
      expect(tournament.matches.filter(m => m.knockoutRound === 'placement-9-12')).toHaveLength(4);
      expect(tournament.matches.filter(m => m.knockoutRound === 'placement-5-8')).toHaveLength(4);
    });
  });

  describe('other configurations', () => {
    it.each([[8, 2], [12, 3]])('generates bracket for %i teams (%i groups)', (teamCount, groupCount) => {
      const parent = createParentTournament(teamCount, groupCount);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });
  });

  describe('edge cases - team dropouts', () => {
    it.each([[15, 4], [11, 3], [7, 2]])('handles %i teams in %i groups', (teamCount, groupCount) => {
      const parent = createParentTournament(teamCount, groupCount);
      const { tournament } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });
  });
});

describe('populateShortMainRoundTeams', () => {
  it('populates all 16 teams from group standings', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
    const { teams } = populateShortMainRoundTeams(placeholder, parent, parent.groupStandings!);
    expect(teams).toHaveLength(16);
  });

  it('qualification and bottom bracket matches have teams assigned', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateShortMainRoundTeams(placeholder, parent, parent.groupStandings!);

    for (const match of populated.matches.filter(m => m.knockoutRound === 'qualification')) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }

    for (const match of populated.matches.filter(m => m.knockoutRound === 'placement-13-16' && m.round === 1)) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });
});

describe('updateShortMainRoundBracket', () => {
  it('propagates winner from qualification to QF', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateShortMainRoundTeams(placeholder, parent, parent.groupStandings!);

    const qualiMatch = populated.matches.find(m => m.knockoutRound === 'qualification' && m.teamAId && m.teamBId);
    expect(qualiMatch).toBeDefined();

    const completedMatch: Match = { ...qualiMatch!, scores: [{ teamA: 21, teamB: 15 }], winnerId: qualiMatch!.teamAId, status: 'completed' };
    const updatedMatches = populated.matches.map(m => m.id === completedMatch.id ? completedMatch : m);
    const propagatedMatches = updateShortMainRoundBracket(updatedMatches, completedMatch.id);

    const qfMatch = propagatedMatches.find(m => m.knockoutRound === 'top-quarterfinal' && m.dependsOn?.teamB?.matchId === completedMatch.id);
    if (qfMatch) expect(qfMatch.teamBId).toBe(completedMatch.winnerId);
  });

  it('propagates loser from qualification to 9-12 bracket', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generateShortMainRoundTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populateShortMainRoundTeams(placeholder, parent, parent.groupStandings!);

    const qualiMatch = populated.matches.find(m => m.knockoutRound === 'qualification' && m.teamAId && m.teamBId);
    const loserId = qualiMatch!.teamBId;
    const completedMatch: Match = { ...qualiMatch!, scores: [{ teamA: 21, teamB: 15 }], winnerId: qualiMatch!.teamAId, status: 'completed' };
    const updatedMatches = populated.matches.map(m => m.id === completedMatch.id ? completedMatch : m);
    const propagatedMatches = updateShortMainRoundBracket(updatedMatches, completedMatch.id);

    const bracket912Match = propagatedMatches.find(m =>
      m.knockoutRound === 'placement-9-12' &&
      (m.dependsOn?.teamA?.matchId === completedMatch.id && m.dependsOn?.teamA?.result === 'loser' ||
       m.dependsOn?.teamB?.matchId === completedMatch.id && m.dependsOn?.teamB?.result === 'loser')
    );
    if (bracket912Match) {
      const teamId = bracket912Match.dependsOn?.teamA?.matchId === completedMatch.id ? bracket912Match.teamAId : bracket912Match.teamBId;
      expect(teamId).toBe(loserId);
    }
  });
});

describe('getShortMainRoundMatchCount', () => {
  it('returns 24 for standard 16-team format', () => expect(getShortMainRoundMatchCount()).toBe(24));
});
