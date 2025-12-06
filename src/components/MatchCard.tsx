import type { Match } from '../types/tournament';

interface MatchCardProps {
  match: Match;
  getTeamName: (teamId: string | null) => string;
  onClick?: () => void;
}

export function MatchCard({ match, getTeamName, onClick }: MatchCardProps) {
  const getMatchStatus = (match: Match) => {
    if (match.status === 'completed') return { text: 'Beendet', color: 'bg-green-100 text-green-800' };
    if (match.status === 'in-progress') return { text: 'Läuft', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Geplant', color: 'bg-gray-100 text-gray-800' };
  };

  const status = getMatchStatus(match);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${
        match.status === 'completed'
          ? 'border-green-500'
          : match.status === 'in-progress'
          ? 'border-yellow-500'
          : 'border-gray-300 cursor-pointer hover:border-sky-500'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          {match.courtNumber && (
            <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">
              Feld {match.courtNumber}
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
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
    </div>
  );
}
