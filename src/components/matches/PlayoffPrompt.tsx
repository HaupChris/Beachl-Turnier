interface PlayoffPromptProps {
  onOpenModal: () => void;
}

export function PlayoffPrompt({ onOpenModal }: PlayoffPromptProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🏅</span>
        <h4 className="font-semibold text-amber-800">Finale Platzierungen ausspielen</h4>
      </div>
      <p className="text-sm text-amber-700 mb-3">
        Erstelle eine Finalrunde, in der jeweils zwei benachbarte Teams in der aktuellen
        Tabelle die bessere Platzierung ausspielen (1. vs 2. um Platz 1, 3. vs 4. um Platz 3, usw.).
      </p>
      <button
        onClick={onOpenModal}
        className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
      >
        Finalrunde konfigurieren
      </button>
    </div>
  );
}
