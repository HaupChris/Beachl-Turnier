import { useTournament } from '../context/TournamentContext';
import { calculateKnockoutPlacements } from '../utils/knockout';
import { calculatePlacementTreePlacements } from '../utils/placementTree';
import { calculateShortMainRoundPlacements } from '../utils/shortMainRound';

export function Standings() {
  const { currentTournament, state } = useTournament();

  if (!currentTournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kein Turnier ausgewählt</p>
      </div>
    );
  }

  const isPlayoff = currentTournament.system === 'playoff';
  const isGroupPhase = currentTournament.system === 'group-phase' || currentTournament.system === 'beachl-all-placements' || currentTournament.system === 'beachl-short-main';
  const isKnockout = currentTournament.system === 'knockout';
  const isPlacementTree = currentTournament.system === 'placement-tree';
  const isShortMainKnockout = currentTournament.system === 'short-main-knockout';

  const getTeamName = (teamId: string) => {
    // For knockout, check parent tournament for team names too
    let team = currentTournament.teams.find(t => t.id === teamId);
    if (!team && currentTournament.parentPhaseId) {
      const parentTournament = state.tournaments.find(t => t.id === currentTournament.parentPhaseId);
      team = parentTournament?.teams.find(t => t.id === teamId);
    }
    return team?.name ?? 'Unbekannt';
  };


  const completedMatches = currentTournament.matches.filter(m => m.status === 'completed').length;
  const totalMatches = currentTournament.matches.length;

  // Group standings by group for group-phase
  const standingsByGroup = isGroupPhase && currentTournament.groupStandings
    ? currentTournament.groupPhaseConfig?.groups?.map(group => ({
        group,
        standings: currentTournament.groupStandings?.filter(s => s.groupId === group.id) ?? [],
      })) ?? []
    : [];

  // Calculate knockout placements based on system type
  const knockoutPlacements = isKnockout
    ? calculateKnockoutPlacements(
        currentTournament.matches,
        currentTournament.teams,
        currentTournament.eliminatedTeamIds ?? []
      )
    : isPlacementTree
    ? calculatePlacementTreePlacements(currentTournament.matches, currentTournament.teams)
    : isShortMainKnockout
    ? calculateShortMainRoundPlacements(currentTournament.matches, currentTournament.teams)
    : [];

  // For playoff: render simplified ranking view
  if (isPlayoff) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Finale Platzierungen</h2>
          <span className="text-sm text-gray-500">
            {completedMatches}/{totalMatches} Spiele gespielt
          </span>
        </div>

        {currentTournament.status === 'completed' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <span className="text-2xl mb-2 block">🏆</span>
            <p className="font-bold text-amber-800">Finale beendet!</p>
            <p className="text-amber-700">
              Gewinner: {getTeamName(currentTournament.standings[0]?.teamId)}
            </p>
          </div>
        )}

        {/* Simplified playoff ranking - only position and team name */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {currentTournament.standings.map((entry, index) => (
              <div
                key={entry.teamId}
                className={`flex items-center p-4 ${
                  index === 0
                    ? 'bg-yellow-50'
                    : index === 1
                    ? 'bg-gray-50'
                    : index === 2
                    ? 'bg-orange-50'
                    : ''
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold mr-4 ${
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
                <span className="font-medium text-gray-800 text-lg">
                  {getTeamName(entry.teamId)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Die Platzierungen werden durch die Spiele um Platz 1/2, 3/4 usw. ermittelt.
          </p>
        </div>
      </div>
    );
  }

  // For knockout: render placements with shared rankings
  if (isKnockout) {
    // Get placement number from string like "1.", "5.-8.", etc.
    const getPlacementNumber = (placement: string): number => {
      const match = placement.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 99;
    };

    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">K.O.-Platzierungen</h2>
          <span className="text-sm text-gray-500">
            {completedMatches}/{totalMatches} Spiele gespielt
          </span>
        </div>

        {currentTournament.status === 'completed' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <span className="text-2xl mb-2 block">🏆</span>
            <p className="font-bold text-amber-800">Turnier beendet!</p>
            <p className="text-amber-700">
              Gewinner: {knockoutPlacements.length > 0 ? getTeamName(knockoutPlacements[0].teamId) : '-'}
            </p>
          </div>
        )}

        {knockoutPlacements.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {knockoutPlacements.map((entry) => {
                const placementNum = getPlacementNumber(entry.placement);

                return (
                  <div
                    key={entry.teamId}
                    className={`flex items-center p-4 ${
                      placementNum === 1
                        ? 'bg-yellow-50'
                        : placementNum === 2
                        ? 'bg-gray-50'
                        : placementNum === 3
                        ? 'bg-orange-50'
                        : ''
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center min-w-[3rem] h-10 px-2 rounded-full text-sm font-bold mr-4 ${
                        placementNum === 1
                          ? 'bg-yellow-400 text-yellow-900'
                          : placementNum === 2
                          ? 'bg-gray-400 text-white'
                          : placementNum === 3
                          ? 'bg-orange-400 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {entry.placement}
                    </span>
                    <span className="font-medium text-gray-800 text-lg">
                      {getTeamName(entry.teamId)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <p className="text-gray-500">
              Platzierungen werden nach Abschluss der K.O.-Spiele angezeigt.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Teams, die in derselben Runde ausscheiden, teilen sich die Platzierung.
          </p>
        </div>
      </div>
    );
  }

  // For placement-tree: render simple placements
  if (isPlacementTree || isShortMainKnockout) {
    // Get placement number from string like "1.", "5.-8.", etc.
    const getPlacementNumber = (placement: string): number => {
      const match = placement.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 99;
    };

    const systemTitle = isPlacementTree ? 'Platzierungsbaum' : 'Hauptrunde';

    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{systemTitle} - Platzierungen</h2>
          <span className="text-sm text-gray-500">
            {completedMatches}/{totalMatches} Spiele gespielt
          </span>
        </div>

        {currentTournament.status === 'completed' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <span className="text-2xl mb-2 block">🏆</span>
            <p className="font-bold text-amber-800">Turnier beendet!</p>
            <p className="text-amber-700">
              Gewinner: {knockoutPlacements.length > 0 ? getTeamName(knockoutPlacements[0].teamId) : '-'}
            </p>
          </div>
        )}

        {knockoutPlacements.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {knockoutPlacements.map((entry) => {
                const placementNum = getPlacementNumber(entry.placement);

                return (
                  <div
                    key={entry.teamId}
                    className={`flex items-center p-4 ${
                      placementNum === 1
                        ? 'bg-yellow-50'
                        : placementNum === 2
                        ? 'bg-gray-50'
                        : placementNum === 3
                        ? 'bg-orange-50'
                        : ''
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center min-w-[3rem] h-10 px-2 rounded-full text-sm font-bold mr-4 ${
                        placementNum === 1
                          ? 'bg-yellow-400 text-yellow-900'
                          : placementNum === 2
                          ? 'bg-gray-400 text-white'
                          : placementNum === 3
                          ? 'bg-orange-400 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {entry.placement}
                    </span>
                    <span className="font-medium text-gray-800 text-lg">
                      {getTeamName(entry.teamId)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <p className="text-gray-500">
              Platzierungen werden nach Abschluss der Spiele angezeigt.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Alle Platzierungen werden durch die entsprechenden Platzierungsspiele ermittelt.
          </p>
        </div>
      </div>
    );
  }

  // For group-phase: render standings per group
  if (isGroupPhase && standingsByGroup.length > 0) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Gruppentabellen</h2>
          <span className="text-sm text-gray-500">
            {completedMatches}/{totalMatches} Spiele gespielt
          </span>
        </div>

        {currentTournament.status === 'completed' && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-center">
            <span className="text-2xl mb-2 block">✅</span>
            <p className="font-bold text-sky-800">Gruppenphase beendet!</p>
            <p className="text-sky-700">
              Die Hauptrunde ist jetzt im zweiten Tab verfügbar.
            </p>
          </div>
        )}

        {/* Group standings tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {standingsByGroup.map(({ group, standings }) => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                      {currentTournament.setsPerMatch === 2 && (
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
                            rank === 1
                              ? 'bg-green-50'
                              : rank === 4
                              ? 'bg-red-50'
                              : ''
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
                          {currentTournament.setsPerMatch === 2 && (
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
          ))}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Legende</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Direkt ins Viertelfinale</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-gray-200 rounded-full"></span>
              <span>Zwischenrunde</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-400 rounded-full"></span>
              <span>Ausgeschieden</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sortierung: {currentTournament.setsPerMatch === 2 ? 'Gewonnene Sätze' : 'Siege'}, dann {
              currentTournament.tiebreakerOrder === 'head-to-head-first'
                ? 'direkter Vergleich, dann Punktedifferenz'
                : 'Punktedifferenz, dann direkter Vergleich'
            }
          </p>
        </div>
      </div>
    );
  }

  // Regular tournament standings with full statistics
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
          <p className="font-bold text-amber-800">Turnier beendet!</p>
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
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                  Punkte
                </th>
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

      {/* Legend */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Legende</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
          <div><span className="font-medium">Sp</span> = Spiele</div>
          <div><span className="font-medium">S</span> = Siege</div>
          <div><span className="font-medium">N</span> = Niederlagen</div>
          <div><span className="font-medium">Punkte</span> = Gewonnen:Verloren</div>
          <div><span className="font-medium">+/-</span> = Punktedifferenz</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sortierung: {currentTournament.setsPerMatch === 2 ? 'Gewonnene Sätze' : 'Siege'}, dann {
            currentTournament.tiebreakerOrder === 'head-to-head-first'
              ? 'direkter Vergleich, dann Punktedifferenz'
              : 'Punktedifferenz, dann direkter Vergleich'
          }
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
