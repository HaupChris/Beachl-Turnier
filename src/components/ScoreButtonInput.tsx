interface ScoreButtonInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function ScoreButtonInput({
  value,
  onChange,
  min = 0,
  max = 40,
  label,
}: ScoreButtonInputProps) {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-gray-600 font-medium mb-2 truncate max-w-[100px]" title={label}>
          {label.length > 12 ? label.slice(0, 12) + '...' : label}
        </span>
      )}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-14 h-14 rounded-full bg-sky-600 text-white text-2xl font-bold flex items-center justify-center hover:bg-sky-700 active:bg-sky-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg">
          <span className="text-3xl font-bold text-gray-800">{value}</span>
        </div>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-14 h-14 rounded-full bg-sky-600 text-white text-2xl font-bold flex items-center justify-center hover:bg-sky-700 active:bg-sky-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>
      </div>
    </div>
  );
}

interface ScoreButtonPickerProps {
  teamAScore: number;
  teamBScore: number;
  onTeamAChange: (value: number) => void;
  onTeamBChange: (value: number) => void;
  teamAName?: string;
  teamBName?: string;
}

export function ScoreButtonPicker({
  teamAScore,
  teamBScore,
  onTeamAChange,
  onTeamBChange,
  teamAName = 'Team A',
  teamBName = 'Team B',
}: ScoreButtonPickerProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <ScoreButtonInput
        value={teamAScore}
        onChange={onTeamAChange}
        min={0}
        max={40}
        label={teamAName}
      />

      <div className="flex flex-col items-center justify-center">
        <span className="text-gray-300 text-4xl font-light">:</span>
      </div>

      <ScoreButtonInput
        value={teamBScore}
        onChange={onTeamBChange}
        min={0}
        max={40}
        label={teamBName}
      />
    </div>
  );
}
