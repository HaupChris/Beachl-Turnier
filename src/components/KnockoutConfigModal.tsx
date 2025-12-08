import { useState } from 'react';
import type { Tournament, KnockoutSettings, Team } from '../types/tournament';

interface KnockoutConfigModalProps {
  tournament: Tournament;
  onConfirm: (settings: KnockoutSettings) => void;
  onCancel: () => void;
}

export function KnockoutConfigModal({
  tournament,
  onConfirm,
  onCancel,
}: KnockoutConfigModalProps) {
  const [setsPerMatch, setSetsPerMatch] = useState(tournament.setsPerMatch);
  const [pointsPerSet, setPointsPerSet] = useState(tournament.pointsPerSet);
  const [pointsPerThirdSet, setPointsPerThirdSet] = useState(tournament.pointsPerThirdSet || 15);
  const [playThirdPlaceMatch, setPlayThirdPlaceMatch] = useState(true);
  const [useReferees, setUseReferees] = useState(false);

  const groupStandings = tournament.groupStandings || [];
  const groups = tournament.groupPhaseConfig?.groups || [];

  // Get teams by group rank
  const getTeamsByRank = (rank: number): { team: Team | undefined; groupName: string }[] => {
    return groups.map(group => {
      const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
      const team = standing ? tournament.teams.find(t => t.id === standing.teamId) : undefined;
      return { team, groupName: group.name };
    });
  };

  const groupWinners = getTeamsByRank(1);
  const secondPlace = getTeamsByRank(2);
  const thirdPlace = getTeamsByRank(3);
  const fourthPlace = getTeamsByRank(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      setsPerMatch,
      pointsPerSet,
      pointsPerThirdSet: setsPerMatch === 3 ? pointsPerThirdSet : undefined,
      playThirdPlaceMatch,
      useReferees,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">K.O.-Phase konfigurieren</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Bracket Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Vorschau: Turnierbaum</h3>

            {/* Group Winners - Direct to Quarterfinals */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-700 mb-2">
                Direkt im Viertelfinale (Gruppensieger):
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {groupWinners.map(({ team, groupName }) => (
                  <div
                    key={groupName}
                    className="bg-green-50 border border-green-200 rounded px-2 py-1 text-sm"
                  >
                    <span className="text-green-600 text-xs">{groupName}</span>
                    <br />
                    <span className="font-medium">{team?.name || 'Unbekannt'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Intermediate Round Preview */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-sky-700 mb-2">
                Zwischenrunde (2. vs 3.):
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {groups.length === 4 && (
                  <>
                    <div className="bg-sky-50 border border-sky-200 rounded px-2 py-1">
                      <span className="text-sky-600">2A vs 3D:</span>{' '}
                      {secondPlace[0]?.team?.name} vs {thirdPlace[3]?.team?.name}
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded px-2 py-1">
                      <span className="text-sky-600">2B vs 3C:</span>{' '}
                      {secondPlace[1]?.team?.name} vs {thirdPlace[2]?.team?.name}
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded px-2 py-1">
                      <span className="text-sky-600">2C vs 3B:</span>{' '}
                      {secondPlace[2]?.team?.name} vs {thirdPlace[1]?.team?.name}
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded px-2 py-1">
                      <span className="text-sky-600">2D vs 3A:</span>{' '}
                      {secondPlace[3]?.team?.name} vs {thirdPlace[0]?.team?.name}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Eliminated Teams */}
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">
                Ausgeschieden (Gruppenletzte):
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {fourthPlace.map(({ team, groupName }) => (
                  <div
                    key={groupName}
                    className="bg-red-50 border border-red-200 rounded px-2 py-1 text-sm text-red-700"
                  >
                    <span className="text-xs">{groupName}</span>
                    <br />
                    {team?.name || 'Unbekannt'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Match Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Spieleinstellungen K.O.-Phase</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Sätze pro Match
                </label>
                <select
                  value={setsPerMatch}
                  onChange={e => setSetsPerMatch(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={1}>1 Satz</option>
                  <option value={2}>2 Sätze</option>
                  <option value={3}>Best of 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Punkte pro Satz
                </label>
                <select
                  value={pointsPerSet}
                  onChange={e => setPointsPerSet(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={15}>15 Punkte</option>
                  <option value={21}>21 Punkte</option>
                </select>
              </div>
            </div>

            {setsPerMatch === 3 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Punkte im 3. Satz
                </label>
                <select
                  value={pointsPerThirdSet}
                  onChange={e => setPointsPerThirdSet(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={15}>15 Punkte</option>
                  <option value={21}>21 Punkte</option>
                </select>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Zusätzliche Optionen</h3>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={playThirdPlaceMatch}
                onChange={e => setPlayThirdPlaceMatch(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-gray-700">Spiel um Platz 3</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useReferees}
                onChange={e => setUseReferees(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
              />
              <div>
                <span className="text-sm text-gray-700">Schiedsrichter zuweisen</span>
                <p className="text-xs text-gray-500">
                  Ausgeschiedene Teams fungieren als Schiedsrichter
                </p>
              </div>
            </label>
          </div>

          {/* Placement Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-medium text-amber-800 text-sm mb-1">Platzierungen</h4>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>Platz 1-4: Werden einzeln ausgespielt</li>
              <li>Platz 5-8: Verlierer Viertelfinale (gemeinsame Platzierung)</li>
              <li>Platz 9-12: Verlierer Zwischenrunde (gemeinsame Platzierung)</li>
              <li>Platz 13-16: Gruppenletzte (gemeinsame Platzierung)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
            >
              K.O.-Phase starten
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
