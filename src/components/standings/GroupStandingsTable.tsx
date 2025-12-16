import type { GroupStandingEntry, Group } from '../../types/tournament';

interface GroupStandingsTableProps {
  group: Group;
  standings: GroupStandingEntry[];
  getTeamName: (teamId: string) => string;
  showSets: boolean;
}

export function GroupStandingsTable({ group, standings, getTeamName, showSets }: GroupStandingsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-sky-600 text-white px-4 py-2">
        <h3 className="font-semibold">{group.name}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Team</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Sp</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">S</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">N</th>
              {showSets && (
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Sätze</th>
              )}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.sort((a, b) => (a.groupRank ?? 0) - (b.groupRank ?? 0)).map((entry) => {
              const pointDiff = entry.pointsWon - entry.pointsLost;
              const rank = entry.groupRank ?? 0;
              return (
                <tr
                  key={entry.teamId}
                  className={`${
                    rank === 1 ? 'bg-green-50' : rank === 4 ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                        rank === 1
                          ? 'bg-green-500 text-white'
                          : rank === 4
                          ? 'bg-red-400 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-medium text-gray-800">
                      {getTeamName(entry.teamId)}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center text-gray-600">
                    {entry.played}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center text-green-600 font-medium">
                    {entry.won}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center text-red-600 font-medium">
                    {entry.lost}
                  </td>
                  {showSets && (
                    <td className="px-3 py-2 whitespace-nowrap text-center text-gray-600">
                      {entry.setsWon}:{entry.setsLost}
                    </td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap text-center">
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
