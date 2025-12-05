import { Link } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

export function Home() {
  const { state, dispatch, currentTournament } = useTournament();

  const handleSelectTournament = (id: string) => {
    dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: id });
  };

  const handleDeleteTournament = (id: string) => {
    if (confirm('Turnier wirklich löschen?')) {
      dispatch({ type: 'DELETE_TOURNAMENT', payload: id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Willkommen zum Beachvolleyball Turnier Manager
        </h2>
        <p className="text-gray-600">
          Erstelle und verwalte deine Beachvolleyball-Turniere
        </p>
      </div>

      {currentTournament && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
          <h3 className="font-semibold text-sky-800 mb-2">Aktuelles Turnier</h3>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-800">{currentTournament.name}</h4>
                <p className="text-sm text-gray-500">
                  {currentTournament.teams.length} Teams | {currentTournament.numberOfCourts} Felder
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    currentTournament.status === 'configuration'
                      ? 'bg-yellow-100 text-yellow-800'
                      : currentTournament.status === 'in-progress'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {currentTournament.status === 'configuration'
                    ? 'Konfiguration'
                    : currentTournament.status === 'in-progress'
                    ? 'Läuft'
                    : 'Beendet'}
                </span>
              </div>
              <div className="space-x-2">
                {currentTournament.status === 'configuration' && (
                  <Link
                    to="/configure"
                    className="inline-block px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
                  >
                    Konfigurieren
                  </Link>
                )}
                {currentTournament.status !== 'configuration' && (
                  <Link
                    to="/matches"
                    className="inline-block px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
                  >
                    Zu den Spielen
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Alle Turniere</h3>
          <Link
            to="/configure"
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            + Neues Turnier
          </Link>
        </div>

        {state.tournaments.length === 0 ? (
          <div className="text-center py-12 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-gray-500 mb-4">Noch keine Turniere erstellt</p>
            <Link
              to="/configure"
              className="inline-block px-6 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
            >
              Erstes Turnier erstellen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {state.tournaments.map(tournament => (
              <div
                key={tournament.id}
                className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-colors cursor-pointer ${
                  tournament.id === currentTournament?.id
                    ? 'border-sky-500'
                    : 'border-transparent hover:border-amber-200'
                }`}
                onClick={() => handleSelectTournament(tournament.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{tournament.name}</h4>
                    <p className="text-sm text-gray-500">
                      {tournament.teams.length} Teams | {tournament.numberOfCourts} Felder |{' '}
                      {tournament.system === 'round-robin' ? 'Jeder gegen Jeden' : tournament.system}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        tournament.status === 'configuration'
                          ? 'bg-yellow-100 text-yellow-800'
                          : tournament.status === 'in-progress'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tournament.status === 'configuration'
                        ? 'Konfiguration'
                        : tournament.status === 'in-progress'
                        ? 'Läuft'
                        : 'Beendet'}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteTournament(tournament.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
