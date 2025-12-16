import type { StandingEntry } from '../../types/tournament';

interface RegularStandingsTableProps {
  standings: StandingEntry[];
  getTeamName: (teamId: string) => string;
  showSets: boolean;
}

export function RegularStandingsTable({ standings, getTeamName, showSets }: RegularStandingsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Team</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sp</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">S</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">N</th>
              {showSets && (
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Sätze</th>
              )}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Punkte</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.map((entry, index) => {
              const pointDiff = entry.pointsWon - entry.pointsLost;
              return (
                <tr
                  key={entry.teamId}
                  className={`${
                    index === 0
                      ? 'bg-yellow-50'
                      : index === 1
                      ? 'bg-gray-50'
                      : index === 2
                      ? 'bg-orange-50'
                      : ''
                  }`}
                >
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-400 text-yellow-900'
                          : index === 1
                          ? 'bg-gray-400 text-white'
                          : index === 2
                          ? 'bg-orange-400 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-medium text-gray-800">{getTeamName(entry.teamId)}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-gray-600">{entry.played}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-green-600 font-medium">{entry.won}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-red-600 font-medium">{entry.lost}</td>
                  {showSets && (
                    <td className="px-3 py-3 whitespace-nowrap text-center text-gray-600 hidden sm:table-cell">
                      {entry.setsWon}:{entry.setsLost}
                    </td>
                  )}
                  <td className="px-3 py-3 whitespace-nowrap text-center text-gray-600 hidden md:table-cell">
                    {entry.pointsWon}:{entry.pointsLost}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span className={`font-bold ${pointDiff > 0 ? 'text-green-600' : pointDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {pointDiff > 0 ? '+' : ''}{pointDiff}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
