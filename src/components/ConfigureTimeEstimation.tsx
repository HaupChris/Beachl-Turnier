import type { SchedulingSettings } from '../types/tournament';
import { SchedulingSection } from './SchedulingSection';

interface TimeEstimation {
  phase1Name: string;
  phase1Matches: number;
  phase1Minutes: number;
  phase2Name: string | null;
  phase2Matches: number;
  phase2Minutes: number;
  totalMinutes: number;
  hasPhase2: boolean;
}

interface ConfigureTimeEstimationProps {
  scheduling: SchedulingSettings;
  onSchedulingChange: (settings: SchedulingSettings) => void;
  timeEstimation: TimeEstimation | null;
  getEndTime: () => string | null;
  formatDuration: (minutes: number) => string;
}

export function ConfigureTimeEstimation({
  scheduling,
  onSchedulingChange,
  timeEstimation,
  getEndTime,
  formatDuration,
}: ConfigureTimeEstimationProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-700">Zeitplanung</h3>

      <SchedulingSection
        scheduling={scheduling}
        onSchedulingChange={onSchedulingChange}
        estimation={null}
      />

      {/* Combined Time Estimation */}
      {timeEstimation && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-amber-800">Geschätzte Turnierdauer (gesamt)</span>
            <span className="font-bold text-amber-900 text-lg">
              ca. {formatDuration(timeEstimation.totalMinutes)}
            </span>
          </div>

          <div className="border-t border-amber-200 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">
                {timeEstimation.phase1Name} ({timeEstimation.phase1Matches} Spiele)
              </span>
              <span className="text-amber-800">{formatDuration(timeEstimation.phase1Minutes)}</span>
            </div>

            {timeEstimation.hasPhase2 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">
                  {timeEstimation.phase2Name} ({timeEstimation.phase2Matches} Spiele)
                </span>
                <span className="text-amber-800">{formatDuration(timeEstimation.phase2Minutes)}</span>
              </div>
            )}
          </div>

          {scheduling.startTime && (
            <div className="border-t border-amber-200 pt-3 flex justify-between">
              <span className="text-amber-700">
                Start: {scheduling.startTime} Uhr
              </span>
              <span className="font-medium text-amber-800">
                Ende: ca. {getEndTime()} Uhr
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
