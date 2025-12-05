import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

export function Configure() {
  const navigate = useNavigate();
  const { dispatch, currentTournament } = useTournament();

  const [name, setName] = useState('');
  const [system, setSystem] = useState<TournamentSystem>('round-robin');
  const [numberOfCourtsInput, setNumberOfCourtsInput] = useState('2');
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');

  const numberOfCourts = parseInt(numberOfCourtsInput) || 1;
  const isEditing = !!(currentTournament && currentTournament.status === 'configuration');

  useEffect(() => {
    if (isEditing && currentTournament) {
      setName(currentTournament.name);
      setSystem(currentTournament.system);
      setNumberOfCourtsInput(String(currentTournament.numberOfCourts));
      setSetsPerMatch(currentTournament.setsPerMatch);
      setPointsPerSet(currentTournament.pointsPerSet);
      setTeams(currentTournament.teams);
    }
  }, [currentTournament, isEditing]);

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: uuidv4(),
        name: newTeamName.trim(),
        seedPosition: teams.length + 1,
      };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
    }
  };

  const handleRemoveTeam = (id: string) => {
    const updatedTeams = teams
      .filter(t => t.id !== id)
      .map((t, index) => ({ ...t, seedPosition: index + 1 }));
    setTeams(updatedTeams);
  };

  const handleMoveTeam = (index: number, direction: 'up' | 'down') => {
    const newTeams = [...teams];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= teams.length) return;

    [newTeams[index], newTeams[targetIndex]] = [newTeams[targetIndex], newTeams[index]];
    setTeams(newTeams.map((t, i) => ({ ...t, seedPosition: i + 1 })));
  };

  const handleUpdateTeamName = (id: string, newName: string) => {
    setTeams(teams.map(t => (t.id === id ? { ...t, name: newName } : t)));
  };

  const handleCreateTournament = () => {
    if (!name.trim() || teams.length < 2) {
      alert('Bitte geben Sie einen Namen ein und fügen Sie mindestens 2 Teams hinzu.');
      return;
    }

    dispatch({
      type: 'CREATE_TOURNAMENT',
      payload: {
        name: name.trim(),
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        teams: teams.map(t => ({ name: t.name, seedPosition: t.seedPosition })),
      },
    });

    navigate('/');
  };

  const handleUpdateTournament = () => {
    if (!currentTournament || teams.length < 2) return;

    dispatch({
      type: 'UPDATE_TEAMS',
      payload: { tournamentId: currentTournament.id, teams },
    });

    alert('Turnier aktualisiert!');
  };

  const handleStartTournament = () => {
    if (!currentTournament) return;

    if (teams.length < 2) {
      alert('Mindestens 2 Teams benötigt!');
      return;
    }

    dispatch({ type: 'START_TOURNAMENT', payload: currentTournament.id });
    navigate('/matches');
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold text-gray-800">
        {isEditing ? 'Turnier bearbeiten' : 'Neues Turnier erstellen'}
      </h2>

      {/* Basic Settings */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-700">Grundeinstellungen</h3>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Turniername
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="z.B. Sommerturnier 2024"
            disabled={isEditing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Turniersystem
          </label>
          <select
            value={system}
            onChange={e => setSystem(e.target.value as TournamentSystem)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isEditing}
          >
            <option value="round-robin">Jeder gegen Jeden</option>
            <option value="swiss" disabled>
              Swiss System (bald verfügbar)
            </option>
            <option value="pool-play-single-out" disabled>
              Pool Play + Single Out (bald verfügbar)
            </option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Anzahl Felder
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={numberOfCourtsInput}
              onChange={e => setNumberOfCourtsInput(e.target.value)}
              onBlur={() => setNumberOfCourtsInput(String(Math.max(1, Math.min(10, numberOfCourts))))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Sätze pro Match
            </label>
            <select
              value={setsPerMatch}
              onChange={e => setSetsPerMatch(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isEditing}
            >
              <option value={1}>1 Satz</option>
              <option value={2}>Best of 3</option>
              <option value={3}>Best of 5</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Punkte pro Satz
          </label>
          <select
            value={pointsPerSet}
            onChange={e => setPointsPerSet(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isEditing}
          >
            <option value={15}>15 Punkte</option>
            <option value={21}>21 Punkte</option>
            <option value={25}>25 Punkte</option>
          </select>
        </div>
      </div>

      {/* Teams & Seeding */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-700">Teams & Setzliste</h3>
        <p className="text-sm text-gray-500">
          Die Reihenfolge bestimmt die Setzposition. Ziehe Teams nach oben/unten um die
          Setzliste anzupassen.
        </p>

        <div className="flex space-x-2">
          <input
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Teamname eingeben"
          />
          <button
            onClick={handleAddTeam}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Hinzufügen
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Noch keine Teams hinzugefügt</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                  {team.seedPosition}
                </span>
                <input
                  type="text"
                  value={team.name}
                  onChange={e => handleUpdateTeamName(team.id, e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleMoveTeam(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveTeam(index, 'down')}
                    disabled={index === teams.length - 1}
                    className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500">
          {teams.length} Team{teams.length !== 1 ? 's' : ''} |{' '}
          {teams.length > 1
            ? `${(teams.length * (teams.length - 1)) / 2} Spiele bei Jeder-gegen-Jeden`
            : 'Mindestens 2 Teams erforderlich'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col space-y-3">
        {isEditing ? (
          <>
            <button
              onClick={handleUpdateTournament}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Änderungen speichern
            </button>
            <button
              onClick={handleStartTournament}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Turnier starten
            </button>
          </>
        ) : (
          <button
            onClick={handleCreateTournament}
            disabled={!name.trim() || teams.length < 2}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Turnier erstellen
          </button>
        )}
      </div>
    </div>
  );
}
