import type { TournamentSystem, TiebreakerOrder, SchedulingSettings } from '../types/tournament';
import { estimateTournamentDuration } from '../utils/scheduling';
import { SchedulingSection } from './SchedulingSection';

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
          <option value="round-robin">BeachL-Speed (Jeder gegen Jeden)</option>
          <option value="swiss">BeachL-Speed (Schweizer System)</option>
          <option value="group-phase">BeachL-SSVB (Gruppenphase + Single Out)</option>
          <option value="beachl-all-placements">BeachL-All-Platzierungen (Gruppenphase + Baum)</option>
          <option value="beachl-short-main">BeachL-Kurze-Hauptrunde (Gruppenphase + Baum)</option>
        </select>
        {system === 'swiss' && (
          <p className="text-xs text-gray-500 mt-1">
            Teams mit ähnlicher Punktzahl spielen gegeneinander. Paarungen werden nach jeder Runde neu berechnet.
          </p>
        )}
        {system === 'group-phase' && (
          <p className="text-xs text-gray-500 mt-1">
            4er-Gruppen, dann K.O.-Phase mit Zwischenrunde. Gruppenletzte scheiden aus.
          </p>
        )}
        {system === 'beachl-all-placements' && (
          <p className="text-xs text-gray-500 mt-1">
            Alle Plätze 1–N werden in einem vollständigen Platzierungsbaum ausgespielt.
          </p>
        )}
        {system === 'beachl-short-main' && (
          <p className="text-xs text-gray-500 mt-1">
            Verkürzte Hauptrunde: Top-Seeds haben Byes, separate Teilbäume für Platzierungsbereiche.
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

      <SchedulingSection
        scheduling={scheduling}
        onSchedulingChange={onSchedulingChange}
        estimation={estimation}
      />
    </div>
  );
}
