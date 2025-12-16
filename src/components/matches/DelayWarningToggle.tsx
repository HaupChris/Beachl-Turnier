interface DelayWarningToggleProps {
  showDelayWarnings: boolean;
  onToggle: () => void;
}

export function DelayWarningToggle({ showDelayWarnings, onToggle }: DelayWarningToggleProps) {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">
          Zeitverzug anzeigen
        </span>
        <span className="text-xs text-gray-500">
          (Warnung bei &gt;10 Min. Verzug)
        </span>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          showDelayWarnings ? 'bg-amber-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            showDelayWarnings ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
