import type { TournamentSystem } from '../types/tournament';

interface ConfigureBasicSettingsProps {
  name: string;
  onNameChange: (name: string) => void;
  system: TournamentSystem;
  onSystemChange: (system: TournamentSystem) => void;
  numberOfCourtsInput: string;
  onNumberOfCourtsInputChange: (value: string) => void;
  numberOfCourts: number;
}

export function ConfigureBasicSettings({
  name,
  onNameChange,
  system,
  onSystemChange,
  numberOfCourtsInput,
  onNumberOfCourtsInputChange,
  numberOfCourts,
}: ConfigureBasicSettingsProps) {

  const getSystemDescription = () => {
    if (system == "swiss"){
      return "Teams mit ähnlicher Punktzahl spielen gegeneinander."
    }
    if (system == "group-phase"){
      return "Gruppenphase, dann K.O.-Phase mit Zwischenrunde. Gruppenletzte scheiden aus."
    }
    if (system == "beachl-all-placements"){
      return "Alle Plätze 1–N werden in einem vollständigen Platzierungsbaum ausgespielt."
    }
    if (system == "beachl-short-main"){
      return "Verkürzte Hauptrunde: Top-Seeds haben Byes, separate Teilbäume für Platzierungsbereiche."
    }
  }

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
          <option value="round-robin">BeachL Speed (Jeder gegen Jeden)</option>
          <option value="swiss">BeachL Speed (Schweizer System)</option>
          <option value="beachl-all-placements">BeachL Alle Platzierungen (Gruppenphase + Baum)</option>
          <option value="beachl-short-main">BeachL Kurze Hauptrunde (Gruppenphase + Baum)</option>
          <option value="group-phase">SSVB (Gruppenphase + Single Out)</option>
          <option value="group-phase" disabled={true}>SSVB (Double Out) (to be done)</option>

        </select>

          <p className="text-sm text-gray-500 mt-1">
            {getSystemDescription()}
          </p>

      </div>

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
          onBlur={() => onNumberOfCourtsInputChange(String(Math.max(1, Math.min(10, numberOfCourts))))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>
    </div>
  );
}
