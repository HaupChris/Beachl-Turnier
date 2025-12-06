import { useState } from 'react';
import type { Match, SetScore } from '../types/tournament';
import { validateScores } from '../utils/scoreValidation';

interface ScoreInput {
  teamA: string;
  teamB: string;
}

interface ScoreEntryModalProps {
  match: Match;
  setsPerMatch: number;
  pointsPerSet: number;
  getTeamName: (teamId: string | null) => string;
  onClose: () => void;
  onSave: (scores: SetScore[]) => void;
  onComplete: (scores: SetScore[]) => void;
}

export function ScoreEntryModal({
  match,
  setsPerMatch,
  pointsPerSet,
  getTeamName,
  onClose,
  onSave,
  onComplete,
}: ScoreEntryModalProps) {
  const [scoreInputs, setScoreInputs] = useState<ScoreInput[]>(() => {
    if (match.scores.length > 0) {
      return match.scores.map(s => ({ teamA: String(s.teamA), teamB: String(s.teamB) }));
    }
    return Array(setsPerMatch).fill(null).map(() => ({ teamA: '', teamB: '' }));
  });

  const handleScoreChange = (setIndex: number, team: 'teamA' | 'teamB', value: string) => {
    const newInputs = [...scoreInputs];
    newInputs[setIndex] = { ...newInputs[setIndex], [team]: value };
    setScoreInputs(newInputs);
  };

  const getScoresFromInputs = (): SetScore[] => {
    return scoreInputs.map(input => ({
      teamA: parseInt(input.teamA) || 0,
      teamB: parseInt(input.teamB) || 0,
    }));
  };

  const handleSave = () => {
    const scores = getScoresFromInputs();
    onSave(scores);
    onClose();
  };

  const handleComplete = () => {
    const scores = getScoresFromInputs();
    const validationError = validateScores(scores, pointsPerSet);

    if (validationError) {
      alert(validationError);
      return;
    }

    onComplete(scores);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Ergebnis eintragen</h3>

        <div className="mb-4 text-center">
          <div className="text-lg font-medium text-gray-800">
            {getTeamName(match.teamAId)}
          </div>
          <div className="text-gray-400">vs</div>
          <div className="text-lg font-medium text-gray-800">
            {getTeamName(match.teamBId)}
          </div>
        </div>

        <div className="space-y-4">
          {scoreInputs.map((input, index) => (
            <div key={index} className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 w-16">Satz {index + 1}</span>
              <input
                type="number"
                min={0}
                value={input.teamA}
                onChange={e => handleScoreChange(index, 'teamA', e.target.value)}
                className="w-16 px-2 py-2 border border-gray-300 rounded text-center"
                placeholder="0"
              />
              <span className="text-gray-400">:</span>
              <input
                type="number"
                min={0}
                value={input.teamB}
                onChange={e => handleScoreChange(index, 'teamB', e.target.value)}
                className="w-16 px-2 py-2 border border-gray-300 rounded text-center"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Punktelimit: {pointsPerSet} Punkte pro Satz
        </p>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            Speichern
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Beenden
          </button>
        </div>
      </div>
    </div>
  );
}
