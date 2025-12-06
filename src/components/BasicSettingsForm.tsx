import type { TournamentSystem } from '../types/tournament';

interface BasicSettingsFormProps {
  name: string;
  onNameChange: (name: string) => void;
  system: TournamentSystem;
  onSystemChange: (system: TournamentSystem) => void;
  numberOfCourtsInput: string;
  onNumberOfCourtsInputChange: (value: string) => void;
  onNumberOfCourtsBlur: () => void;
  numberOfRoundsInput: string;
  onNumberOfRoundsInputChange: (value: string) => void;
  onNumberOfRoundsBlur: () => void;
  setsPerMatch: number;
  onSetsPerMatchChange: (sets: number) => void;
  pointsPerSet: number;
  onPointsPerSetChange: (points: number) => void;
  isEditing: boolean;
}

export function BasicSettingsForm({
  name,
  onNameChange,
  system,
  onSystemChange,
  numberOfCourtsInput,
  onNumberOfCourtsInputChange,
  onNumberOfCourtsBlur,
  numberOfRoundsInput,
  onNumberOfRoundsInputChange,
  onNumberOfRoundsBlur,
  setsPerMatch,
  onSetsPerMatchChange,
  pointsPerSet,
  onPointsPerSetChange,
  isEditing,
}: BasicSettingsFormProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-700">Grundeinstellungen</h3>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Turniername
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
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
          onChange={e => onSystemChange(e.target.value as TournamentSystem)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          disabled={isEditing}
        >
          <option value="round-robin">Jeder gegen Jeden</option>
          <option value="swiss">Swiss System</option>
          <option value="pool-play-single-out" disabled>
            Pool Play + Single Out (bald verfügbar)
          </option>
        </select>
        {system === 'swiss' && (
          <p className="text-xs text-gray-500 mt-1">
            Teams mit ähnlicher Punktzahl spielen gegeneinander. Paarungen werden nach jeder Runde neu berechnet.
          </p>
        )}
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
            onChange={e => onNumberOfCourtsInputChange(e.target.value)}
            onBlur={onNumberOfCourtsBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            disabled={isEditing}
          />
        </div>

        {system === 'swiss' ? (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Anzahl Runden
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={numberOfRoundsInput}
              onChange={e => onNumberOfRoundsInputChange(e.target.value)}
              onBlur={onNumberOfRoundsBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isEditing}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Sätze pro Match
            </label>
            <select
              value={setsPerMatch}
              onChange={e => onSetsPerMatchChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isEditing}
            >
              <option value={1}>1 Satz</option>
              <option value={2}>2 Sätze</option>
              <option value={3}>Best of 3</option>
            </select>
            {setsPerMatch === 2 && (
              <p className="text-xs text-gray-500 mt-1">
                Bei 2 Sätzen werden gewonnene Sätze statt Matches in der Tabelle gezählt.
              </p>
            )}
          </div>
        )}
      </div>

      {system === 'swiss' && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Sätze pro Match
          </label>
          <select
            value={setsPerMatch}
            onChange={e => onSetsPerMatchChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            disabled={isEditing}
          >
            <option value={1}>1 Satz</option>
            <option value={2}>2 Sätze</option>
            <option value={3}>Best of 3</option>
          </select>
          {setsPerMatch === 2 && (
            <p className="text-xs text-gray-500 mt-1">
              Bei 2 Sätzen werden gewonnene Sätze statt Matches in der Tabelle gezählt.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Punkte pro Satz
        </label>
        <select
          value={pointsPerSet}
          onChange={e => onPointsPerSetChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          disabled={isEditing}
        >
          <option value={15}>15 Punkte</option>
          <option value={21}>21 Punkte</option>
        </select>
      </div>
    </div>
  );
}
