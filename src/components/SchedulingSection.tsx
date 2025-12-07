import type { SchedulingSettings } from '../types/tournament';
import { parseTimeToMinutes } from '../utils/scheduling';

interface SchedulingSectionProps {
  scheduling: SchedulingSettings;
  onSchedulingChange: (scheduling: SchedulingSettings) => void;
  estimation: {
    matchCount: number;
    totalMinutes: number;
    endTime: string;
  } | null;
}

export function SchedulingSection({
  scheduling,
  onSchedulingChange,
  estimation,
}: SchedulingSectionProps) {
  const updateScheduling = (field: keyof SchedulingSettings, value: string | number) => {
    onSchedulingChange({ ...scheduling, [field]: value });
  };

  const isTimeExceeded = estimation
    ? parseTimeToMinutes(estimation.endTime) > parseTimeToMinutes(scheduling.endTime)
    : false;

  return (
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
  );
}
