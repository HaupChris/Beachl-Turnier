import { useRef, useEffect, useCallback, useState } from 'react';

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

// Desktop-friendly number input with +/- buttons
function DesktopNumberInput({
  value,
  onChange,
  min = 0,
  max = 40,
  label,
}: WheelPickerProps) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const parsed = parseInt(newValue);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
      setInputValue(String(min));
    } else if (parsed > max) {
      onChange(max);
      setInputValue(String(max));
    }
  };

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-gray-500 mb-1">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xl font-bold text-gray-700 transition-colors"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-16 h-12 text-center text-2xl font-bold text-sky-700 border-2 border-sky-200 rounded-lg focus:border-sky-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xl font-bold text-gray-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 40,
  label,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const scrollToValue = useCallback((val: number, smooth = true) => {
    if (!containerRef.current) return;
    const index = val - min;
    const scrollTop = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: scrollTop,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [min]);

  useEffect(() => {
    // Initial scroll to value
    scrollToValue(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Update scroll position when value changes externally
    if (!isScrollingRef.current) {
      scrollToValue(value, false);
    }
  }, [value, scrollToValue]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    isScrollingRef.current = true;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout to snap to nearest value
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const newValue = Math.max(min, Math.min(max, min + index));

      // Snap to the nearest item
      scrollToValue(newValue, true);

      if (newValue !== value) {
        onChange(newValue);
      }

      isScrollingRef.current = false;
    }, 100);
  };

  const handleItemClick = (val: number) => {
    onChange(val);
    scrollToValue(val, true);
  };

  // Calculate padding to center items
  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-gray-500 mb-1">{label}</span>
      )}
      <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
        {/* Selection highlight */}
        <div
          className="absolute left-0 right-0 bg-sky-100 rounded-lg pointer-events-none z-0"
          style={{
            top: paddingItems * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"
          style={{ height: ITEM_HEIGHT * 1.5 }}
        />

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"
          style={{ height: ITEM_HEIGHT * 1.5 }}
        />

        {/* Scrollable container */}
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll scrollbar-hide relative z-5"
          onScroll={handleScroll}
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Top padding */}
          <div style={{ height: paddingItems * ITEM_HEIGHT }} />

          {/* Values */}
          {values.map((val) => (
            <div
              key={val}
              onClick={() => handleItemClick(val)}
              className={`flex items-center justify-center cursor-pointer transition-all ${
                val === value
                  ? 'text-sky-700 font-bold text-2xl'
                  : 'text-gray-400 text-lg'
              }`}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
              }}
            >
              {val}
            </div>
          ))}

          {/* Bottom padding */}
          <div style={{ height: paddingItems * ITEM_HEIGHT }} />
        </div>
      </div>
    </div>
  );
}

interface ScoreWheelPickerProps {
  teamAScore: number;
  teamBScore: number;
  onTeamAChange: (value: number) => void;
  onTeamBChange: (value: number) => void;
  teamAName?: string;
  teamBName?: string;
}

// Hook to detect if user is on a touch device
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Check for touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Also check screen width - on larger screens prefer desktop input even if touch capable
    const isLargeScreen = window.matchMedia('(min-width: 768px)').matches;
    setIsTouch(isTouchDevice && !isLargeScreen);

    const handleResize = () => {
      const isLarge = window.matchMedia('(min-width: 768px)').matches;
      setIsTouch(isTouchDevice && !isLarge);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTouch;
}

export function ScoreWheelPicker({
  teamAScore,
  teamBScore,
  onTeamAChange,
  onTeamBChange,
  teamAName = 'Team A',
  teamBName = 'Team B',
}: ScoreWheelPickerProps) {
  const isTouchDevice = useIsTouchDevice();

  // Desktop version with number inputs
  if (!isTouchDevice) {
    return (
      <div className="flex items-center justify-center gap-6 md:gap-8">
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 font-medium mb-3 truncate max-w-[120px]" title={teamAName}>
            {teamAName.length > 15 ? teamAName.slice(0, 15) + '...' : teamAName}
          </span>
          <DesktopNumberInput
            value={teamAScore}
            onChange={onTeamAChange}
            min={0}
            max={40}
          />
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-gray-300 text-4xl font-light mt-6">:</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 font-medium mb-3 truncate max-w-[120px]" title={teamBName}>
            {teamBName.length > 15 ? teamBName.slice(0, 15) + '...' : teamBName}
          </span>
          <DesktopNumberInput
            value={teamBScore}
            onChange={onTeamBChange}
            min={0}
            max={40}
          />
        </div>
      </div>
    );
  }

  // Mobile version with wheel picker
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-600 font-medium mb-2 truncate max-w-[80px]" title={teamAName}>
          {teamAName.length > 10 ? teamAName.slice(0, 10) + '...' : teamAName}
        </span>
        <WheelPicker
          value={teamAScore}
          onChange={onTeamAChange}
          min={0}
          max={40}
        />
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className="text-gray-300 text-3xl font-light mt-6">:</span>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-600 font-medium mb-2 truncate max-w-[80px]" title={teamBName}>
          {teamBName.length > 10 ? teamBName.slice(0, 10) + '...' : teamBName}
        </span>
        <WheelPicker
          value={teamBScore}
          onChange={onTeamBChange}
          min={0}
          max={40}
        />
      </div>
    </div>
  );
}
