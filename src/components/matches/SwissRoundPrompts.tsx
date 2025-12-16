interface NextRoundPromptProps {
  currentRound: number;
  onGenerateNextRound: () => void;
}

export function NextRoundPrompt({ currentRound, onGenerateNextRound }: NextRoundPromptProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-800 mb-3">
        Runde {currentRound} abgeschlossen! Paarungen für die nächste Runde werden basierend auf
        den aktuellen Standings berechnet.
      </p>
      <button
        onClick={onGenerateNextRound}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Runde {currentRound + 1} starten
      </button>
    </div>
  );
}

export function SwissCompleteBanner() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
      <span className="text-2xl mb-2 block">🏆</span>
      <p className="font-bold text-green-800">Alle Runden abgeschlossen!</p>
      <p className="text-sm text-green-700">Schau dir die finale Tabelle an.</p>
    </div>
  );
}
