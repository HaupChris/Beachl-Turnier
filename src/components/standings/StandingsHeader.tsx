interface StandingsHeaderProps {
  title: string;
  completedMatches: number;
  totalMatches: number;
}

export function StandingsHeader({ title, completedMatches, totalMatches }: StandingsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <span className="text-sm text-gray-500">
        {completedMatches}/{totalMatches} Spiele gespielt
      </span>
    </div>
  );
}
