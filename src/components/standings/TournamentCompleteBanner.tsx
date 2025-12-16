interface TournamentCompleteBannerProps {
  winnerName: string;
  message?: string;
}

export function TournamentCompleteBanner({ winnerName, message = 'Turnier beendet!' }: TournamentCompleteBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
      <span className="text-2xl mb-2 block">🏆</span>
      <p className="font-bold text-amber-800">{message}</p>
      <p className="text-amber-700">Gewinner: {winnerName}</p>
    </div>
  );
}
