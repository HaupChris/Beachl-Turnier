/**
 * Hooks Module
 *
 * Custom React hooks for tournament management.
 */

// Main form hook (orchestrates all others)
export { useConfigureForm } from './useConfigureForm';

// Specialized hooks (extracted from useConfigureForm for better reusability)
export { useTeamHandlers } from './useTeamHandlers';
export { useGroupPhaseConfig } from './useGroupPhaseConfig';
export { useTimeEstimation } from './useTimeEstimation';
export {
  useTournamentLifecycle,
  type TournamentConfig,
  type GroupConfig,
  type PlayoffConfig,
} from './useTournamentLifecycle';
