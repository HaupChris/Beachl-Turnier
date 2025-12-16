import type { Match } from '../../types/tournament';
import { MatchCard } from '../MatchCard';

interface MatchListSectionProps {
  title: string;
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
  getPlayoffLabel?: (match: Match) => string | undefined;
  getRefereeTeam?: (match: Match) => string | null;
  titleColorClass?: string;
}

export function MatchListSection({
  title,
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
  getPlayoffLabel,
  getRefereeTeam,
  titleColorClass = 'text-sky-700',
}: MatchListSectionProps) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold uppercase tracking-wide ${titleColorClass}`}>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            getTeamName={getTeamName}
            onClick={() => onMatchClick(match)}
            playoffLabel={getPlayoffLabel?.(match)}
            scheduledTime={getScheduledTime(match)}
            refereeTeam={getRefereeTeam?.(match) ?? undefined}
            showDelayWarning={showDelayWarning}
            currentTimeMinutes={currentTimeMinutes}
          />
        ))}
      </div>
    </div>
  );
}
