import type {Team, TournamentSystem} from '../types/tournament';
import {Plus, ChevronUp, ChevronDown, X} from 'lucide-react';

interface TeamsListProps {
    teams: Team[];
    newTeamName: string;
    onNewTeamNameChange: (name: string) => void;
    onAddTeam: () => void;
    onRemoveTeam: (id: string) => void;
    onMoveTeam: (index: number, direction: 'up' | 'down') => void;
    onUpdateTeamName: (id: string, name: string) => void;
    onTogglePresent: (id: string) => void;
    system: TournamentSystem;
    numberOfRounds: number;
}

export function TeamsList({
                              teams,
                              newTeamName,
                              onNewTeamNameChange,
                              onAddTeam,
                              onRemoveTeam,
                              onMoveTeam,
                              onUpdateTeamName,
                              onTogglePresent
                          }: TeamsListProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onAddTeam();
        }
    };

    return (
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
                    onChange={e => onNewTeamNameChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Teamname eingeben"
                />
                <button
                    onClick={onAddTeam}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
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
                            className={`flex items-center space-x-2 rounded-lg p-3 ${
                                team.isPresent ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                        >
              <span
                  className="w-8 h-8 flex items-center justify-center bg-sky-100 text-sky-700 rounded-full text-sm font-bold">
                {team.seedPosition}
              </span>
                            <button
                                onClick={() => onTogglePresent(team.id)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    team.isPresent
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                }`}
                                title={team.isPresent ? 'Team ist anwesend' : 'Team als anwesend markieren'}
                            >
                                {team.isPresent ? 'Anwesend' : 'Abwesend'}
                            </button>
                            <input
                                type="text"
                                value={team.name}
                                onChange={e => onUpdateTeamName(team.id, e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            />
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => onMoveTeam(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 text-gray-500 hover:text-sky-600 disabled:opacity-30"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onMoveTeam(index, 'down')}
                                    disabled={index === teams.length - 1}
                                    className="p-1 text-gray-500 hover:text-sky-600 disabled:opacity-30"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onRemoveTeam(team.id)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-sm text-gray-500">
                {teams.length} Team{teams.length !== 1 ? 's' : ''} |{' '}
                <span
                    className={teams.filter(t => t.isPresent).length === teams.length ? 'text-green-600 font-medium' : 'text-amber-600'}>
          {teams.filter(t => t.isPresent).length} anwesend
        </span>
            </p>
        </div>
    );
}
