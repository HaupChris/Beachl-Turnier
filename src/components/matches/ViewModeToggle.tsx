interface ViewModeToggleProps {
  viewMode: 'list' | 'bracket';
  onViewModeChange: (mode: 'list' | 'bracket') => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
        <button
          onClick={() => onViewModeChange('list')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Liste
        </button>
        <button
          onClick={() => onViewModeChange('bracket')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'bracket'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Turnierbaum
        </button>
      </div>
    </div>
  );
}
