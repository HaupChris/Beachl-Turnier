interface MatchesHeaderProps {
  isSwissSystem: boolean;
  currentRound: number;
  maxRounds: number;
  completedCount: number;
  totalCount: number;
}

export function MatchesHeader({
  isSwissSystem,
  currentRound,
  maxRounds,
  completedCount,
  totalCount,
}: MatchesHeaderProps) {
  const progressPercent = isSwissSystem
    ? (currentRound / maxRounds) * 100
    : (completedCount / totalCount) * 100;

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Spielplan</h2>
        <span className="text-sm text-gray-500">
          {isSwissSystem ? `Runde ${currentRound}/${maxRounds}` : `${completedCount}/${totalCount} Spiele`}
        </span>
      </div>

      <div className="bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </>
  );
}
