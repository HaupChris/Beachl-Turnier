import {Link, useNavigate} from 'react-router-dom';
import {useTournament} from '../context/TournamentContext';

export function Home() {
    const navigate = useNavigate();
    const {state, dispatch, currentTournament, currentContainer, containerPhases} = useTournament();

    // Get the main (first) tournament for each container to determine status
    const getContainerInfo = (containerId: string) => {
        const container = state.containers.find(c => c.id === containerId);
        if (!container) return null;

        const phases = container.phases
            .map(p => state.tournaments.find(t => t.id === p.tournamentId))
            .filter((t): t is NonNullable<typeof t> => t !== undefined);

        const mainPhase = phases.find(p => p.phaseOrder === 1) || phases[0];
        const currentPhase = phases[container.currentPhaseIndex] || mainPhase;

        // Container status: configuration if main phase is in config, completed if all phases done
        const allCompleted = phases.every(p => p.status === 'completed');
        const anyInProgress = phases.some(p => p.status === 'in-progress');
        const status = allCompleted
            ? 'completed'
            : anyInProgress
                ? 'in-progress'
                : 'configuration';

        return {
            container,
            mainPhase,
            currentPhase,
            phases,
            status,
            teamCount: mainPhase?.teams.length || 0,
            courtCount: mainPhase?.numberOfCourts || 0,
            system: mainPhase?.system,
        };
    };

    const handleSelectContainer = (containerId: string) => {
        const info = getContainerInfo(containerId);
        if (info?.currentPhase) {
            dispatch({type: 'SET_CURRENT_TOURNAMENT', payload: info.currentPhase.id});
        }
    };

    const handleDeleteContainer = (containerId: string) => {
        if (confirm('Turnier wirklich löschen? Alle Phasen und Ergebnisse werden gelöscht.')) {
            dispatch({type: 'DELETE_CONTAINER', payload: containerId});
        }
    };

    const handleStartTournament = () => {
        if (!currentTournament) return;
        if (currentTournament.teams.length < 2) {
            alert('Mindestens 2 Teams benötigt!');
            return;
        }
        dispatch({type: 'START_TOURNAMENT', payload: currentTournament.id});
        navigate('/matches');
    };

    const handleResetTournament = () => {
        if (!currentTournament) return;

        // Find the main phase of this container
        const mainPhase = containerPhases.find(p => p.phaseOrder === 1) || currentTournament;

        // Check if there are any completed matches with results across all phases
        const hasResults = containerPhases.some(phase =>
            phase.matches.some(
                m => m.status === 'completed' || m.scores.some(s => s.teamA > 0 || s.teamB > 0)
            )
        );

        let confirmMessage = 'Turnier wirklich zurücksetzen?\n\nDas Turnier wird in den Konfigurations-Modus versetzt und kann erneut bearbeitet werden.';

        if (hasResults) {
            confirmMessage =
                'ACHTUNG: Es gibt bereits eingetragene Ergebnisse!\n\n' +
                'Wenn du das Turnier zurücksetzt, gehen ALLE Ergebnisse verloren.\n\n' +
                'Turnier wirklich zurücksetzen?';
        }

        if (confirm(confirmMessage)) {
            dispatch({type: 'RESET_TOURNAMENT', payload: mainPhase.id});
        }
    };

    // Get current container info
    const currentContainerInfo = currentContainer ? getContainerInfo(currentContainer.id) : null;

    // Get display name for system
    const getSystemName = (system: string | undefined) => {
        switch (system) {
            case 'round-robin':
                return 'Jeder gegen Jeden';
            case 'swiss':
                return 'Swiss System';
            case 'playoff':
                return 'Playoff';
            default:
                return system || '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center py-8">
                {/*<h2 className="text-2xl font-bold text-gray-800 mb-2">*/}
                {/*  Willkommen zum Beachvolleyball Turnier Manager*/}
                {/*</h2>*/}
                <p className="text-gray-600">
                    Erstelle und verwalte deine Beachvolleyball-Turniere
                </p>
            </div>

            {currentContainerInfo && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 md:p-6">
                    <h3 className="font-semibold text-sky-800 mb-2">Aktuelles Turnier</h3>
                    <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                            <div>
                                <h4 className="font-medium text-gray-800 text-lg">{currentContainerInfo.container.name}</h4>
                                <p className="text-sm text-gray-500">
                                    {currentContainerInfo.teamCount} Teams | {currentContainerInfo.courtCount} Felder
                                </p>
                                {currentContainerInfo.phases.length > 1 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {currentContainerInfo.phases.length} Phasen: {currentContainerInfo.phases.map(p => p.phaseName).join(', ')}
                                    </p>
                                )}
                                <span
                                    className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                        currentContainerInfo.status === 'configuration'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : currentContainerInfo.status === 'in-progress'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                  {currentContainerInfo.status === 'configuration'
                      ? 'Konfiguration'
                      : currentContainerInfo.status === 'in-progress'
                          ? 'Läuft'
                          : 'Beendet'}
                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {currentContainerInfo.status === 'configuration' && (
                                    <>
                                        <Link
                                            to="/configure"
                                            className="inline-block px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
                                        >
                                            Konfigurieren
                                        </Link>
                                        <button
                                            onClick={handleStartTournament}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                        >
                                            Turnier starten
                                        </button>
                                    </>
                                )}
                                {currentContainerInfo.status !== 'configuration' && (
                                    <>
                                        <Link
                                            to="/matches"
                                            className="inline-block px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
                                        >
                                            Zu den Spielen
                                        </Link>
                                        <button
                                            onClick={handleResetTournament}
                                            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                                        >
                                            Turnier zurücksetzen
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">

                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Alle Turniere</h3>
                    {state.containers.length > 0 && (
                        <Link
                            to="/configure"
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                        >
                            + Neues Turnier
                        </Link>
                    )}
                </div>


                {state.containers.length === 0 ? (
                    <div className="text-center py-12 bg-amber-50 rounded-lg border-3 border-amber-100">
                        <p className="text-gray-500 mb-4">Noch keine Turniere erstellt</p>
                        <Link
                            to="/configure"
                            className="inline-block px-6 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
                        >
                            Erstes Turnier erstellen
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {state.containers.map(container => {
                            const info = getContainerInfo(container.id);
                            if (!info) return null;

                            const isSelected = currentContainer?.id === container.id;

                            return (
                                <div
                                    key={container.id}
                                    className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'border-sky-500'
                                            : 'border-transparent hover:border-amber-200'
                                    }`}
                                    onClick={() => handleSelectContainer(container.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-800 truncate">{container.name}</h4>
                                            <p className="text-sm text-gray-500">
                                                {info.teamCount} Teams | {info.courtCount} Felder
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {getSystemName(info.system)}
                                                {info.phases.length > 1 && ` + ${info.phases.length - 1} weitere Phase(n)`}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 ml-2">
                      <span
                          className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                              info.status === 'configuration'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : info.status === 'in-progress'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {info.status === 'configuration'
                            ? 'Konfiguration'
                            : info.status === 'in-progress'
                                ? 'Läuft'
                                : 'Beendet'}
                      </span>
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleDeleteContainer(container.id);
                                                }}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
