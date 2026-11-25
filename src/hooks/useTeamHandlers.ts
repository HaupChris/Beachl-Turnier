/**
 * Team Handlers Hook
 *
 * Encapsulates all team CRUD operations for the configuration form.
 * Extracted from useConfigureFormHandlers to reduce complexity.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Team } from '../types/tournament';

interface UseTeamHandlersParams {
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  newTeamName: string;
  setNewTeamName: (name: string) => void;
}

export function useTeamHandlers({
  teams,
  setTeams,
  newTeamName,
  setNewTeamName,
}: UseTeamHandlersParams) {
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

  const handleAddMultipleTeams = (count: number) => {
    const newTeams: Team[] = [];
    for (let i = 1; i <= count; i++) {
      newTeams.push({
        id: crypto.randomUUID(),
        name: `Team ${i}`,
        seedPosition: i,
        isPresent: true,
      });
    }
    setTeams(newTeams);
  };

  return {
    handleAddTeam,
    handleTogglePresent,
    handleRemoveTeam,
    handleMoveTeam,
    handleUpdateTeamName,
    handleAddMultipleTeams,
  };
}
