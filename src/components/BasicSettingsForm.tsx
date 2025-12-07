import type { TournamentSystem, TiebreakerOrder, SchedulingSettings } from '../types/tournament';
import { estimateTournamentDuration, parseTimeToMinutes } from '../utils/scheduling';

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
  pointsPerThirdSet: number;
  onPointsPerThirdSetChange: (points: number) => void;
  tiebreakerOrder: TiebreakerOrder;
  onTiebreakerOrderChange: (order: TiebreakerOrder) => void;
  scheduling: SchedulingSettings;
  onSchedulingChange: (scheduling: SchedulingSettings) => void;
  teamCount: number;
  numberOfCourts: number;
  numberOfRounds: number;
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
  pointsPerThirdSet,
  onPointsPerThirdSetChange,
  tiebreakerOrder,
  onTiebreakerOrderChange,
  scheduling,
  onSchedulingChange,
  teamCount,
  numberOfCourts,
  numberOfRounds,
}: BasicSettingsFormProps) {
  // Helper to update a single scheduling field
  const updateScheduling = (field: keyof SchedulingSettings, value: string | number) => {
    onSchedulingChange({ ...scheduling, [field]: value });
  };

  // Calculate estimated duration for preview
  const estimation = teamCount >= 2
    ? estimateTournamentDuration(
        teamCount,
        system,
        numberOfCourts,
        numberOfRounds,
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet,
        scheduling
      )
    : null;

  // Check if end time is exceeded
  const isTimeExceeded = estimation
    ? parseTimeToMinutes(estimation.endTime) > parseTimeToMinutes(scheduling.endTime)
    : false;
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Punkte pro Satz
          </label>
          <select
            value={pointsPerSet}
            onChange={e => onPointsPerSetChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value={15}>15 Punkte</option>
            <option value={21}>21 Punkte</option>
          </select>
        </div>

        {setsPerMatch === 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Punkte 3. Satz
            </label>
            <select
              value={pointsPerThirdSet}
              onChange={e => onPointsPerThirdSetChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value={15}>15 Punkte</option>
              <option value={21}>21 Punkte</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Standard: 15 Punkte im Entscheidungssatz
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Tiebreaker bei Gleichstand
        </label>
        <select
          value={tiebreakerOrder}
          onChange={e => onTiebreakerOrderChange(e.target.value as TiebreakerOrder)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        >
          <option value="head-to-head-first">Direkter Vergleich, dann Punktedifferenz</option>
          <option value="point-diff-first">Punktedifferenz, dann direkter Vergleich</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Bestimmt die Reihenfolge bei Gleichheit von Siegen/Sätzen
        </p>
      </div>

      {/* Scheduling Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold text-gray-700 mb-4">Zeitplanung</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Startzeit
            </label>
            <input
              type="time"
              value={scheduling.startTime}
              onChange={e => updateScheduling('startTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Geplante Endzeit
            </label>
            <input
              type="time"
              value={scheduling.endTime}
              onChange={e => updateScheduling('endTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Zeit pro 21er-Satz (Min)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={scheduling.minutesPer21PointSet}
              onChange={e => updateScheduling('minutesPer21PointSet', parseInt(e.target.value) || 20)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Zeit pro 15er-Satz (Min)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={scheduling.minutesPer15PointSet}
              onChange={e => updateScheduling('minutesPer15PointSet', parseInt(e.target.value) || 12)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Wechselzeit (Min)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={scheduling.minutesBetweenMatches}
              onChange={e => updateScheduling('minutesBetweenMatches', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pause zwischen den Spielen
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Pause zw. Phasen (Min)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={scheduling.minutesBetweenPhases}
              onChange={e => updateScheduling('minutesBetweenPhases', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              z.B. vor dem Finale
            </p>
          </div>
        </div>

        {/* Estimation Preview */}
        {estimation && (
          <div className={`mt-4 p-3 rounded-lg ${isTimeExceeded ? 'bg-red-50 border border-red-200' : 'bg-sky-50 border border-sky-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Geschätzte Dauer
                </p>
                <p className="text-xs text-gray-500">
                  {estimation.matchCount} Spiele · ca. {Math.floor(estimation.totalMinutes / 60)}h {estimation.totalMinutes % 60}min
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${isTimeExceeded ? 'text-red-600' : 'text-sky-600'}`}>
                  Ende: {estimation.endTime}
                </p>
                {isTimeExceeded && (
                  <p className="text-xs text-red-600 font-medium">
                    Überschreitet geplante Endzeit!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
