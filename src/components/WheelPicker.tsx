import { useRef, useEffect, useCallback } from 'react';

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

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

export function ScoreWheelPicker({
  teamAScore,
  teamBScore,
  onTeamAChange,
  onTeamBChange,
  teamAName = 'Team A',
  teamBName = 'Team B',
}: ScoreWheelPickerProps) {
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
