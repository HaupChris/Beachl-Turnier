/**
 * Unified Match List Component
 *
 * A single configurable component that replaces:
 * - RegularMatchList
 * - KnockoutMatchList
 * - GroupPhaseMatchList
 * - ShortMainMatchList
 * - PlacementTreeMatchList
 *
 * Uses a grouping strategy pattern to handle different tournament types.
 */

import type { Match, Group, KnockoutRoundType } from '../../types/tournament';
import { MatchListSection } from './MatchListSection';
import {
  getKnockoutRoundLabel,
  getShortMainRoundLabel,
  getPlacementRoundLabel,
  getPlayoffMatchLabel,
  filterPlayableMatches,
} from '../../domain';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A section of matches to render
 */
interface MatchSection {
  key: string;
  title: string;
  matches: Match[];
  titleColorClass?: string;
}

/**
 * Grouping strategy for organizing matches
 */
export type GroupingStrategy =
  | { type: 'by-round' }
  | { type: 'by-knockout-round'; rounds: KnockoutRoundType[]; labelFn: (round: KnockoutRoundType) => string }
  | { type: 'by-group'; groups: Group[] };

/**
 * Base props shared by all match list variants
 */
interface BaseMatchListProps {
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
  getRefereeTeam?: (match: Match) => string | null;
}

/**
 * Props for UnifiedMatchList
 */
export interface UnifiedMatchListProps extends BaseMatchListProps {
  grouping: GroupingStrategy;
}

// =============================================================================
// ROUND DEFINITIONS
// =============================================================================

export const KNOCKOUT_ROUNDS: KnockoutRoundType[] = [
  'intermediate',
  'round-of-16',
  'quarterfinal',
  'semifinal',
  'third-place',
  'final',
];

export const SHORT_MAIN_ROUNDS: KnockoutRoundType[] = [
  'qualification',
  'placement-13-16',
  'top-quarterfinal',
  'placement-9-12',
  'top-semifinal',
  'placement-5-8',
  'third-place',
  'top-final',
  'placement-block',
];

export const PLACEMENT_TREE_ROUNDS: KnockoutRoundType[] = [
  'placement-round-1',
  'placement-round-2',
  'placement-round-3',
  'placement-round-4',
  'placement-final',
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Unified match list that handles all tournament types
 */
export function UnifiedMatchList({
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
  getRefereeTeam,
  grouping,
}: UnifiedMatchListProps) {
  const sections = createSections(filterPlayableMatches(matches), grouping);

  return (
    <>
      {sections.map(section => (
        <MatchListSection
          key={section.key}
          title={section.title}
          matches={section.matches}
          getTeamName={getTeamName}
          onMatchClick={onMatchClick}
          getScheduledTime={getScheduledTime}
          showDelayWarning={showDelayWarning}
          currentTimeMinutes={currentTimeMinutes}
          getRefereeTeam={getRefereeTeam}
          titleColorClass={section.titleColorClass}
          getPlayoffLabel={getPlayoffLabel}
        />
      ))}
    </>
  );
}

// =============================================================================
// SECTION CREATORS
// =============================================================================

/**
 * Create sections based on grouping strategy
 */
function createSections(matches: Match[], grouping: GroupingStrategy): MatchSection[] {
  switch (grouping.type) {
    case 'by-round':
      return createRoundSections(matches);
    case 'by-knockout-round':
      return createKnockoutSections(matches, grouping.rounds, grouping.labelFn);
    case 'by-group':
      return createGroupSections(matches, grouping.groups);
  }
}

/**
 * Create sections grouped by round number (for round-robin/swiss)
 */
function createRoundSections(matches: Match[]): MatchSection[] {
  const rounds = Array.from(new Set(matches.map(m => m.round)))
    .filter((r): r is number => r !== undefined)
    .sort((a, b) => a - b);

  return rounds.map(round => {
    const roundMatches = matches.filter(m => m.round === round);
    const isPlayoffRound = roundMatches.some(m => m.isPlayoff);

    return {
      key: String(round),
      title: isPlayoffRound ? '🏅 Finale Platzierungen' : `Runde ${round}`,
      matches: roundMatches,
      titleColorClass: isPlayoffRound ? 'text-amber-700' : 'text-gray-600',
    };
  });
}

/**
 * Create sections grouped by knockout round type
 */
function createKnockoutSections(
  matches: Match[],
  rounds: KnockoutRoundType[],
  labelFn: (round: KnockoutRoundType) => string
): MatchSection[] {
  return rounds.map(roundType => ({
    key: roundType,
    title: labelFn(roundType),
    matches: matches.filter(m => m.knockoutRound === roundType),
  }));
}

/**
 * Create sections grouped by group ID
 */
function createGroupSections(matches: Match[], groups: Group[]): MatchSection[] {
  return groups.map(group => ({
    key: group.id,
    title: group.name,
    matches: matches.filter(m => m.groupId === group.id),
  }));
}

// =============================================================================
// LABEL HELPERS
// =============================================================================

/**
 * Get playoff label for a match
 */
function getPlayoffLabel(match: Match): string | undefined {
  if (match.isPlayoff && match.playoffForPlace) {
    return getPlayoffMatchLabel(match.playoffForPlace);
  }
  if (match.playoffForPlace) {
    return `Platz ${match.playoffForPlace}`;
  }
  return undefined;
}

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

/**
 * Match list for round-robin/swiss tournaments
 */
export function RoundMatchList(props: BaseMatchListProps) {
  return <UnifiedMatchList {...props} grouping={{ type: 'by-round' }} />;
}

/**
 * Match list for SSVB knockout format
 */
export function KnockoutRoundMatchList(props: BaseMatchListProps) {
  return (
    <UnifiedMatchList
      {...props}
      grouping={{
        type: 'by-knockout-round',
        rounds: KNOCKOUT_ROUNDS,
        labelFn: getKnockoutRoundLabel,
      }}
    />
  );
}

/**
 * Match list for group phase
 */
export function GroupMatchList(props: BaseMatchListProps & { groups: Group[] }) {
  const { groups, ...rest } = props;
  return <UnifiedMatchList {...rest} grouping={{ type: 'by-group', groups }} />;
}

/**
 * Match list for short main round format
 */
export function ShortMainRoundMatchList(props: BaseMatchListProps) {
  return (
    <UnifiedMatchList
      {...props}
      grouping={{
        type: 'by-knockout-round',
        rounds: SHORT_MAIN_ROUNDS,
        labelFn: getShortMainRoundLabel,
      }}
    />
  );
}

/**
 * Match list for placement tree format
 */
export function PlacementTreeRoundMatchList(props: BaseMatchListProps) {
  return (
    <UnifiedMatchList
      {...props}
      grouping={{
        type: 'by-knockout-round',
        rounds: PLACEMENT_TREE_ROUNDS,
        labelFn: getPlacementRoundLabel,
      }}
    />
  );
}
