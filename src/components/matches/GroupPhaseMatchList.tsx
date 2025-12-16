import type { Match, Group } from '../../types/tournament';
import { MatchListSection } from './MatchListSection';

interface GroupPhaseMatchListProps {
  groups: Group[];
  matches: Match[];
  getTeamName: (teamId: string | null) => string;
  onMatchClick: (match: Match) => void;
  getScheduledTime: (match: Match) => string | null;
  showDelayWarning: boolean;
  currentTimeMinutes: number;
}

export function GroupPhaseMatchList({
  groups,
  matches,
  getTeamName,
  onMatchClick,
  getScheduledTime,
  showDelayWarning,
  currentTimeMinutes,
}: GroupPhaseMatchListProps) {
  return (
    <>
      {groups.map(group => {
        const groupMatches = matches.filter(m => m.groupId === group.id);
        return (
          <MatchListSection
            key={group.id}
            title={group.name}
            matches={groupMatches}
            getTeamName={getTeamName}
            onMatchClick={onMatchClick}
            getScheduledTime={getScheduledTime}
            showDelayWarning={showDelayWarning}
            currentTimeMinutes={currentTimeMinutes}
          />
        );
      })}
    </>
  );
}
