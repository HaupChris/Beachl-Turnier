/* eslint-disable max-lines */
import { v4 as uuidv4 } from 'uuid';
import type { Tournament, TournamentContainer, GroupPhaseConfig } from '../types/tournament';
import type { TournamentState, TournamentAction } from './tournamentActions';
import { generateSwissRoundMatches } from '../utils/swissSystem';
import { generateRoundRobinMatches } from '../utils/roundRobin';
import { calculateStandings } from '../utils/standings';
import { generatePlayoffTournament } from '../utils/playoff';
import { generateGroups, generateGroupPhaseMatches, calculateAllGroupStandings } from '../utils/groupPhase';
import { generateKnockoutTournament, generateKnockoutTournamentPlaceholder, populateKnockoutTeams, updateKnockoutBracket } from '../utils/knockout';
import { assignAllKnockoutReferees, updateRefereeAssignmentsAfterRound } from '../utils/refereeAssignment';

export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'CREATE_TOURNAMENT': {
      const config = action.payload;
      const teams = config.teams.map((t, index) => ({
        ...t,
        id: uuidv4(),
        seedPosition: index + 1,
      }));

      const now = new Date().toISOString();
      const tournamentId = uuidv4();
      const containerId = uuidv4();

      // Determine phase name based on system
      const phaseName = config.system === 'swiss'
        ? 'Swiss Vorrunde'
        : config.system === 'round-robin'
          ? 'Vorrunde'
          : config.system === 'group-phase'
            ? 'Gruppenphase'
            : 'Hauptrunde';

      // Generate group phase config if applicable
      let groupPhaseConfig: GroupPhaseConfig | undefined;
      if (config.system === 'group-phase' && config.groupPhaseConfig) {
        const groups = generateGroups(
          teams,
          config.groupPhaseConfig.numberOfGroups,
          config.groupPhaseConfig.seeding
        );
        groupPhaseConfig = {
          ...config.groupPhaseConfig,
          groups,
        };
      }

      const newTournament: Tournament = {
        id: tournamentId,
        name: config.name,
        system: config.system,
        numberOfCourts: config.numberOfCourts,
        setsPerMatch: config.setsPerMatch,
        pointsPerSet: config.pointsPerSet,
        pointsPerThirdSet: config.pointsPerThirdSet,
        tiebreakerOrder: config.tiebreakerOrder,
        numberOfRounds: config.numberOfRounds,
        scheduling: config.scheduling,
        teams,
        matches: [],
        standings: teams.map(t => ({
          teamId: t.id,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
        })),
        currentRound: config.system === 'swiss' ? 0 : undefined,
        status: 'configuration',
        createdAt: now,
        updatedAt: now,
        // Always assign to a container
        containerId,
        phaseOrder: 1,
        phaseName,
        // Group phase specific
        groupPhaseConfig,
        // Knockout specific
        knockoutConfig: config.knockoutConfig,
        knockoutSettings: config.knockoutSettings,
      };

      // Create container for this tournament
      const newContainer: TournamentContainer = {
        id: containerId,
        name: config.name,
        phases: [
          {
            tournamentId,
            order: 1,
            name: phaseName,
          },
        ],
        currentPhaseIndex: 0,
        status: 'in-progress',
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        tournaments: [...state.tournaments, newTournament],
        containers: [...(state.containers || []), newContainer],
        currentTournamentId: newTournament.id,
      };
    }

    case 'SET_CURRENT_TOURNAMENT':
      return { ...state, currentTournamentId: action.payload };

    case 'UPDATE_TEAMS': {
      return {
        ...state,
        tournaments: state.tournaments.map(t =>
          t.id === action.payload.tournamentId
            ? { ...t, teams: action.payload.teams, updatedAt: new Date().toISOString() }
            : t
        ),
      };
    }

    case 'UPDATE_TOURNAMENT_SETTINGS': {
      const settings = action.payload;
      const tournament = state.tournaments.find(t => t.id === settings.tournamentId);

      // Determine new phase name based on system
      const phaseName = settings.system === 'swiss'
        ? 'Swiss Vorrunde'
        : settings.system === 'round-robin'
          ? 'Vorrunde'
          : 'Hauptrunde';

      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== settings.tournamentId) return t;
          // Only allow updates if tournament is in configuration status
          if (t.status !== 'configuration') return t;

          return {
            ...t,
            name: settings.name,
            system: settings.system,
            numberOfCourts: settings.numberOfCourts,
            setsPerMatch: settings.setsPerMatch,
            pointsPerSet: settings.pointsPerSet,
            pointsPerThirdSet: settings.pointsPerThirdSet,
            tiebreakerOrder: settings.tiebreakerOrder,
            numberOfRounds: settings.numberOfRounds,
            scheduling: settings.scheduling,
            phaseName,
            updatedAt: new Date().toISOString(),
          };
        }),
        // Update container name if tournament name changed
        containers: (state.containers || []).map(c => {
          if (c.id !== tournament?.containerId) return c;
          return {
            ...c,
            name: settings.name,
            phases: c.phases.map(p =>
              p.tournamentId === settings.tournamentId
                ? { ...p, name: phaseName }
                : p
            ),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'START_TOURNAMENT': {
      const tournamentToStart = state.tournaments.find(t => t.id === action.payload);
      if (!tournamentToStart) return state;

      const now = new Date().toISOString();
      let newTournaments = state.tournaments;
      let newContainers = state.containers || [];

      // Process the tournament start
      newTournaments = newTournaments.map(t => {
        if (t.id !== action.payload) return t;

        let matches = t.matches;
        let currentRound = t.currentRound;
        let groupStandings = t.groupStandings;

        if (t.system === 'round-robin') {
          matches = generateRoundRobinMatches(t.teams, t.numberOfCourts);
        } else if (t.system === 'swiss') {
          matches = generateSwissRoundMatches(t.teams, t.standings, [], 1, t.numberOfCourts);
          currentRound = 1;
        } else if (t.system === 'group-phase' && t.groupPhaseConfig) {
          // Generate group phase matches
          matches = generateGroupPhaseMatches(t.groupPhaseConfig, t.teams, t.numberOfCourts);
          // Initialize group standings
          groupStandings = t.groupPhaseConfig.groups.flatMap(group =>
            group.teamIds.map((teamId, index) => ({
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

      // For group-phase tournaments with knockout settings, create knockout phase immediately
      if (tournamentToStart.system === 'group-phase' && tournamentToStart.knockoutSettings) {
        const updatedGroupPhase = newTournaments.find(t => t.id === action.payload);
        if (updatedGroupPhase) {
          // Generate placeholder knockout tournament
          const { tournament: knockoutTournament } = generateKnockoutTournamentPlaceholder(
            updatedGroupPhase,
            tournamentToStart.knockoutSettings
          );

          // Create knockout tournament with proper references
          const containerId = updatedGroupPhase.containerId || uuidv4();
          const knockoutWithRefs: Tournament = {
            ...knockoutTournament,
            containerId,
            phaseOrder: 2,
            phaseName: 'K.O.-Phase',
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
                    name: 'K.O.-Phase',
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

    case 'RESET_TOURNAMENT': {
      const tournamentToReset = state.tournaments.find(t => t.id === action.payload);
      if (!tournamentToReset) return state;

      let newTournaments = state.tournaments;
      let newContainers = state.containers || [];

      if (tournamentToReset.containerId) {
        const container = newContainers.find(c => c.id === tournamentToReset.containerId);
        if (container) {
          // Remove all child phases (like finals tournaments) but keep the main tournament
          const childPhaseIds = container.phases
            .filter(p => p.tournamentId !== tournamentToReset.id)
            .map(p => p.tournamentId);

          newTournaments = newTournaments.filter(t => !childPhaseIds.includes(t.id));

          // Update container to only have the main phase
          newContainers = newContainers.map(c => {
            if (c.id !== tournamentToReset.containerId) return c;
            return {
              ...c,
              phases: c.phases.filter(p => p.tournamentId === tournamentToReset.id),
              currentPhaseIndex: 0,
              status: 'in-progress' as const,
              updatedAt: new Date().toISOString(),
            };
          });
        }
      }

      // Reset the tournament to configuration state
      newTournaments = newTournaments.map(t => {
        if (t.id !== action.payload) return t;

        // Reset standings for all teams
        const resetStandings = t.teams.map(team => ({
          teamId: team.id,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
        }));

        return {
          ...t,
          matches: [],
          standings: resetStandings,
          currentRound: t.system === 'swiss' ? 0 : undefined,
          status: 'configuration' as const,
          // Keep container reference but remove parent phase reference
          parentPhaseId: undefined,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...state,
        tournaments: newTournaments,
        containers: newContainers,
      };
    }

    case 'UPDATE_MATCH_SCORE': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload.tournamentId) return t;

          const updatedMatches = t.matches.map(m =>
            m.id === action.payload.matchId
              ? { ...m, scores: action.payload.scores, status: 'in-progress' as const }
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

    case 'COMPLETE_MATCH': {
      const now = new Date().toISOString();
      let newTournaments = state.tournaments;

      // First, process the match completion
      newTournaments = newTournaments.map(t => {
        if (t.id !== action.payload.tournamentId) return t;

        let updatedMatches = t.matches.map(m => {
          if (m.id !== action.payload.matchId) return m;

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
          updatedMatches = updateKnockoutBracket(updatedMatches, action.payload.matchId);

          // Check if a round is complete and assign referees for next round
          const completedMatch = updatedMatches.find(m => m.id === action.payload.matchId);
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

        // Calculate standings based on tournament type
        let standings = t.standings;
        let groupStandings = t.groupStandings;

        if (t.system === 'group-phase' && t.groupPhaseConfig) {
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
      const completedTournament = newTournaments.find(t => t.id === action.payload.tournamentId);
      if (
        completedTournament &&
        completedTournament.system === 'group-phase' &&
        completedTournament.status === 'completed' &&
        completedTournament.groupStandings
      ) {
        // Find the child knockout tournament
        const knockoutTournament = newTournaments.find(
          t => t.parentPhaseId === completedTournament.id && t.system === 'knockout'
        );

        if (knockoutTournament && knockoutTournament.teams.length === 0) {
          // Populate knockout teams from group standings
          const { tournament: populatedKnockout, eliminatedTeamIds } = populateKnockoutTeams(
            knockoutTournament,
            completedTournament,
            completedTournament.groupStandings
          );

          // Assign referees if enabled
          let knockoutMatches = populatedKnockout.matches;
          if (knockoutTournament.knockoutConfig?.useReferees && completedTournament.groupStandings) {
            knockoutMatches = assignAllKnockoutReferees(
              knockoutMatches,
              completedTournament.matches,
              completedTournament.groupStandings,
              eliminatedTeamIds
            );
          }

          // Update the knockout tournament
          newTournaments = newTournaments.map(t => {
            if (t.id !== knockoutTournament.id) return t;
            return {
              ...populatedKnockout,
              matches: knockoutMatches,
              eliminatedTeamIds,
            };
          });
        }
      }

      return {
        ...state,
        tournaments: newTournaments,
      };
    }

    case 'DELETE_TOURNAMENT': {
      const tournamentToDelete = state.tournaments.find(t => t.id === action.payload);
      if (!tournamentToDelete) return state;

      // If tournament is part of a container, delete the entire container
      if (tournamentToDelete.containerId) {
        const container = (state.containers || []).find(c => c.id === tournamentToDelete.containerId);
        if (container) {
          const tournamentIdsToDelete = container.phases.map(p => p.tournamentId);
          const newTournaments = state.tournaments.filter(
            t => !tournamentIdsToDelete.includes(t.id)
          );
          return {
            ...state,
            tournaments: newTournaments,
            containers: (state.containers || []).filter(c => c.id !== tournamentToDelete.containerId),
            currentTournamentId: state.currentTournamentId && tournamentIdsToDelete.includes(state.currentTournamentId)
              ? (newTournaments.length > 0 ? newTournaments[0].id : null)
              : state.currentTournamentId,
          };
        }
      }

      // Single tournament deletion (no container)
      const newTournaments = state.tournaments.filter(t => t.id !== action.payload);
      return {
        ...state,
        tournaments: newTournaments,
        currentTournamentId: state.currentTournamentId === action.payload
          ? (newTournaments.length > 0 ? newTournaments[0].id : null)
          : state.currentTournamentId,
      };
    }

    case 'GENERATE_NEXT_SWISS_ROUND': {
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== action.payload) return t;
          if (t.system !== 'swiss') return t;

          const currentRound = t.currentRound || 0;
          const nextRound = currentRound + 1;

          if (t.numberOfRounds && nextRound > t.numberOfRounds) {
            return { ...t, status: 'completed', updatedAt: new Date().toISOString() };
          }

          const newMatches = generateSwissRoundMatches(
            t.teams,
            t.standings,
            t.matches,
            nextRound,
            t.numberOfCourts
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

    case 'CREATE_FINALS_TOURNAMENT': {
      const { parentTournamentId, settings } = action.payload;
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

    case 'SET_CURRENT_PHASE': {
      const { containerId, phaseIndex } = action.payload;
      const container = (state.containers || []).find(c => c.id === containerId);
      if (!container || phaseIndex < 0 || phaseIndex >= container.phases.length) {
        return state;
      }

      const phase = container.phases[phaseIndex];

      return {
        ...state,
        containers: (state.containers || []).map(c =>
          c.id === containerId
            ? { ...c, currentPhaseIndex: phaseIndex, updatedAt: new Date().toISOString() }
            : c
        ),
        currentTournamentId: phase.tournamentId,
      };
    }

    case 'DELETE_CONTAINER': {
      const containerId = action.payload;
      const container = (state.containers || []).find(c => c.id === containerId);
      if (!container) return state;

      // Delete all tournaments in the container
      const tournamentIdsToDelete = container.phases.map(p => p.tournamentId);
      const newTournaments = state.tournaments.filter(
        t => !tournamentIdsToDelete.includes(t.id)
      );

      return {
        ...state,
        tournaments: newTournaments,
        containers: (state.containers || []).filter(c => c.id !== containerId),
        currentTournamentId: state.currentTournamentId && tournamentIdsToDelete.includes(state.currentTournamentId)
          ? (newTournaments.length > 0 ? newTournaments[0].id : null)
          : state.currentTournamentId,
      };
    }

    case 'UPDATE_GROUPS': {
      const { tournamentId, groups } = action.payload;
      return {
        ...state,
        tournaments: state.tournaments.map(t => {
          if (t.id !== tournamentId) return t;
          if (t.system !== 'group-phase' || !t.groupPhaseConfig) return t;

          return {
            ...t,
            groupPhaseConfig: {
              ...t.groupPhaseConfig,
              groups,
              seeding: 'manual' as const, // Mark as manually adjusted
            },
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'CREATE_KNOCKOUT_TOURNAMENT': {
      const { parentTournamentId, settings } = action.payload;
      const parentTournament = state.tournaments.find(t => t.id === parentTournamentId);

      if (!parentTournament || parentTournament.system !== 'group-phase') return state;
      if (!parentTournament.groupPhaseConfig || !parentTournament.groupStandings) return state;

      // Check if knockout already exists
      const existingKnockout = state.tournaments.find(
        t => t.parentPhaseId === parentTournamentId && t.system === 'knockout'
      );
      if (existingKnockout) return state;

      // Generate the knockout tournament
      const { tournament: knockoutTournament, teams: knockoutTeams, eliminatedTeamIds } = generateKnockoutTournament(
        parentTournament,
        parentTournament.groupStandings,
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
              name: 'Gruppenphase',
            },
            {
              tournamentId: knockoutTournament.id,
              order: 2,
              name: 'K.O.-Phase',
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
                name: 'K.O.-Phase',
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

      // Assign initial referees if enabled
      let knockoutMatches = knockoutTournament.matches;
      if (settings.useReferees && parentTournament.groupStandings) {
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
        phaseName: 'K.O.-Phase',
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

    default:
      return state;
  }
}
