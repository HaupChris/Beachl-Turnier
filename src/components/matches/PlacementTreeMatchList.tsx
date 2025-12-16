import type { Match, KnockoutRoundType } from '../../types/tournament';
import { MatchListSection } from './MatchListSection';
import { getPlacementRoundLabel } from '../../utils/placementTree/index';

interface PlacementTreeMatchListProps {
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
}

const PLACEMENT_TREE_ROUNDS: KnockoutRoundType[] = [
  'placement-round-1',
  'placement-round-2',
  'placement-round-3',
  'placement-round-4',
  'placement-final',
];

export function PlacementTreeMatchList({
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
}: PlacementTreeMatchListProps) {
  return (
    <>
      {PLACEMENT_TREE_ROUNDS.map(roundType => {
        const roundMatches = matches.filter(m => m.knockoutRound === roundType);
        return (
          <MatchListSection
            key={roundType}
            title={getPlacementRoundLabel(roundType)}
            matches={roundMatches}
            getTeamName={getTeamName}
            onMatchClick={onMatchClick}
            getScheduledTime={getScheduledTime}
            showDelayWarning={showDelayWarning}
            currentTimeMinutes={currentTimeMinutes}
            getPlayoffLabel={(match) => match.playoffForPlace ? `Platz ${match.playoffForPlace}` : undefined}
          />
        );
      })}
    </>
  );
}
