import { describe, it, expect } from 'vitest';
import {
  generatePlacementTreeTournamentPlaceholder,
  populatePlacementTreeTeams,
  updatePlacementTreeBracket,
  getPlacementTreeMatchCount,
} from '../placementTree';
import { generateSnakeDraftGroups, generateGroupPhaseMatches } from '../groupPhase';
import { createTeams, verifyDependencies, expectedPlacementTreeMatchCount } from '../../__tests__/utils/testHelpers';
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
    id: uuidv4(), name: 'Test Tournament', system: 'beachl-all-placements', numberOfCourts: 4, setsPerMatch: 1, pointsPerSet: 21,
    tiebreakerOrder: 'head-to-head-first', teams, matches: generateGroupPhaseMatches(config, teams, 4), standings: [],
    groupStandings, groupPhaseConfig: config, status: 'completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

const defaultSettings: KnockoutSettings = { setsPerMatch: 1, pointsPerSet: 21, playThirdPlaceMatch: true, useReferees: false };

describe('generatePlacementTreeTournamentPlaceholder', () => {
  describe('match generation', () => {
    it.each([[16, 4], [12, 3], [8, 2], [24, 6]])('generates matches for %i teams (%i groups)', (teamCount, groupCount) => {
      const parent = createParentTournament(teamCount, groupCount);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThanOrEqual(expectedPlacementTreeMatchCount(teamCount));
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });
  });

  describe('bracket structure', () => {
    it('has valid dependencies', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });

    it('first round matches have placeholders', () => {
      const parent = createParentTournament(16, 4);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
      for (const match of tournament.matches.filter(m => m.round === 1)) {
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
      const placementFinals = tournament.matches.filter(m => m.knockoutRound === 'placement-final' || m.playoffForPlace !== undefined);
      expect(placementFinals.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases - team dropouts', () => {
    it.each([[15, 4], [11, 3], [9, 3]])('handles %i teams in %i groups', (teamCount, groupCount) => {
      const parent = createParentTournament(teamCount, groupCount);
      const { tournament } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
      expect(tournament.matches.length).toBeGreaterThan(0);
      expect(verifyDependencies(tournament.matches).valid).toBe(true);
    });
  });
});

describe('populatePlacementTreeTeams', () => {
  it('populates all teams from group standings', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
    const { teams } = populatePlacementTreeTeams(placeholder, parent, parent.groupStandings!);
    expect(teams).toHaveLength(16);
  });

  it('first round matches have teams assigned', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populatePlacementTreeTeams(placeholder, parent, parent.groupStandings!);
    for (const match of populated.matches.filter(m => m.round === 1)) {
      expect(match.teamAId).not.toBeNull();
      expect(match.teamBId).not.toBeNull();
    }
  });
});

describe('updatePlacementTreeBracket', () => {
  it('propagates winner to correct interval', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populatePlacementTreeTeams(placeholder, parent, parent.groupStandings!);

    const round1Match = populated.matches.find(m => m.round === 1 && m.teamAId && m.teamBId);
    expect(round1Match).toBeDefined();

    const completedMatch: Match = { ...round1Match!, scores: [{ teamA: 21, teamB: 15 }], winnerId: round1Match!.teamAId, status: 'completed' };
    const updatedMatches = populated.matches.map(m => m.id === completedMatch.id ? completedMatch : m);
    const propagatedMatches = updatePlacementTreeBracket(updatedMatches, completedMatch.id);

    const winnerDependentMatch = propagatedMatches.find(m =>
      m.dependsOn?.teamA?.matchId === completedMatch.id && m.dependsOn?.teamA?.result === 'winner' ||
      m.dependsOn?.teamB?.matchId === completedMatch.id && m.dependsOn?.teamB?.result === 'winner'
    );

    if (winnerDependentMatch) {
      const teamId = winnerDependentMatch.dependsOn?.teamA?.matchId === completedMatch.id
        ? winnerDependentMatch.teamAId : winnerDependentMatch.teamBId;
      expect(teamId).toBe(completedMatch.winnerId);
    }
  });

  it('propagates loser to correct interval', () => {
    const parent = createParentTournament(16, 4);
    const { tournament: placeholder } = generatePlacementTreeTournamentPlaceholder(parent, defaultSettings);
    const { tournament: populated } = populatePlacementTreeTeams(placeholder, parent, parent.groupStandings!);

    const round1Match = populated.matches.find(m => m.round === 1 && m.teamAId && m.teamBId);
    const loserId = round1Match!.teamBId;
    const completedMatch: Match = { ...round1Match!, scores: [{ teamA: 21, teamB: 15 }], winnerId: round1Match!.teamAId, status: 'completed' };
    const updatedMatches = populated.matches.map(m => m.id === completedMatch.id ? completedMatch : m);
    const propagatedMatches = updatePlacementTreeBracket(updatedMatches, completedMatch.id);

    const loserDependentMatch = propagatedMatches.find(m =>
      m.dependsOn?.teamA?.matchId === completedMatch.id && m.dependsOn?.teamA?.result === 'loser' ||
      m.dependsOn?.teamB?.matchId === completedMatch.id && m.dependsOn?.teamB?.result === 'loser'
    );

    if (loserDependentMatch) {
      const teamId = loserDependentMatch.dependsOn?.teamA?.matchId === completedMatch.id
        ? loserDependentMatch.teamAId : loserDependentMatch.teamBId;
      expect(teamId).toBe(loserId);
    }
  });
});

describe('getPlacementTreeMatchCount', () => {
  it.each([[8, 7], [12, 11], [16, 15], [24, 23], [32, 31]])('returns %i-1=%i for %i teams', (teamCount, expected) => {
    expect(getPlacementTreeMatchCount(teamCount)).toBe(expected);
  });
});
