interface PlacementsListProps {
  placements: { teamId: string; placement: string }[];
  getTeamName: (teamId: string) => string;
  emptyMessage?: string;
}

export function PlacementsList({ placements, getTeamName, emptyMessage = 'Platzierungen werden nach Abschluss der Spiele angezeigt.' }: PlacementsListProps) {
  const getPlacementNumber = (placement: string): number => {
    const match = placement.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 99;
  };

  if (placements.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {placements.map((entry) => {
          const placementNum = getPlacementNumber(entry.placement);

          return (
            <div
              key={entry.teamId}
              className={`flex items-center p-4 ${
                placementNum === 1
                  ? 'bg-yellow-50'
                  : placementNum === 2
                  ? 'bg-gray-50'
                  : placementNum === 3
                  ? 'bg-orange-50'
                  : ''
              }`}
            >
              <span
                className={`inline-flex items-center justify-center min-w-[3rem] h-10 px-2 rounded-full text-sm font-bold mr-4 ${
                  placementNum === 1
                    ? 'bg-yellow-400 text-yellow-900'
                    : placementNum === 2
                    ? 'bg-gray-400 text-white'
                    : placementNum === 3
                    ? 'bg-orange-400 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {entry.placement}
              </span>
              <span className="font-medium text-gray-800 text-lg">
                {getTeamName(entry.teamId)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
