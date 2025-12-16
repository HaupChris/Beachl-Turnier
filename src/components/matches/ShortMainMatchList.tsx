import type { Match, KnockoutRoundType } from '../../types/tournament';
import { MatchListSection } from './MatchListSection';
import { getShortMainRoundLabel } from '../../utils/shortMainRound';
import { getPlayoffMatchLabel } from '../../utils/playoff';

interface ShortMainMatchListProps {
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
}

const SHORT_MAIN_ROUNDS: KnockoutRoundType[] = [
  'qualification',
  'placement-13-16',
  'top-quarterfinal',
  'placement-9-12',
  'top-semifinal',
  'placement-5-8',
  'third-place',
  'top-final',
];

export function ShortMainMatchList({
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
}: ShortMainMatchListProps) {
  return (
    <>
      {SHORT_MAIN_ROUNDS.map(roundType => {
        const roundMatches = matches.filter(m => m.knockoutRound === roundType);
        return (
          <MatchListSection
            key={roundType}
            title={getShortMainRoundLabel(roundType)}
            matches={roundMatches}
            getTeamName={getTeamName}
            onMatchClick={onMatchClick}
            getScheduledTime={getScheduledTime}
            showDelayWarning={showDelayWarning}
            currentTimeMinutes={currentTimeMinutes}
            getPlayoffLabel={(match) => match.playoffForPlace ? getPlayoffMatchLabel(match.playoffForPlace) : undefined}
          />
        );
      })}
    </>
  );
}
