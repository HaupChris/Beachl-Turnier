/**
 * Container Helper Functions
 *
 * Extracted helper functions for managing TournamentContainer operations.
 * These reduce duplication across reducer handlers.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentContainer } from '../../types/tournament';

/**
 * Result of creating or updating a container for a phase transition
 */
export interface ContainerUpdateResult {
  containerId: string;
  containers: TournamentContainer[];
  updatedParent: Tournament;
}

/**
 * Create or update a container when transitioning to a new phase
 */
export function createOrUpdateContainer(
  parentTournament: Tournament,
  childTournamentId: string,
  existingContainers: TournamentContainer[],
  config: {
    parentPhaseName: string;
    childPhaseName: string;
    markParentCompleted?: boolean;
  }
): ContainerUpdateResult {
  const now = new Date().toISOString();
  let containers = existingContainers;
  let containerId = parentTournament.containerId;

  if (!containerId) {
    // Create new container
    containerId = uuidv4();
    const newContainer: TournamentContainer = {
      id: containerId,
      name: parentTournament.name,
      phases: [
        {
          tournamentId: parentTournament.id,
          order: 1,
          name: config.parentPhaseName,
        },
        {
          tournamentId: childTournamentId,
          order: 2,
          name: config.childPhaseName,
        },
      ],
      currentPhaseIndex: 1,
      status: 'in-progress',
      createdAt: now,
      updatedAt: now,
    };
    containers = [...containers, newContainer];
  } else {
    // Update existing container
    containers = containers.map(c => {
      if (c.id !== containerId) return c;
      const nextOrder = Math.max(...c.phases.map(p => p.order)) + 1;
      return {
        ...c,
        phases: [
          ...c.phases,
          {
            tournamentId: childTournamentId,
            order: nextOrder,
            name: config.childPhaseName,
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
    phaseName: config.parentPhaseName,
    status: config.markParentCompleted ? 'completed' : parentTournament.status,
    updatedAt: now,
  };

  return { containerId, containers, updatedParent };
}

/**
 * Add a phase to an existing container if not already present
 */
export function addPhaseToContainer(
  containers: TournamentContainer[],
  containerId: string,
  tournamentId: string,
  phaseName: string
): TournamentContainer[] {
  const now = new Date().toISOString();

  return containers.map(c => {
    if (c.id !== containerId) return c;

    // Check if phase already exists
    const hasPhase = c.phases.some(p => p.tournamentId === tournamentId);
    if (hasPhase) return c;

    const nextOrder = Math.max(...c.phases.map(p => p.order), 0) + 1;
    return {
      ...c,
      phases: [
        ...c.phases,
        {
          tournamentId,
          order: nextOrder,
          name: phaseName,
        },
      ],
      updatedAt: now,
    };
  });
}

/**
 * Get the phase name for a tournament system
 */
export function getPhaseNameForSystem(system: string, phaseOrder: number): string {
  if (phaseOrder === 1) {
    switch (system) {
      case 'swiss':
        return 'Swiss Vorrunde';
      case 'round-robin':
        return 'Vorrunde';
      case 'group-phase':
      case 'beachl-all-placements':
      case 'beachl-short-main':
      case 'groups-only':
      case 'groups-full-placement':
      case 'groups-split-bracket':
      case 'groups-ssvb-knockout':
        return 'Gruppenphase';
      default:
        return 'Vorrunde';
    }
  }

  // Phase 2 names
  switch (system) {
    case 'playoff':
      return 'Finale';
    case 'placement-tree':
      return 'Platzierungsbaum';
    case 'short-main-knockout':
      return 'Hauptrunde';
    case 'knockout':
      return 'K.O.-Phase';
    default:
      return 'Hauptrunde';
  }
}

/**
 * Determine the knockout system type for a parent group system
 */
export function getKnockoutSystemForParent(
  parentSystem: string
): 'knockout' | 'placement-tree' | 'short-main-knockout' {
  switch (parentSystem) {
    case 'beachl-all-placements':
    case 'groups-full-placement':
      return 'placement-tree';
    case 'beachl-short-main':
    case 'groups-split-bracket':
      return 'short-main-knockout';
    default:
      return 'knockout';
  }
}

/**
 * Remove child phases from a container (for reset operations)
 */
export function removeChildPhases(
  containers: TournamentContainer[],
  containerId: string,
  keepTournamentId: string
): TournamentContainer[] {
  const now = new Date().toISOString();

  return containers.map(c => {
    if (c.id !== containerId) return c;
    return {
      ...c,
      phases: c.phases.filter(p => p.tournamentId === keepTournamentId),
      currentPhaseIndex: 0,
      status: 'in-progress' as const,
      updatedAt: now,
    };
  });
}

/**
 * Get tournament IDs from a container's phases
 */
export function getContainerTournamentIds(container: TournamentContainer): string[] {
  return container.phases.map(p => p.tournamentId);
}
