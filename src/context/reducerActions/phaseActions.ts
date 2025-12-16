import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentContainer, PlayoffSettings, KnockoutSettings } from '../../types/tournament';
import type { TournamentState } from '../tournamentActions';
import { generateSwissRoundMatches } from '../../utils/swissSystem';
import { generatePlayoffTournament } from '../../utils/playoff';
import { generateKnockoutTournament } from '../../utils/knockout';
import { generatePlacementTreeTournament } from '../../utils/placementTree/index';
import { generateShortMainRoundTournament } from '../../utils/shortMainRound';
import { assignAllKnockoutReferees } from '../../utils/refereeAssignment';
import { isGroupBasedSystem } from './helpers';

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
      const newMatches = generateSwissRoundMatches(t.teams, t.standings, t.matches, nextRound, t.numberOfCourts);
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

export function handleCreateFinalsPhase(
  state: TournamentState,
  payload: { parentTournamentId: string; settings: PlayoffSettings }
): TournamentState {
  const { parentTournamentId, settings } = payload;
  const parentTournament = state.tournaments.find(t => t.id === parentTournamentId);

  if (!parentTournament) return state;

  // Check if parent already has a finals tournament
  const existingFinals = state.tournaments.find(
    t => t.parentPhaseId === parentTournamentId && t.system === 'playoff'
  );
  if (existingFinals) return state;

  // Generate the new finals tournament
  const { tournament: finalsTournament, teams: finalsTeams } = generatePlayoffTournament(
    parentTournament,
    settings
  );

  const now = new Date().toISOString();
  let containers = state.containers || [];
  let containerId = parentTournament.containerId;

  // If parent doesn't have a container, create one
  if (!containerId) {
    containerId = uuidv4();
    const newContainer: TournamentContainer = {
      id: containerId,
      name: parentTournament.name,
      phases: [
        {
          tournamentId: parentTournament.id,
          order: 1,
          name: parentTournament.system === 'swiss' ? 'Swiss Vorrunde' : 'Vorrunde',
        },
        {
          tournamentId: finalsTournament.id,
          order: 2,
          name: 'Finale',
        },
      ],
      currentPhaseIndex: 1, // Switch to finals phase
      status: 'in-progress',
      createdAt: now,
      updatedAt: now,
    };
    containers = [...containers, newContainer];
  } else {
    // Add finals to existing container
    containers = containers.map(c => {
      if (c.id !== containerId) return c;
      const nextOrder = Math.max(...c.phases.map(p => p.order)) + 1;
      return {
        ...c,
        phases: [
          ...c.phases,
          {
            tournamentId: finalsTournament.id,
            order: nextOrder,
            name: 'Finale',
          },
        ],
        currentPhaseIndex: c.phases.length, // Switch to new finals phase
        updatedAt: now,
      };
    });
  }

  // Update parent tournament with container reference and mark as completed
  const updatedParent: Tournament = {
    ...parentTournament,
    containerId,
    phaseOrder: 1,
    phaseName: parentTournament.system === 'swiss' ? 'Swiss Vorrunde' : 'Vorrunde',
    status: 'completed',
    updatedAt: now,
  };

  // Create finals tournament with proper references
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
    currentTournamentId: finalsTournament.id, // Switch to finals tournament
  };
}

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

  // Generate the appropriate knockout tournament based on parent system
  let knockoutTournament: Tournament;
  let knockoutTeams: import('../../types/tournament').Team[];
  let eliminatedTeamIds: string[];
  let phase2Name: string;

  if (parentTournament.system === 'beachl-all-placements') {
    // Generate full placement tree
    const result = generatePlacementTreeTournament(
      parentTournament,
      parentTournament.groupStandings,
      settings
    );
    knockoutTournament = result.tournament;
    knockoutTeams = result.teams;
    eliminatedTeamIds = result.eliminatedTeamIds;
    phase2Name = 'Platzierungsbaum';
  } else if (parentTournament.system === 'beachl-short-main') {
    // Generate shortened main round
    const result = generateShortMainRoundTournament(
      parentTournament,
      parentTournament.groupStandings,
      settings
    );
    knockoutTournament = result.tournament;
    knockoutTeams = result.teams;
    eliminatedTeamIds = result.eliminatedTeamIds;
    phase2Name = 'Hauptrunde';
  } else {
    // Default: SSVB knockout format
    const result = generateKnockoutTournament(
      parentTournament,
      parentTournament.groupStandings,
      settings
    );
    knockoutTournament = result.tournament;
    knockoutTeams = result.teams;
    eliminatedTeamIds = result.eliminatedTeamIds;
    phase2Name = 'K.O.-Phase';
  }

  const now = new Date().toISOString();
  let containers = state.containers || [];
  let containerId = parentTournament.containerId;

  // If parent doesn't have a container, create one
  if (!containerId) {
    containerId = uuidv4();
    const newContainer: TournamentContainer = {
      id: containerId,
      name: parentTournament.name,
      phases: [
        {
          tournamentId: parentTournament.id,
          order: 1,
          name: 'Gruppenphase',
        },
        {
          tournamentId: knockoutTournament.id,
          order: 2,
          name: phase2Name,
        },
      ],
      currentPhaseIndex: 1,
      status: 'in-progress',
      createdAt: now,
      updatedAt: now,
    };
    containers = [...containers, newContainer];
  } else {
    // Add knockout to existing container
    containers = containers.map(c => {
      if (c.id !== containerId) return c;
      const nextOrder = Math.max(...c.phases.map(p => p.order)) + 1;
      return {
        ...c,
        phases: [
          ...c.phases,
          {
            tournamentId: knockoutTournament.id,
            order: nextOrder,
            name: phase2Name,
          },
        ],
        currentPhaseIndex: c.phases.length,
        updatedAt: now,
      };
    });
  }

  // Update parent tournament
  const updatedParent: Tournament = {
    ...parentTournament,
    containerId,
    phaseOrder: 1,
    phaseName: 'Gruppenphase',
    status: 'completed',
    updatedAt: now,
  };

  // Assign initial referees if enabled (only for SSVB knockout format)
  let knockoutMatches = knockoutTournament.matches;
  if (settings.useReferees && parentTournament.groupStandings && parentTournament.system === 'group-phase') {
    knockoutMatches = assignAllKnockoutReferees(
      knockoutMatches,
      parentTournament.matches,
      parentTournament.groupStandings,
      eliminatedTeamIds
    );
  }

  // Create knockout tournament with proper references
  const knockoutWithRefs: Tournament = {
    ...knockoutTournament,
    matches: knockoutMatches,
    containerId,
    phaseOrder: 2,
    phaseName: phase2Name,
    parentPhaseId: parentTournament.id,
    teams: knockoutTeams,
    eliminatedTeamIds,
  };

  return {
    ...state,
    tournaments: [
      ...state.tournaments.filter(t => t.id !== parentTournamentId),
      updatedParent,
      knockoutWithRefs,
    ],
    containers,
    currentTournamentId: knockoutTournament.id,
  };
}
