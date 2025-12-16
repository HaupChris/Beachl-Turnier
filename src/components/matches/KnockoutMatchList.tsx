import type { Match, KnockoutRoundType } from '../../types/tournament';
import { MatchListSection } from './MatchListSection';
import { getKnockoutRoundLabel } from '../../utils/knockout';
import { getPlayoffMatchLabel } from '../../utils/playoff';

interface KnockoutMatchListProps {
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
  getRefereeTeam: (match: Match) => string | null;
}

const KNOCKOUT_ROUNDS: KnockoutRoundType[] = [
  'intermediate',
  'quarterfinal',
  'semifinal',
  'third-place',
  'final',
];

export function KnockoutMatchList({
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
  getRefereeTeam,
}: KnockoutMatchListProps) {
  return (
    <>
      {KNOCKOUT_ROUNDS.map(roundType => {
        const roundMatches = matches.filter(m => m.knockoutRound === roundType);
        return (
          <MatchListSection
            key={roundType}
            title={getKnockoutRoundLabel(roundType)}
            matches={roundMatches}
            getTeamName={getTeamName}
            onMatchClick={onMatchClick}
            getScheduledTime={getScheduledTime}
            showDelayWarning={showDelayWarning}
            currentTimeMinutes={currentTimeMinutes}
            getRefereeTeam={getRefereeTeam}
            getPlayoffLabel={(match) => match.playoffForPlace ? getPlayoffMatchLabel(match.playoffForPlace) : undefined}
          />
        );
      })}
    </>
  );
}
