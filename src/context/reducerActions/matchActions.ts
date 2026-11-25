import type { Tournament } from '../../types/tournament';
import type { TournamentState } from '../tournamentActions';
import {
  updateRefereeAssignmentsAfterRound,
  assignAllKnockoutReferees,
  populateKnockoutTeams,
  populatePlacementTreeTeams,
  populateShortMainRoundTeams,
  populatePlayoffTeams,
} from '../../domain';
import { isGroupBasedSystem } from './helpers';
import {
  completeMatchWithWinner,
  propagateToBracket,
  calculateTournamentStandings,
  determineTournamentStatus,
  isKnockoutRoundComplete,
  findChildKnockoutTournament,
  shouldPopulateKnockout,
} from './matchHelpers';

// =============================================================================
// UPDATE MATCH SCORE
// =============================================================================

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

      return { ...t, matches: updatedMatches, updatedAt: new Date().toISOString() };
    }),
  };
}

// =============================================================================
// COMPLETE MATCH
// =============================================================================

export function handleCompleteMatch(
  state: TournamentState,
  payload: { tournamentId: string; matchId: string }
): TournamentState {
  const now = new Date().toISOString();
  let newTournaments = state.tournaments;

  // Process match completion
  newTournaments = newTournaments.map(t => {
    if (t.id !== payload.tournamentId) return t;
    return processMatchCompletion(t, payload.matchId, state, now);
  });

  // Handle phase transitions
  newTournaments = handleGroupPhaseCompletion(newTournaments, payload.tournamentId);
  newTournaments = handleRoundRobinCompletion(newTournaments, payload.tournamentId);

  return { ...state, tournaments: newTournaments };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Process match completion for a single tournament
 */
function processMatchCompletion(
  tournament: Tournament,
  matchId: string,
  state: TournamentState,
  now: string
): Tournament {
  // Complete the match
  let updatedMatches = tournament.matches.map(m =>
    m.id === matchId ? completeMatchWithWinner(m) : m
  );

  // Propagate to bracket if applicable
  updatedMatches = propagateToBracket(updatedMatches, matchId, tournament.system);

  // Handle knockout referee assignment
  updatedMatches = handleKnockoutRefereeAssignment(
    tournament,
    updatedMatches,
    matchId,
    state
  );

  // Calculate standings
  const { standings, groupStandings } = calculateTournamentStandings(
    tournament,
    updatedMatches
  );

  return {
    ...tournament,
    matches: updatedMatches,
    standings,
    groupStandings,
    status: determineTournamentStatus(updatedMatches),
    updatedAt: now,
  };
}

/**
 * Handle knockout referee assignment after round completion
 */
function handleKnockoutRefereeAssignment(
  tournament: Tournament,
  matches: Tournament['matches'],
  matchId: string,
  state: TournamentState
): Tournament['matches'] {
  if (tournament.system !== 'knockout') return matches;
  if (!tournament.knockoutConfig?.useReferees) return matches;

  const completedMatch = matches.find(m => m.id === matchId);
  if (!completedMatch?.knockoutRound) return matches;
  if (!isKnockoutRoundComplete(matches, completedMatch.knockoutRound)) return matches;

  const parentTournament = tournament.parentPhaseId
    ? state.tournaments.find(pt => pt.id === tournament.parentPhaseId)
    : null;

  if (!parentTournament) return matches;

  const roundsToAssign = ['intermediate', 'quarterfinal'];
  if (roundsToAssign.includes(completedMatch.knockoutRound)) {
    return updateRefereeAssignmentsAfterRound(
      matches,
      completedMatch.knockoutRound as 'intermediate' | 'quarterfinal',
      parentTournament.matches
    );
  }

  return matches;
}

/**
 * Handle group phase completion -> populate knockout teams
 */
function handleGroupPhaseCompletion(
  tournaments: Tournament[],
  completedTournamentId: string
): Tournament[] {
  const completedTournament = tournaments.find(t => t.id === completedTournamentId);
  if (!completedTournament) return tournaments;
  if (!isGroupBasedSystem(completedTournament.system)) return tournaments;
  if (completedTournament.status !== 'completed') return tournaments;
  if (!completedTournament.groupStandings) return tournaments;

  const knockoutTournament = findChildKnockoutTournament(tournaments, completedTournamentId);
  if (!shouldPopulateKnockout(completedTournament, knockoutTournament)) return tournaments;

  return populateKnockoutPhase(tournaments, completedTournament, knockoutTournament!);
}

/**
 * Populate knockout phase with teams from group phase
 */
function populateKnockoutPhase(
  tournaments: Tournament[],
  groupPhase: Tournament,
  knockoutTournament: Tournament
): Tournament[] {
  let populatedKnockout: Tournament;
  let eliminatedTeamIds: string[];

  if (knockoutTournament.system === 'short-main-knockout') {
    const result = populateShortMainRoundTeams(
      knockoutTournament,
      groupPhase,
      groupPhase.groupStandings!
    );
    populatedKnockout = result.tournament;
    eliminatedTeamIds = result.eliminatedTeamIds;
  } else if (knockoutTournament.system === 'placement-tree') {
    const result = populatePlacementTreeTeams(
      knockoutTournament,
      groupPhase,
      groupPhase.groupStandings!
    );
    populatedKnockout = result.tournament;
    eliminatedTeamIds = result.eliminatedTeamIds;
  } else {
    const result = populateKnockoutTeams(
      knockoutTournament,
      groupPhase,
      groupPhase.groupStandings!
    );
    populatedKnockout = result.tournament;
    eliminatedTeamIds = result.eliminatedTeamIds;

    // Assign referees for SSVB format
    if (knockoutTournament.knockoutConfig?.useReferees) {
      populatedKnockout = {
        ...populatedKnockout,
        matches: assignAllKnockoutReferees(
          populatedKnockout.matches,
          groupPhase.matches,
          groupPhase.groupStandings!,
          eliminatedTeamIds
        ),
      };
    }
  }

  return tournaments.map(t => {
    if (t.id !== knockoutTournament.id) return t;
    return { ...populatedKnockout, eliminatedTeamIds };
  });
}

/**
 * Handle round-robin completion -> populate playoff teams
 */
function handleRoundRobinCompletion(
  tournaments: Tournament[],
  completedTournamentId: string
): Tournament[] {
  const completedRR = tournaments.find(t => t.id === completedTournamentId);
  if (!completedRR) return tournaments;
  if (completedRR.system !== 'round-robin') return tournaments;
  if (completedRR.status !== 'completed') return tournaments;

  const playoffTournament = tournaments.find(
    t => t.parentPhaseId === completedRR.id && t.system === 'playoff'
  );

  if (!playoffTournament || playoffTournament.teams.length > 0) return tournaments;

  const { tournament: populatedPlayoff } = populatePlayoffTeams(playoffTournament, completedRR);

  return tournaments.map(t => {
    if (t.id !== playoffTournament.id) return t;
    return populatedPlayoff;
  });
}
