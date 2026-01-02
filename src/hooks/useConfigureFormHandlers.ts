import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import type { Team, TournamentSystem, TiebreakerOrder, SchedulingSettings, KnockoutSettings } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

interface UseConfigureFormHandlersParams {
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  newTeamName: string;
  setNewTeamName: (name: string) => void;
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet: number;
  tiebreakerOrder: TiebreakerOrder;
  numberOfRounds: number;
  scheduling: SchedulingSettings;
  isGroupBasedSystem: boolean;
  numberOfGroups: number;
  teamsPerGroup: 3 | 4 | 5;
  groupSeeding: 'snake' | 'random' | 'manual';
  enablePlayoff: boolean;
  knockoutSettings: KnockoutSettings;
}

export function useConfigureFormHandlers(params: UseConfigureFormHandlersParams) {
  const navigate = useNavigate();
  const { dispatch, currentTournament, currentContainer } = useTournament();
  const {
    teams,
    setTeams,
    newTeamName,
    setNewTeamName,
    name,
    system,
    numberOfCourts,
    setsPerMatch,
    pointsPerSet,
    pointsPerThirdSet,
    tiebreakerOrder,
    numberOfRounds,
    scheduling,
    isGroupBasedSystem,
    numberOfGroups,
    teamsPerGroup,
    groupSeeding,
    enablePlayoff,
    knockoutSettings,
  } = params;

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: uuidv4(),
        name: newTeamName.trim(),
        seedPosition: teams.length + 1,
        isPresent: false,
      };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
    }
  };

  const handleTogglePresent = (id: string) => {
    setTeams(teams.map(t => (t.id === id ? { ...t, isPresent: !t.isPresent } : t)));
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
        pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        tiebreakerOrder,
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
        scheduling,
        teams: teams.map(t => ({ name: t.name, seedPosition: t.seedPosition })),
        // Group phase specific config (for all group-based systems)
        groupPhaseConfig: isGroupBasedSystem ? {
          numberOfGroups,
          teamsPerGroup,
          seeding: groupSeeding,
        } : undefined,
        // Knockout settings for group-based systems or optional playoff
        knockoutSettings: (isGroupBasedSystem || enablePlayoff) ? knockoutSettings : undefined,
      },
    });

    navigate('/');
  };

  const handleUpdateTournament = () => {
    if (!currentTournament || teams.length < 2) return;

    dispatch({
      type: 'UPDATE_TOURNAMENT_SETTINGS',
      payload: {
        tournamentId: currentTournament.id,
        name: name.trim(),
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        tiebreakerOrder,
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
        scheduling,
      },
    });

    dispatch({
      type: 'UPDATE_TEAMS',
      payload: { tournamentId: currentTournament.id, teams },
    });

    alert('Turnier aktualisiert!');
  };

  const handleStartTournament = () => {
    if (!currentTournament) return;

    const presentTeams = teams.filter(t => t.isPresent);
    const absentTeams = teams.filter(t => !t.isPresent);

    if (presentTeams.length < 2) {
      alert('Mindestens 2 anwesende Teams benötigt!');
      return;
    }

    if (absentTeams.length > 0) {
      const absentNames = absentTeams.map(t => t.name).join(', ');
      const confirmed = confirm(
        `${absentTeams.length} Team(s) sind nicht anwesend:\n${absentNames}\n\n` +
        `Das Turnier wird nur mit den ${presentTeams.length} anwesenden Teams gestartet.\n\n` +
        `Fortfahren?`
      );
      if (!confirmed) return;
    }

    const teamsToUse = presentTeams.map((t, index) => ({
      ...t,
      seedPosition: index + 1,
    }));

    dispatch({
      type: 'UPDATE_TOURNAMENT_SETTINGS',
      payload: {
        tournamentId: currentTournament.id,
        name: name.trim(),
        system,
        numberOfCourts,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
        tiebreakerOrder,
        numberOfRounds: system === 'swiss' ? numberOfRounds : undefined,
        scheduling,
      },
    });

    dispatch({
      type: 'UPDATE_TEAMS',
      payload: { tournamentId: currentTournament.id, teams: teamsToUse },
    });

    dispatch({ type: 'START_TOURNAMENT', payload: currentTournament.id });
    // Navigate to tournament-specific matches URL
    if (currentContainer) {
      navigate(`/tournament/${currentContainer.id}/matches`);
    } else {
      navigate('/matches');
    }
  };

  return {
    handleAddTeam,
    handleTogglePresent,
    handleRemoveTeam,
    handleMoveTeam,
    handleUpdateTeamName,
    handleCreateTournament,
    handleUpdateTournament,
    handleStartTournament,
  };
}
