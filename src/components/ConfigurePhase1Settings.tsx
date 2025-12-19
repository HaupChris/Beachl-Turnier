import type { TournamentSystem, TiebreakerOrder, Team, Group } from '../types/tournament';
import { GroupEditor } from './GroupEditor';

interface ConfigurePhase1SettingsProps {
  system: TournamentSystem;
  isGroupBasedSystem: boolean;
  numberOfRoundsInput: string;
  onNumberOfRoundsInputChange: (value: string) => void;
  numberOfRounds: number;
  setsPerMatch: number;
  onSetsPerMatchChange: (value: number) => void;
  pointsPerSet: number;
  onPointsPerSetChange: (value: number) => void;
  pointsPerThirdSet: number;
  onPointsPerThirdSetChange: (value: number) => void;
  tiebreakerOrder: TiebreakerOrder;
  onTiebreakerOrderChange: (value: TiebreakerOrder) => void;
  teamsPerGroup: 3 | 4 | 5;
  onTeamsPerGroupChange: (value: 3 | 4 | 5) => void;
  groupSeeding: 'snake' | 'random' | 'manual';
  onGroupSeedingChange: (value: 'snake' | 'random' | 'manual') => void;
  numberOfGroups: number;
  groups: Group[];
  onGroupsChange: (groups: Group[]) => void;
  teams: Team[];
  byesNeeded: number;
  groupConfigError?: string;
}

export function ConfigurePhase1Settings({
  system,
  isGroupBasedSystem,
  numberOfRoundsInput,
  onNumberOfRoundsInputChange,
  numberOfRounds,
  setsPerMatch,
  onSetsPerMatchChange,
  pointsPerSet,
  onPointsPerSetChange,
  pointsPerThirdSet,
  onPointsPerThirdSetChange,
  tiebreakerOrder,
  onTiebreakerOrderChange,
  teamsPerGroup,
  onTeamsPerGroupChange,
  groupSeeding,
  onGroupSeedingChange,
  numberOfGroups,
  groups,
  onGroupsChange,
  teams,
  byesNeeded,
  groupConfigError,
}: ConfigurePhase1SettingsProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-700">
        {isGroupBasedSystem ? 'Phase 1: Gruppenphase' : system === 'swiss' ? 'Phase 1: Swiss Runden' : 'Phase 1: Vorrunde'}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {system === 'swiss' && (
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
              onBlur={() => onNumberOfRoundsInputChange(String(Math.max(1, Math.min(20, numberOfRounds))))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Sätze pro Spiel
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
        </div>

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
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Tiebreaker
          </label>
          <select
            value={tiebreakerOrder}
            onChange={e => onTiebreakerOrderChange(e.target.value as TiebreakerOrder)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="head-to-head-first">Direkter Vergleich zuerst</option>
            <option value="point-diff-first">Punktedifferenz zuerst</option>
          </select>
        </div>
      </div>

      {setsPerMatch === 2 && (
        <p className="text-xs text-gray-500">
          Bei 2 Sätzen werden gewonnene Sätze statt Matches in der Tabelle gezählt.
        </p>
      )}

      {/* Group Editor (for all group-based systems) */}
      {isGroupBasedSystem && (
        <div className="pt-4 border-t space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h4 className="font-medium text-gray-700">Gruppeneinteilung</h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Teams/Gruppe:</label>
                <select
                  value={teamsPerGroup}
                  onChange={e => onTeamsPerGroupChange(parseInt(e.target.value) as 3 | 4 | 5)}
                  className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value={3}>3er-Gruppen</option>
                  <option value={4}>4er-Gruppen</option>
                  <option value={5}>5er-Gruppen</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Seeding:</label>
                <select
                  value={groupSeeding}
                  onChange={e => onGroupSeedingChange(e.target.value as 'snake' | 'random' | 'manual')}
                  className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="snake">Snake-Draft</option>
                  <option value="random">Zufällig</option>
                  <option value="manual">Manuell</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error message shown inline */}
          {groupConfigError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{groupConfigError}</p>
            </div>
          )}

          {/* Group configuration info with byes */}
          {!groupConfigError && numberOfGroups >= 2 && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                {numberOfGroups} Gruppen à {teamsPerGroup} Teams = {numberOfGroups * teamsPerGroup} Plätze
                {teamsPerGroup === 3 && ' (3 Spiele pro Gruppe)'}
                {teamsPerGroup === 4 && ' (6 Spiele pro Gruppe)'}
                {teamsPerGroup === 5 && ' (10 Spiele pro Gruppe)'}
              </p>
              {byesNeeded > 0 && (
                <p className="text-sm text-amber-600">
                  {byesNeeded} Freilos{byesNeeded > 1 ? 'e' : ''} werden automatisch verteilt
                </p>
              )}
            </div>
          )}

          <GroupEditor
            groups={groups}
            teams={teams}
            onGroupsChange={(newGroups) => {
              onGroupsChange(newGroups);
              onGroupSeedingChange('manual');
            }}
            disabled={false}
          />
        </div>
      )}
    </div>
  );
}
