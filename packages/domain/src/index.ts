/**
 * Öffentliche Schnittstelle der Fachlogik.
 *
 * Fachliche Anforderungen: docs/schedules/README.md
 * Architektur: docs/architecture.md
 */
export type { MatchId, SetFormat, SetFormatKind, SetScore, Team, TeamId } from './model/types';
export { formatPlace } from './placeDisplay';

export { evaluateResult } from './results/evaluateResult';
export type { ResultEvaluation, ResultSummary } from './results/evaluateResult';

export {
  MAX_GROUP_PHASE_TEAMS,
  MIN_GROUP_PHASE_TEAMS,
  planGroupLayout,
} from './groups/groupLayout';
export type { GroupCount, GroupLayout } from './groups/groupLayout';
export { groupMatchOrder } from './groups/groupMatchOrder';
export type { GroupMatchTemplate, RefereeRule } from './groups/groupMatchOrder';
export { planGroupPhase } from './groups/planGroupPhase';
export type { Group, GroupMatch, GroupPhasePlan, RefereeAssignment } from './groups/planGroupPhase';
export { groupName, snakePosition } from './groups/snake';
export type { SnakePosition } from './groups/snake';

export { computeGroupStandings } from './standings/groupStandings';
export type { GroupStandings, StandingRow, StandingsInput } from './standings/groupStandings';
export type { CompletedMatch, Tally } from './standings/tally';
