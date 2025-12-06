import { useState } from 'react';
import type { PlayoffSettings, StandingEntry, Team } from '../types/tournament';

interface PlayoffConfigModalProps {
  standings: StandingEntry[];
  teams: Team[];
  defaultSettings: PlayoffSettings;
  onClose: () => void;
  onConfirm: (settings: PlayoffSettings) => void;
}

export function PlayoffConfigModal({
  standings,
  teams,
  defaultSettings,
  onClose,
  onConfirm,
}: PlayoffConfigModalProps) {
  const [setsPerMatch, setSetsPerMatch] = useState(defaultSettings.setsPerMatch);
  const [pointsPerSet, setPointsPerSet] = useState(defaultSettings.pointsPerSet);
  const [pointsPerThirdSet, setPointsPerThirdSet] = useState(
    defaultSettings.pointsPerThirdSet ?? 15
  );

  const getTeamName = (teamId: string): string => {
    return teams.find(t => t.id === teamId)?.name ?? 'Unbekannt';
  };

  // Generate preview of pairings
  const pairings: { teamA: string; teamB: string; place: number }[] = [];
  for (let i = 0; i < standings.length - 1; i += 2) {
    pairings.push({
      teamA: getTeamName(standings[i].teamId),
      teamB: getTeamName(standings[i + 1].teamId),
      place: i + 1,
    });
  }

  const handleSubmit = () => {
    onConfirm({
      setsPerMatch,
      pointsPerSet,
      pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
          Finale Platzierungen ausspielen
        </h3>
        <p className="text-sm text-gray-600 text-center mb-4">
          Erstelle eine Finalrunde, in der jeweils zwei benachbarte Teams in der Tabelle
          die bessere Platzierung ausspielen.
        </p>

        {/* Preview of pairings */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Vorschau der Paarungen:</h4>
          <div className="space-y-2">
            {pairings.map((pairing) => (
              <div key={pairing.place} className="flex items-center text-sm">
                <span className="text-amber-700 font-medium min-w-[70px]">
                  Platz {pairing.place}/{pairing.place + 1}:
                </span>
                <span className="text-gray-700 ml-2">
                  {pairing.teamA} vs {pairing.teamB}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Sätze pro Finalspiel
            </label>
            <select
              value={setsPerMatch}
              onChange={(e) => setSetsPerMatch(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value={1}>1 Satz</option>
              <option value={3}>Best of 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Punkte pro Satz
            </label>
            <select
              value={pointsPerSet}
              onChange={(e) => setPointsPerSet(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                onChange={(e) => setPointsPerThirdSet(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
          >
            Finalrunde starten
          </button>
        </div>
      </div>
    </div>
  );
}
