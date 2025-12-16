import type { Match } from '../../types/tournament';
import { MatchListSection } from './MatchListSection';
import { getPlayoffMatchLabel } from '../../utils/playoff';

interface RegularMatchListProps {
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
}

export function RegularMatchList({
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
}: RegularMatchListProps) {
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <>
      {rounds.map(round => {
        const roundMatches = matches.filter(m => m.round === round);
        const isPlayoffRound = roundMatches.some(m => m.isPlayoff);
        return (
          <MatchListSection
            key={round}
            title={isPlayoffRound ? '🏅 Finale Platzierungen' : `Runde ${round}`}
            matches={roundMatches}
            getTeamName={getTeamName}
            onMatchClick={onMatchClick}
            getScheduledTime={getScheduledTime}
            showDelayWarning={showDelayWarning}
            currentTimeMinutes={currentTimeMinutes}
            titleColorClass={isPlayoffRound ? 'text-amber-700' : 'text-gray-600'}
            getPlayoffLabel={(match) =>
              match.isPlayoff && match.playoffForPlace
                ? getPlayoffMatchLabel(match.playoffForPlace)
                : undefined
            }
          />
        );
      })}
    </>
  );
}
