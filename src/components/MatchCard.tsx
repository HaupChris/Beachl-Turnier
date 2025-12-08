import type { Match } from '../types/tournament';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

interface MatchCardProps {
  match: Match;
  getTeamName: (teamId: string | null) => string;
  onClick?: () => void;
  playoffLabel?: string;
  scheduledTime?: string | null;
  refereeTeam?: string | null;
}

export function MatchCard({ match, getTeamName, onClick, playoffLabel, scheduledTime, refereeTeam }: MatchCardProps) {
  const getMatchStatus = (match: Match) => {
    if (match.status === 'completed') return { text: 'Beendet', color: 'bg-green-100 text-green-800', icon: 'check' as const };
    if (match.status === 'in-progress') return { text: 'Läuft', color: 'bg-yellow-100 text-yellow-800', icon: null };
    return { text: 'Geplant', color: 'bg-gray-100 text-gray-800', icon: 'calendar' as const };
  };

  const status = getMatchStatus(match);

  const isPlayoff = match.isPlayoff;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${
        match.status === 'completed'
          ? isPlayoff ? 'border-amber-500' : 'border-green-500'
          : match.status === 'in-progress'
          ? 'border-yellow-500'
          : isPlayoff
          ? 'border-amber-300 cursor-pointer hover:border-amber-500'
          : 'border-gray-300 cursor-pointer hover:border-sky-500'
      }`}
    >
      {playoffLabel && (
        <div className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded mb-2 inline-block">
          {playoffLabel}
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          {scheduledTime && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded inline-flex items-center gap-1">
              <ClockIcon />
              {scheduledTime}
            </span>
          )}
          {match.courtNumber && (
            <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">
              Feld {match.courtNumber}
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded ${status.color} inline-flex items-center gap-1`}>
            {status.icon === 'check' && <CheckIcon />}
            {status.icon === 'calendar' && <CalendarIcon />}
            {status.text}
          </span>
        </div>
        <span className="text-xs text-gray-400">#{match.matchNumber}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div
            className={`font-medium ${
              match.winnerId === match.teamAId ? 'text-green-700' : 'text-gray-800'
            }`}
          >
            {getTeamName(match.teamAId)}
          </div>
          <div
            className={`font-medium ${
              match.winnerId === match.teamBId ? 'text-green-700' : 'text-gray-800'
            }`}
          >
            {getTeamName(match.teamBId)}
          </div>
        </div>

        {match.scores.length > 0 && (
          <div className="text-right">
            {match.scores.map((score, i) => (
              <div key={i} className="text-sm font-mono">
                {score.teamA} - {score.teamB}
              </div>
            ))}
          </div>
        )}
      </div>

      {refereeTeam && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span className="font-medium">Schiedsgericht:</span> {refereeTeam}
        </div>
      )}
    </div>
  );
}
