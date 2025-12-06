import { useTournament } from '../context/TournamentContext';

export function Standings() {
  const { currentTournament } = useTournament();

  if (!currentTournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kein Turnier ausgewählt</p>
      </div>
    );
  }

  const getTeamName = (teamId: string) => {
    const team = currentTournament.teams.find(t => t.id === teamId);
    return team?.name ?? 'Unbekannt';
  };

  const completedMatches = currentTournament.matches.filter(m => m.status === 'completed').length;
  const totalMatches = currentTournament.matches.length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Tabelle</h2>
        <span className="text-sm text-gray-500">
          {completedMatches}/{totalMatches} Spiele gespielt
        </span>
      </div>

      {currentTournament.status === 'completed' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <span className="text-2xl mb-2 block">🏆</span>
          <p className="font-bold text-amber-800">
            Turnier beendet!
          </p>
          <p className="text-amber-700">
            Gewinner: {getTeamName(currentTournament.standings[0]?.teamId)}
          </p>
        </div>
      )}

      {/* Mobile-optimized table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  #
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sp
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  S
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  N
                </th>
                {currentTournament.setsPerMatch === 2 && (
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Sätze
                  </th>
                )}
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  +/-
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentTournament.standings.map((entry, index) => {
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
                      <span className="font-medium text-gray-800">
                        {getTeamName(entry.teamId)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-gray-600">
                      {entry.played}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-green-600 font-medium">
                      {entry.won}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-red-600 font-medium">
                      {entry.lost}
                    </td>
                    {currentTournament.setsPerMatch === 2 && (
                      <td className="px-3 py-3 whitespace-nowrap text-center text-gray-600 hidden sm:table-cell">
                        {entry.setsWon}:{entry.setsLost}
                      </td>
                    )}
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

      {/* Legend */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Legende</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div><span className="font-medium">Sp</span> = Spiele</div>
          <div><span className="font-medium">S</span> = Siege</div>
          <div><span className="font-medium">N</span> = Niederlagen</div>
          <div><span className="font-medium">+/-</span> = Punktedifferenz</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sortierung: {currentTournament.setsPerMatch === 2 ? 'Gewonnene Sätze' : 'Siege'}, dann{' '}
          {currentTournament.tiebreakerOrder === 'head-to-head-first'
            ? 'direkter Vergleich, dann Punktedifferenz'
            : 'Punktedifferenz, dann direkter Vergleich'}
        </p>
      </div>

      {/* Team Details (Mobile) */}
      <div className="sm:hidden space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Details
        </h3>
        {currentTournament.standings.map((entry, index) => {
          const pointDiff = entry.pointsWon - entry.pointsLost;
          return (
            <div key={entry.teamId} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">
                  {index + 1}. {getTeamName(entry.teamId)}
                </span>
                <span className={`font-bold ${pointDiff > 0 ? 'text-green-600' : pointDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {pointDiff > 0 ? '+' : ''}{pointDiff}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                <div>
                  <span className="text-gray-400">Spiele:</span> {entry.played}
                </div>
                <div>
                  <span className="text-gray-400">S/N:</span> {entry.won}/{entry.lost}
                </div>
                {currentTournament.setsPerMatch === 2 ? (
                  <div>
                    <span className="text-gray-400">Sätze:</span> {entry.setsWon}:{entry.setsLost}
                  </div>
                ) : (
                  <div>
                    <span className="text-gray-400">Punkte:</span> {entry.pointsWon}:{entry.pointsLost}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
