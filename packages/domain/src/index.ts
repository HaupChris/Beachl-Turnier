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

export {
  MIN_ROUND_ROBIN_TEAMS,
  planRoundRobin,
  RECOMMENDED_MAX_ROUND_ROBIN_TEAMS,
  roundRobinFinalOrder,
} from './roundRobin/planRoundRobin';
export type {
  PlacementMatchPlan,
  RoundRobinMatch,
  RoundRobinOptions,
  RoundRobinPlan,
} from './roundRobin/planRoundRobin';
export { roundRobinRounds } from './roundRobin/roundRobinSchedule';
export type { SeedPair } from './roundRobin/roundRobinSchedule';

export { planFullPlacement } from './knockout/fullPlacement';
export { planSplitBracket } from './knockout/splitBracket';
export { resolveKnockout } from './knockout/resolveKnockout';
export type { KnockoutResolution, KnockoutState, ResolvedMatch } from './knockout/resolveKnockout';
export { formatSlot, formatStage } from './knockout/labels';
export type {
  BracketSection,
  KnockoutInput,
  KnockoutMatch,
  KnockoutPlan,
  MatchStage,
  PlacementEntry,
  SlotSource,
} from './knockout/types';

export { defaultMatchDuration } from './schedule/durations';
export {
  assignGroupCourts,
  scheduleGroupPhase,
  scheduleRoundRobin,
} from './schedule/groupSchedule';
export { scheduleKnockout, scheduleRoundRobinPlacements } from './schedule/knockoutSchedule';
export type {
  Minutes,
  PhaseScheduleOptions,
  ScheduledMatch,
  ScheduledReferee,
} from './schedule/types';

export {
  areaSettings,
  createTournament,
  deriveTournament,
  parseTournament,
  serializeTournament,
  undoLastEvent,
  validateConfig,
} from './tournament/document';
export type { Outcome } from './tournament/document';
export {
  changeReferee,
  decideRockPaperScissors,
  enterResult,
  revertWithdrawal,
  withdrawTeam,
} from './tournament/commands';
export type {
  AreaSettings,
  TournamentConfig,
  TournamentDocument,
  TournamentEvent,
  TournamentFormat,
} from './tournament/types';
export type {
  GroupView,
  MatchPhase,
  MatchStatus,
  MatchView,
  TournamentView,
  WithdrawalView,
} from './tournament/view';
