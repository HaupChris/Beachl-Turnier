import type { TournamentSystem, KnockoutSettings } from '../types/tournament';

interface ConfigurePhase2SettingsProps {
  system: TournamentSystem;
  isGroupBasedSystem: boolean;
  enablePlayoff: boolean;
  onEnablePlayoffChange: (value: boolean) => void;
  knockoutSettings: KnockoutSettings;
  onKnockoutSettingsChange: (settings: KnockoutSettings) => void;
  teamsPerGroup: 3 | 4 | 5;
}

export function ConfigurePhase2Settings({
  system,
  isGroupBasedSystem,
  enablePlayoff,
  onEnablePlayoffChange,
  knockoutSettings,
  onKnockoutSettingsChange,
  teamsPerGroup,
}: ConfigurePhase2SettingsProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      {isGroupBasedSystem ? (
        // Group-based systems: K.O./Placement phase is mandatory
        <>
          <h3 className="font-semibold text-gray-700">
            {system === 'group-phase' && 'Phase 2: K.O.-Phase'}
            {system === 'beachl-all-placements' && 'Phase 2: Platzierungsbaum'}
            {system === 'beachl-short-main' && 'Phase 2: Hauptrunde'}
          </h3>
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-sky-800">
              {system === 'group-phase' && teamsPerGroup === 3 && (
                <><strong>3er-Gruppen:</strong> Gruppensieger direkt ins Viertelfinale, 2. und 3. spielen in der Zwischenrunde um die restlichen Plätze.</>
              )}
              {system === 'group-phase' && teamsPerGroup === 4 && (
                <><strong>4er-Gruppen (SSVB):</strong> Gruppensieger ins Viertelfinale, 2. und 3. in die Zwischenrunde, Gruppenletzte scheiden aus.</>
              )}
              {system === 'group-phase' && teamsPerGroup === 5 && (
                <><strong>5er-Gruppen:</strong> Platz 1+2 direkt ins Viertelfinale, 3. und 4. in die Zwischenrunde, Gruppenletzte scheiden aus.</>
              )}
              {system === 'beachl-all-placements' && (
                <><strong>Alle Platzierungen:</strong> Vollständiger Platzierungsbaum – alle Plätze 1 bis N werden in K.O.-Spielen ausgespielt.</>
              )}
              {system === 'beachl-short-main' && (
                <><strong>Verkürzte Hauptrunde:</strong> Gruppensieger haben ein Freilos, 2./3. spielen Quali, 4. spielen um Plätze 13-16.</>
              )}
            </p>
          </div>
        </>
      ) : (
        // RR/Swiss: Finale is optional
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Phase 2: Finale (optional)</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePlayoff}
                onChange={e => onEnablePlayoffChange(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-gray-700">Finale aktivieren</span>
            </label>
          </div>
          {!enablePlayoff && (
            <p className="text-sm text-gray-500">
              Aktiviere die Finale-Phase, um nach der Vorrunde Platzierungsspiele durchzuführen.
            </p>
          )}
        </>
      )}

      {/* K.O./Finale Settings (shown when enabled or for group-based systems) */}
      {(isGroupBasedSystem || enablePlayoff) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Sätze pro Spiel
              </label>
              <select
                value={knockoutSettings.setsPerMatch}
                onChange={e => onKnockoutSettingsChange({
                  ...knockoutSettings,
                  setsPerMatch: parseInt(e.target.value),
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value={1}>1 Satz</option>
                <option value={2}>Best of 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Punkte pro Satz
              </label>
              <select
                value={knockoutSettings.pointsPerSet}
                onChange={e => onKnockoutSettingsChange({
                  ...knockoutSettings,
                  pointsPerSet: parseInt(e.target.value),
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value={15}>15 Punkte</option>
                <option value={21}>21 Punkte</option>
              </select>
            </div>

            {knockoutSettings.setsPerMatch === 2 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Punkte 3. Satz
                </label>
                <select
                  value={knockoutSettings.pointsPerThirdSet || 15}
                  onChange={e => onKnockoutSettingsChange({
                    ...knockoutSettings,
                    pointsPerThirdSet: parseInt(e.target.value),
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={15}>15 Punkte</option>
                  <option value={21}>21 Punkte</option>
                </select>
              </div>
            )}
          </div>

          {isGroupBasedSystem && (
            <div className="flex flex-wrap gap-4">
              {/* Only show 3rd place checkbox for SSVB (other formats play all placements anyway) */}
              {system === 'group-phase' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={knockoutSettings.playThirdPlaceMatch}
                    onChange={e => onKnockoutSettingsChange({
                      ...knockoutSettings,
                      playThirdPlaceMatch: e.target.checked,
                    })}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Spiel um Platz 3</span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={knockoutSettings.useReferees}
                  onChange={e => onKnockoutSettingsChange({
                    ...knockoutSettings,
                    useReferees: e.target.checked,
                  })}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                />
                <span className="text-sm text-gray-700">Schiedsrichter-Zuweisung</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
