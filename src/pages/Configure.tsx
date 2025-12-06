import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';
import { BasicSettingsForm } from '../components/BasicSettingsForm';
import { TeamsList } from '../components/TeamsList';

export function Configure() {
  const navigate = useNavigate();
  const { dispatch, currentTournament } = useTournament();

  const [name, setName] = useState('');
  const [system, setSystem] = useState<TournamentSystem>('round-robin');
  const [numberOfCourtsInput, setNumberOfCourtsInput] = useState('2');
  const [numberOfRoundsInput, setNumberOfRoundsInput] = useState('4');
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');

  const numberOfCourts = parseInt(numberOfCourtsInput) || 1;
  const numberOfRounds = parseInt(numberOfRoundsInput) || 4;
  const isEditing = !!(currentTournament && currentTournament.status === 'configuration');

  useEffect(() => {
    if (isEditing && currentTournament) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(currentTournament.name);
      setSystem(currentTournament.system);
      setNumberOfCourtsInput(String(currentTournament.numberOfCourts));
      setNumberOfRoundsInput(String(currentTournament.numberOfRounds || 4));
      setSetsPerMatch(currentTournament.setsPerMatch);
      setPointsPerSet(currentTournament.pointsPerSet);
      setTeams(currentTournament.teams);
      /* eslint-enable react-hooks/set-state-in-effect */
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
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
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

      <BasicSettingsForm
        name={name}
        onNameChange={setName}
        system={system}
        onSystemChange={setSystem}
        numberOfCourtsInput={numberOfCourtsInput}
        onNumberOfCourtsInputChange={setNumberOfCourtsInput}
        onNumberOfCourtsBlur={() =>
          setNumberOfCourtsInput(String(Math.max(1, Math.min(10, numberOfCourts))))
        }
        numberOfRoundsInput={numberOfRoundsInput}
        onNumberOfRoundsInputChange={setNumberOfRoundsInput}
        onNumberOfRoundsBlur={() =>
          setNumberOfRoundsInput(String(Math.max(1, Math.min(20, numberOfRounds))))
        }
        setsPerMatch={setsPerMatch}
        onSetsPerMatchChange={setSetsPerMatch}
        pointsPerSet={pointsPerSet}
        onPointsPerSetChange={setPointsPerSet}
        isEditing={isEditing}
      />

      <TeamsList
        teams={teams}
        newTeamName={newTeamName}
        onNewTeamNameChange={setNewTeamName}
        onAddTeam={handleAddTeam}
        onRemoveTeam={handleRemoveTeam}
        onMoveTeam={handleMoveTeam}
        onUpdateTeamName={handleUpdateTeamName}
        system={system}
        numberOfRounds={numberOfRounds}
      />

      <div className="flex flex-col space-y-3">
        {isEditing ? (
          <>
            <button
              onClick={handleUpdateTournament}
              className="w-full py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
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
            className="w-full py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Turnier erstellen
          </button>
        )}
      </div>
    </div>
  );
}
