import type { Tournament } from '../../types/tournament';
import type { TournamentState } from '../tournamentActions';
import { calculateStandings } from '../../utils/standings';
import { calculateAllGroupStandings } from '../../utils/groupPhase';
import { updateKnockoutBracket } from '../../utils/knockout';
import { updatePlacementTreeBracket } from '../../utils/placementTree/index';
import { updateShortMainRoundBracket } from '../../utils/shortMainRound';
import { assignAllKnockoutReferees, updateRefereeAssignmentsAfterRound } from '../../utils/refereeAssignment';
import { populateKnockoutTeams } from '../../utils/knockout';
import { populatePlacementTreeTeams } from '../../utils/placementTree/index';
import { populateShortMainRoundTeams } from '../../utils/shortMainRound';
import { populatePlayoffTeams } from '../../utils/playoff';
import { isGroupBasedSystem } from './helpers';

export function handleUpdateMatchScore(
  state: TournamentState,
  payload: { tournamentId: string; matchId: string; scores: Array<{ teamA: number; teamB: number }> }
): TournamentState {
  return {
    ...state,
    tournaments: state.tournaments.map(t => {
      if (t.id !== payload.tournamentId) return t;

      const updatedMatches = t.matches.map(m =>
        m.id === payload.matchId
          ? { ...m, scores: payload.scores, status: 'in-progress' as const }
          : m
      );

      return {
        ...t,
        matches: updatedMatches,
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function handleCompleteMatch(
  state: TournamentState,
  payload: { tournamentId: string; matchId: string }
): TournamentState {
  const now = new Date().toISOString();
  let newTournaments = state.tournaments;

  // First, process the match completion
  newTournaments = newTournaments.map(t => {
    if (t.id !== payload.tournamentId) return t;

    let updatedMatches = t.matches.map(m => {
      if (m.id !== payload.matchId) return m;

      let setsWonA = 0;
      let setsWonB = 0;
      m.scores.forEach(score => {
        if (score.teamA > score.teamB) setsWonA++;
        else if (score.teamB > score.teamA) setsWonB++;
      });

      const winnerId = setsWonA > setsWonB ? m.teamAId : m.teamBId;
      return { ...m, winnerId, status: 'completed' as const };
    });

    // For knockout tournaments, propagate winners/losers to dependent matches
    if (t.system === 'knockout') {
      updatedMatches = updateKnockoutBracket(updatedMatches, payload.matchId);

      // Check if a round is complete and assign referees for next round
      const completedMatch = updatedMatches.find(m => m.id === payload.matchId);
      if (completedMatch?.knockoutRound && t.knockoutConfig?.useReferees) {
        const roundMatches = updatedMatches.filter(m => m.knockoutRound === completedMatch.knockoutRound);
        const allRoundComplete = roundMatches.every(m => m.status === 'completed');

        if (allRoundComplete) {
          // Get parent tournament's group phase matches for opponent history
          const parentTournament = t.parentPhaseId
            ? state.tournaments.find(pt => pt.id === t.parentPhaseId)
            : null;

          if (parentTournament) {
            if (completedMatch.knockoutRound === 'intermediate') {
              updatedMatches = updateRefereeAssignmentsAfterRound(
                updatedMatches,
                'intermediate',
                parentTournament.matches
              );
            } else if (completedMatch.knockoutRound === 'quarterfinal') {
              updatedMatches = updateRefereeAssignmentsAfterRound(
                updatedMatches,
                'quarterfinal',
                parentTournament.matches
              );
            }
          }
        }
      }
    }

    // For placement tree tournaments, propagate winners/losers
    if (t.system === 'placement-tree') {
      updatedMatches = updatePlacementTreeBracket(updatedMatches, payload.matchId);
    }

    // For shortened main round tournaments, propagate winners/losers
    if (t.system === 'short-main-knockout') {
      updatedMatches = updateShortMainRoundBracket(updatedMatches, payload.matchId);
    }

    // Calculate standings based on tournament type
    let standings = t.standings;
    let groupStandings = t.groupStandings;

    if (isGroupBasedSystem(t.system) && t.groupPhaseConfig) {
      // Update group standings
      groupStandings = calculateAllGroupStandings(
        t.groupPhaseConfig,
        t.teams,
        updatedMatches,
        t.setsPerMatch,
        t.tiebreakerOrder || 'head-to-head-first'
      );
    } else {
      standings = calculateStandings(t.teams, updatedMatches, {
        setsPerMatch: t.setsPerMatch,
        tiebreakerOrder: t.tiebreakerOrder || 'head-to-head-first',
        system: t.system,
      });
    }

    const allCompleted = updatedMatches.every(m => m.status === 'completed' || m.status === 'pending');
    const hasScheduledOrInProgress = updatedMatches.some(m => m.status === 'scheduled' || m.status === 'in-progress');

    return {
      ...t,
      matches: updatedMatches,
      standings,
      groupStandings,
      status: !hasScheduledOrInProgress && allCompleted ? 'completed' : 'in-progress',
      updatedAt: now,
    };
  });

  // Check if a group phase just completed - populate knockout teams
  const completedTournament = newTournaments.find(t => t.id === payload.tournamentId);
  if (
    completedTournament &&
    isGroupBasedSystem(completedTournament.system) &&
    completedTournament.status === 'completed' &&
    completedTournament.groupStandings
  ) {
    // Find the child knockout tournament (any knockout type)
    const knockoutSystems = ['knockout', 'placement-tree', 'short-main-knockout'];
    const knockoutTournament = newTournaments.find(
      t => t.parentPhaseId === completedTournament.id && knockoutSystems.includes(t.system)
    );

    if (knockoutTournament && knockoutTournament.teams.length === 0) {
      let populatedKnockout: Tournament;
      let eliminatedTeamIds: string[];

      // Populate based on knockout type
      if (knockoutTournament.system === 'short-main-knockout') {
        const result = populateShortMainRoundTeams(
          knockoutTournament,
          completedTournament,
          completedTournament.groupStandings
        );
        populatedKnockout = result.tournament;
        eliminatedTeamIds = result.eliminatedTeamIds;
      } else if (knockoutTournament.system === 'placement-tree') {
        const result = populatePlacementTreeTeams(
          knockoutTournament,
          completedTournament,
          completedTournament.groupStandings
        );
        populatedKnockout = result.tournament;
        eliminatedTeamIds = result.eliminatedTeamIds;
      } else {
        // Default: SSVB knockout format
        const result = populateKnockoutTeams(
          knockoutTournament,
          completedTournament,
          completedTournament.groupStandings
        );
        populatedKnockout = result.tournament;
        eliminatedTeamIds = result.eliminatedTeamIds;

        // Assign referees if enabled (only for SSVB format)
        if (knockoutTournament.knockoutConfig?.useReferees && completedTournament.groupStandings) {
          populatedKnockout = {
            ...populatedKnockout,
            matches: assignAllKnockoutReferees(
              populatedKnockout.matches,
              completedTournament.matches,
              completedTournament.groupStandings,
              eliminatedTeamIds
            ),
          };
        }
      }

      // Update the knockout tournament
      newTournaments = newTournaments.map(t => {
        if (t.id !== knockoutTournament.id) return t;
        return {
          ...populatedKnockout,
          eliminatedTeamIds,
        };
      });
    }
  }

  // Check if a round-robin phase just completed - populate playoff teams
  const completedRR = newTournaments.find(t => t.id === payload.tournamentId);
  if (
    completedRR &&
    completedRR.system === 'round-robin' &&
    completedRR.status === 'completed'
  ) {
    // Find the child playoff tournament
    const playoffTournament = newTournaments.find(
      t => t.parentPhaseId === completedRR.id && t.system === 'playoff'
    );

    if (playoffTournament && playoffTournament.teams.length === 0) {
      const result = populatePlayoffTeams(playoffTournament, completedRR);
      const populatedPlayoff = result.tournament;

      // Update the playoff tournament
      newTournaments = newTournaments.map(t => {
        if (t.id !== playoffTournament.id) return t;
        return populatedPlayoff;
      });
    }
  }

  return {
    ...state,
    tournaments: newTournaments,
  };
}
