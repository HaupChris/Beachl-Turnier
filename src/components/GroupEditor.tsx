import { useState } from 'react';
import type { Team, Group } from '../types/tournament';

interface GroupEditorProps {
  groups: Group[];
  teams: Team[];
  onGroupsChange: (groups: Group[]) => void;
  disabled?: boolean;
}

export function GroupEditor({ groups, teams, onGroupsChange, disabled }: GroupEditorProps) {
  const [draggedTeam, setDraggedTeam] = useState<{ teamId: string; fromGroupId: string } | null>(null);

  const getTeamById = (id: string) => teams.find(t => t.id === id);

  const handleDragStart = (teamId: string, groupId: string) => {
    if (disabled) return;
    setDraggedTeam({ teamId, fromGroupId: groupId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetGroupId: string) => {
    if (!draggedTeam || disabled) return;

    const { teamId, fromGroupId } = draggedTeam;

    if (fromGroupId === targetGroupId) {
      setDraggedTeam(null);
      return;
    }

    const newGroups = groups.map(group => {
      if (group.id === fromGroupId) {
        return {
          ...group,
          teamIds: group.teamIds.filter(id => id !== teamId),
        };
      }
      if (group.id === targetGroupId) {
        return {
          ...group,
          teamIds: [...group.teamIds, teamId],
        };
      }
      return group;
    });

    onGroupsChange(newGroups);
    setDraggedTeam(null);
  };

  const moveTeam = (teamId: string, fromGroupId: string, toGroupId: string) => {
    if (disabled || fromGroupId === toGroupId) return;

    const newGroups = groups.map(group => {
      if (group.id === fromGroupId) {
        return {
          ...group,
          teamIds: group.teamIds.filter(id => id !== teamId),
        };
      }
      if (group.id === toGroupId) {
        return {
          ...group,
          teamIds: [...group.teamIds, teamId],
        };
      }
      return group;
    });

    onGroupsChange(newGroups);
  };

  // Check if groups are balanced
  const groupSizes = groups.map(g => g.teamIds.length);
  const minSize = Math.min(...groupSizes);
  const maxSize = Math.max(...groupSizes);
  const isBalanced = maxSize - minSize <= 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700">Gruppeneinteilung</h4>
        {!isBalanced && (
          <span className="text-sm text-amber-600">
            Gruppen sind ungleich verteilt
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {groups.map(group => (
          <div
            key={group.id}
            className={`
              bg-gray-50 rounded-lg p-3 min-h-[120px]
              ${!disabled ? 'border-2 border-dashed border-gray-200' : 'border border-gray-200'}
              ${draggedTeam && draggedTeam.fromGroupId !== group.id ? 'border-sky-300 bg-sky-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(group.id)}
          >
            <h5 className="font-semibold text-gray-700 text-sm mb-2">
              {group.name}
            </h5>
            <ul className="space-y-1">
              {group.teamIds.map((teamId, index) => {
                const team = getTeamById(teamId);
                if (!team) return null;

                return (
                  <li
                    key={teamId}
                    draggable={!disabled}
                    onDragStart={() => handleDragStart(teamId, group.id)}
                    className={`
                      flex items-center justify-between text-sm py-1 px-2 rounded
                      ${!disabled ? 'cursor-move hover:bg-white hover:shadow-sm' : ''}
                      ${draggedTeam?.teamId === teamId ? 'opacity-50' : ''}
                      bg-white border border-gray-100
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-4">{index + 1}.</span>
                      <span className="truncate">{team.name}</span>
                    </span>
                    {!disabled && (
                      <select
                        value={group.id}
                        onChange={e => moveTeam(teamId, group.id, e.target.value)}
                        className="text-xs border-0 bg-transparent text-gray-400 cursor-pointer p-0"
                        title="In andere Gruppe verschieben"
                      >
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
              {group.teamIds.length === 0 && (
                <li className="text-gray-400 text-sm italic">Keine Teams</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {!disabled && (
        <p className="text-xs text-gray-500">
          Teams können per Drag & Drop oder Dropdown zwischen Gruppen verschoben werden.
        </p>
      )}
    </div>
  );
}
