import { useTournament } from '../context/TournamentContext';
import { calculateKnockoutPlacements } from '../utils/knockout';
import { calculatePlacementTreePlacements } from '../utils/placementTree/index';
import { calculateShortMainRoundPlacements } from '../utils/shortMainRound';
import {
  StandingsHeader,
  TournamentCompleteBanner,
  PlacementsList,
  GroupStandingsTable,
  RegularStandingsTable,
} from '../components/standings';

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
    let team = currentTournament.teams.find(t => t.id === teamId);
    if (!team && currentTournament.parentPhaseId) {
      const parentTournament = state.tournaments.find(t => t.id === currentTournament.parentPhaseId);
      team = parentTournament?.teams.find(t => t.id === teamId);
    }
    return team?.name ?? 'Unbekannt';
  };

  const completedMatches = currentTournament.matches.filter(m => m.status === 'completed').length;
  const totalMatches = currentTournament.matches.length;
  const showSets = currentTournament.setsPerMatch === 2;

  const standingsByGroup = isGroupPhase && currentTournament.groupStandings
    ? currentTournament.groupPhaseConfig?.groups?.map(group => ({
        group,
        standings: currentTournament.groupStandings?.filter(s => s.groupId === group.id) ?? [],
      })) ?? []
    : [];

  const knockoutPlacements = isKnockout
    ? calculateKnockoutPlacements(currentTournament.matches, currentTournament.teams, currentTournament.eliminatedTeamIds ?? [])
    : isPlacementTree
    ? calculatePlacementTreePlacements(currentTournament.matches, currentTournament.teams)
    : isShortMainKnockout
    ? calculateShortMainRoundPlacements(currentTournament.matches, currentTournament.teams)
    : [];

  if (isPlayoff) {
    return (
      <div className="space-y-6 pb-20">
        <StandingsHeader title="Finale Platzierungen" completedMatches={completedMatches} totalMatches={totalMatches} />
        {currentTournament.status === 'completed' && (
          <TournamentCompleteBanner winnerName={getTeamName(currentTournament.standings[0]?.teamId)} message="Finale beendet!" />
        )}
        <PlacementsList
          placements={currentTournament.standings.map((entry, index) => ({ teamId: entry.teamId, placement: `${index + 1}.` }))}
          getTeamName={getTeamName}
        />
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Die Platzierungen werden durch die Spiele um Platz 1/2, 3/4 usw. ermittelt.</p>
        </div>
      </div>
    );
  }

  if (isKnockout) {
    return (
      <div className="space-y-6 pb-20">
        <StandingsHeader title="K.O.-Platzierungen" completedMatches={completedMatches} totalMatches={totalMatches} />
        {currentTournament.status === 'completed' && knockoutPlacements.length > 0 && (
          <TournamentCompleteBanner winnerName={getTeamName(knockoutPlacements[0].teamId)} />
        )}
        <PlacementsList placements={knockoutPlacements} getTeamName={getTeamName} emptyMessage="Platzierungen werden nach Abschluss der K.O.-Spiele angezeigt." />
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Teams, die in derselben Runde ausscheiden, teilen sich die Platzierung.</p>
        </div>
      </div>
    );
  }

  if (isPlacementTree || isShortMainKnockout) {
    const systemTitle = isPlacementTree ? 'Platzierungsbaum' : 'Hauptrunde';
    return (
      <div className="space-y-6 pb-20">
        <StandingsHeader title={`${systemTitle} - Platzierungen`} completedMatches={completedMatches} totalMatches={totalMatches} />
        {currentTournament.status === 'completed' && knockoutPlacements.length > 0 && (
          <TournamentCompleteBanner winnerName={getTeamName(knockoutPlacements[0].teamId)} />
        )}
        <PlacementsList placements={knockoutPlacements} getTeamName={getTeamName} />
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Alle Platzierungen werden durch die entsprechenden Platzierungsspiele ermittelt.</p>
        </div>
      </div>
    );
  }

  if (isGroupPhase && standingsByGroup.length > 0) {
    return (
      <div className="space-y-6 pb-20">
        <StandingsHeader title="Gruppentabellen" completedMatches={completedMatches} totalMatches={totalMatches} />
        {currentTournament.status === 'completed' && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-center">
            <span className="text-2xl mb-2 block">✅</span>
            <p className="font-bold text-sky-800">Gruppenphase beendet!</p>
            <p className="text-sky-700">Die Hauptrunde ist jetzt im zweiten Tab verfügbar.</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {standingsByGroup.map(({ group, standings }) => (
            <GroupStandingsTable key={group.id} group={group} standings={standings} getTeamName={getTeamName} showSets={showSets} />
          ))}
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Legende</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-500 rounded-full"></span><span>Direkt ins Viertelfinale</span></div>
            <div className="flex items-center gap-2"><span className="w-4 h-4 bg-gray-200 rounded-full"></span><span>Zwischenrunde</span></div>
            <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-400 rounded-full"></span><span>Ausgeschieden</span></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sortierung: {showSets ? 'Gewonnene Sätze' : 'Siege'}, dann {currentTournament.tiebreakerOrder === 'head-to-head-first' ? 'direkter Vergleich, dann Punktedifferenz' : 'Punktedifferenz, dann direkter Vergleich'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <StandingsHeader title="Tabelle" completedMatches={completedMatches} totalMatches={totalMatches} />
      {currentTournament.status === 'completed' && (
        <TournamentCompleteBanner winnerName={getTeamName(currentTournament.standings[0]?.teamId)} />
      )}
      <RegularStandingsTable standings={currentTournament.standings} getTeamName={getTeamName} showSets={showSets} />
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
          Sortierung: {showSets ? 'Gewonnene Sätze' : 'Siege'}, dann {currentTournament.tiebreakerOrder === 'head-to-head-first' ? 'direkter Vergleich, dann Punktedifferenz' : 'Punktedifferenz, dann direkter Vergleich'}
        </p>
      </div>
      <div className="sm:hidden space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Details</h3>
        {currentTournament.standings.map((entry, index) => {
          const pointDiff = entry.pointsWon - entry.pointsLost;
          return (
            <div key={entry.teamId} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{index + 1}. {getTeamName(entry.teamId)}</span>
                <span className={`font-bold ${pointDiff > 0 ? 'text-green-600' : pointDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {pointDiff > 0 ? '+' : ''}{pointDiff}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                <div><span className="text-gray-400">Spiele:</span> {entry.played}</div>
                <div><span className="text-gray-400">S/N:</span> {entry.won}/{entry.lost}</div>
                {showSets ? (
                  <div><span className="text-gray-400">Sätze:</span> {entry.setsWon}:{entry.setsLost}</div>
                ) : (
                  <div><span className="text-gray-400">Punkte:</span> {entry.pointsWon}:{entry.pointsLost}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
