import type { Tournament, KnockoutSettings, PlayoffSettings } from '../../types/tournament';
import type { TournamentState } from '../tournamentActions';
import {
  generateSwissRoundMatches,
  generatePlayoffTournament,
  generateKnockoutTournament,
  generatePlacementTreeTournament,
  generateShortMainRoundTournament,
  assignAllKnockoutReferees,
} from '../../domain';
import { isGroupBasedSystem } from './helpers';
import {
  createOrUpdateContainer,
  getPhaseNameForSystem,
  getKnockoutSystemForParent,
} from './containerHelpers';

// =============================================================================
// SWISS ROUND GENERATION
// =============================================================================

export function handleGenerateNextSwissRound(
  state: TournamentState,
  tournamentId: string
): TournamentState {
  return {
    ...state,
    tournaments: state.tournaments.map(t => {
      if (t.id !== tournamentId || t.system !== 'swiss') return t;

      const currentRound = t.currentRound || 0;
      const nextRound = currentRound + 1;

      if (t.numberOfRounds && nextRound > t.numberOfRounds) {
        return { ...t, status: 'completed', updatedAt: new Date().toISOString() };
      }

      const newMatches = generateSwissRoundMatches(
        t.teams, t.standings, t.matches, nextRound, t.numberOfCourts
      );

      if (newMatches.length === 0) {
        return { ...t, status: 'completed', updatedAt: new Date().toISOString() };
      }

      return {
        ...t,
        matches: [...t.matches, ...newMatches],
        currentRound: nextRound,
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

// =============================================================================
// FINALS PHASE CREATION (Round-Robin -> Playoff)
// =============================================================================

export function handleCreateFinalsPhase(
  state: TournamentState,
  payload: { parentTournamentId: string; settings: PlayoffSettings }
): TournamentState {
  const { parentTournamentId, settings } = payload;
  const parentTournament = state.tournaments.find(t => t.id === parentTournamentId);
  if (!parentTournament) return state;

  // Check if finals already exists
  const existingFinals = state.tournaments.find(
    t => t.parentPhaseId === parentTournamentId && t.system === 'playoff'
  );
  if (existingFinals) return state;

  // Generate finals tournament
  const { tournament: finalsTournament, teams: finalsTeams } = generatePlayoffTournament(
    parentTournament,
    settings
  );

  // Create/update container
  const parentPhaseName = getPhaseNameForSystem(parentTournament.system, 1);
  const { containerId, containers, updatedParent } = createOrUpdateContainer(
    parentTournament,
    finalsTournament.id,
    state.containers || [],
    {
      parentPhaseName,
      childPhaseName: 'Finale',
      markParentCompleted: true,
    }
  );

  // Create finals with references
  const finalsWithRefs: Tournament = {
    ...finalsTournament,
    containerId,
    phaseOrder: 2,
    phaseName: 'Finale',
    parentPhaseId: parentTournament.id,
    teams: finalsTeams,
  };

  return {
    ...state,
    tournaments: [
      ...state.tournaments.filter(t => t.id !== parentTournamentId),
      updatedParent,
      finalsWithRefs,
    ],
    containers,
    currentTournamentId: finalsTournament.id,
  };
}

// =============================================================================
// KNOCKOUT PHASE TRANSITION (Group Phase -> Knockout)
// =============================================================================

export function handleTransitionToKnockout(
  state: TournamentState,
  payload: { parentTournamentId: string; settings: KnockoutSettings }
): TournamentState {
  const { parentTournamentId, settings } = payload;
  const parentTournament = state.tournaments.find(t => t.id === parentTournamentId);

  if (!parentTournament || !isGroupBasedSystem(parentTournament.system)) return state;
  if (!parentTournament.groupPhaseConfig || !parentTournament.groupStandings) return state;

  // Check if knockout already exists
  const knockoutSystems = ['knockout', 'placement-tree', 'short-main-knockout'];
  const existingKnockout = state.tournaments.find(
    t => t.parentPhaseId === parentTournamentId && knockoutSystems.includes(t.system)
  );
  if (existingKnockout) return state;

  // Generate knockout tournament
  const knockoutResult = generateKnockoutForSystem(
    parentTournament,
    parentTournament.groupStandings,
    settings
  );

  // Get phase names
  const knockoutSystem = getKnockoutSystemForParent(parentTournament.system);
  const childPhaseName = getPhaseNameForSystem(knockoutSystem, 2);

  // Create/update container
  const { containerId, containers, updatedParent } = createOrUpdateContainer(
    parentTournament,
    knockoutResult.tournament.id,
    state.containers || [],
    {
      parentPhaseName: 'Gruppenphase',
      childPhaseName,
      markParentCompleted: true,
    }
  );

  // Apply referee assignments if enabled (SSVB format only)
  let knockoutMatches = knockoutResult.tournament.matches;
  if (settings.useReferees && parentTournament.system === 'group-phase') {
    knockoutMatches = assignAllKnockoutReferees(
      knockoutMatches,
      parentTournament.matches,
      parentTournament.groupStandings,
      knockoutResult.eliminatedTeamIds
    );
  }

  // Create knockout with references
  const knockoutWithRefs: Tournament = {
    ...knockoutResult.tournament,
    matches: knockoutMatches,
    containerId,
    phaseOrder: 2,
    phaseName: childPhaseName,
    parentPhaseId: parentTournament.id,
    teams: knockoutResult.teams,
    eliminatedTeamIds: knockoutResult.eliminatedTeamIds,
  };

  return {
    ...state,
    tournaments: [
      ...state.tournaments.filter(t => t.id !== parentTournamentId),
      updatedParent,
      knockoutWithRefs,
    ],
    containers,
    currentTournamentId: knockoutResult.tournament.id,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate the appropriate knockout tournament based on parent system
 */
function generateKnockoutForSystem(
  parentTournament: Tournament,
  groupStandings: NonNullable<Tournament['groupStandings']>,
  settings: KnockoutSettings
): {
  tournament: Tournament;
  teams: Tournament['teams'];
  eliminatedTeamIds: string[];
} {
  const knockoutSystem = getKnockoutSystemForParent(parentTournament.system);

  switch (knockoutSystem) {
    case 'placement-tree':
      return generatePlacementTreeTournament(parentTournament, groupStandings, settings);
    case 'short-main-knockout':
      return generateShortMainRoundTournament(parentTournament, groupStandings, settings);
    default:
      return generateKnockoutTournament(parentTournament, groupStandings, settings);
  }
}
