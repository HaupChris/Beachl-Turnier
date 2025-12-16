import { v4 as uuidv4 } from 'uuid';
import type { Tournament, Group } from '../../types/tournament';
import type { TournamentState } from '../tournamentActions';
import { generateSwissRoundMatches } from '../../utils/swissSystem';
import { generateRoundRobinMatches } from '../../utils/roundRobin';
import { generateGroupPhaseMatches } from '../../utils/groupPhase';
import { generatePlayoffTournamentPlaceholder } from '../../utils/playoff';
import { generateKnockoutTournamentPlaceholder } from '../../utils/knockout';
import { generatePlacementTreeTournamentPlaceholder } from '../../utils/placementTree/index';
import { generateShortMainRoundTournamentPlaceholder } from '../../utils/shortMainRound';
import { isGroupBasedSystem } from './helpers';

export function handleStartTournament(
  state: TournamentState,
  tournamentId: string
): TournamentState {
  const tournamentToStart = state.tournaments.find(t => t.id === tournamentId);
  if (!tournamentToStart) return state;

  const now = new Date().toISOString();
  let newTournaments = state.tournaments;
  let newContainers = state.containers || [];

  // Process the tournament start
  newTournaments = newTournaments.map(t => {
    if (t.id !== tournamentId) return t;

    let matches = t.matches;
    let currentRound = t.currentRound;
    let groupStandings = t.groupStandings;

    if (t.system === 'round-robin') {
      matches = generateRoundRobinMatches(t.teams, t.numberOfCourts);
    } else if (t.system === 'swiss') {
      matches = generateSwissRoundMatches(t.teams, t.standings, [], 1, t.numberOfCourts);
      currentRound = 1;
    } else if (isGroupBasedSystem(t.system) && t.groupPhaseConfig) {
      // Generate group phase matches (for all group-based systems)
      matches = generateGroupPhaseMatches(t.groupPhaseConfig, t.teams, t.numberOfCourts);
      // Initialize group standings
      groupStandings = t.groupPhaseConfig.groups.flatMap((group: Group) =>
        group.teamIds.map((teamId: string, index: number) => ({
          teamId,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
          groupId: group.id,
          groupRank: index + 1,
        }))
      );
    }

    return {
      ...t,
      matches,
      currentRound,
      groupStandings,
      status: 'in-progress',
      updatedAt: now,
    };
  });

  // For all group-based tournaments with knockout settings, create knockout phase immediately
  if (isGroupBasedSystem(tournamentToStart.system) && tournamentToStart.knockoutSettings) {
    const updatedGroupPhase = newTournaments.find(t => t.id === tournamentId);
    if (updatedGroupPhase) {
      let knockoutTournament: Tournament;
      let phase2Name: string;

      // Generate the appropriate knockout placeholder based on parent system
      if (tournamentToStart.system === 'beachl-short-main') {
        const result = generateShortMainRoundTournamentPlaceholder(
          updatedGroupPhase,
          tournamentToStart.knockoutSettings
        );
        knockoutTournament = result.tournament;
        phase2Name = 'Hauptrunde';
      } else if (tournamentToStart.system === 'beachl-all-placements') {
        const result = generatePlacementTreeTournamentPlaceholder(
          updatedGroupPhase,
          tournamentToStart.knockoutSettings
        );
        knockoutTournament = result.tournament;
        phase2Name = 'Platzierungsbaum';
      } else {
        // Default: SSVB knockout format (group-phase)
        const result = generateKnockoutTournamentPlaceholder(
          updatedGroupPhase,
          tournamentToStart.knockoutSettings
        );
        knockoutTournament = result.tournament;
        phase2Name = 'K.O.-Phase';
      }

      // Create knockout tournament with proper references
      const containerId = updatedGroupPhase.containerId || uuidv4();
      const knockoutWithRefs: Tournament = {
        ...knockoutTournament,
        containerId,
        phaseOrder: 2,
        phaseName: phase2Name,
        parentPhaseId: updatedGroupPhase.id,
      };

      // Add knockout to tournaments
      newTournaments = [...newTournaments, knockoutWithRefs];

      // Update container to include knockout phase
      const existingContainer = newContainers.find(c => c.id === containerId);
      if (existingContainer) {
        newContainers = newContainers.map(c => {
          if (c.id !== containerId) return c;
          // Check if knockout phase already exists
          const hasKnockout = c.phases.some(p => p.tournamentId === knockoutWithRefs.id);
          if (hasKnockout) return c;
          return {
            ...c,
            phases: [
              ...c.phases,
              {
                tournamentId: knockoutWithRefs.id,
                order: 2,
                name: phase2Name,
              },
            ],
            updatedAt: now,
          };
        });
      }
    }
  }

  // For round-robin with knockoutSettings (playoff enabled), create playoff phase immediately
  if (tournamentToStart.system === 'round-robin' && tournamentToStart.knockoutSettings) {
    const updatedRoundRobin = newTournaments.find(t => t.id === tournamentId);
    if (updatedRoundRobin) {
      const result = generatePlayoffTournamentPlaceholder(
        updatedRoundRobin,
        tournamentToStart.knockoutSettings
      );
      const playoffTournament = result.tournament;

      // Create playoff tournament with proper references
      const containerId = updatedRoundRobin.containerId || uuidv4();
      const playoffWithRefs: Tournament = {
        ...playoffTournament,
        containerId,
        phaseOrder: 2,
        phaseName: 'Finale',
        parentPhaseId: updatedRoundRobin.id,
      };

      // Add playoff to tournaments
      newTournaments = [...newTournaments, playoffWithRefs];

      // Update container to include playoff phase
      const existingContainer = newContainers.find(c => c.id === containerId);
      if (existingContainer) {
        newContainers = newContainers.map(c => {
          if (c.id !== containerId) return c;
          const hasPlayoff = c.phases.some(p => p.tournamentId === playoffWithRefs.id);
          if (hasPlayoff) return c;
          return {
            ...c,
            phases: [
              ...c.phases,
              {
                tournamentId: playoffWithRefs.id,
                order: 2,
                name: 'Finale',
              },
            ],
            updatedAt: now,
          };
        });
      }
    }
  }

  return {
    ...state,
    tournaments: newTournaments,
    containers: newContainers,
  };
}
