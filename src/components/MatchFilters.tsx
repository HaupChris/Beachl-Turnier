import type { Team } from '../types/tournament';

interface MatchFiltersProps {
  filter: 'all' | 'pending' | 'completed';
  onFilterChange: (filter: 'all' | 'pending' | 'completed') => void;
  teams: Team[];
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
}

export function MatchFilters({
  filter,
  onFilterChange,
  teams,
  selectedTeamId,
  onTeamChange,
}: MatchFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => onFilterChange('pending')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ausstehend
        </button>
        <button
          onClick={() => onFilterChange('completed')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Beendet
        </button>
      </div>

      <div className="md:w-64">
        <select
          value={selectedTeamId ?? ''}
          onChange={e => onTeamChange(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Alle Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
