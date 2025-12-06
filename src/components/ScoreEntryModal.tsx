import { useState, useMemo } from 'react';
import type { Match, SetScore } from '../types/tournament';
import { validateScores, validateBestOfThreeScores, getRequiredSetsCount, validateScoreInputs } from '../utils/scoreValidation';

interface ScoreInput {
  teamA: string;
  teamB: string;
}

interface ScoreEntryModalProps {
  match: Match;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
  getTeamName: (teamId: string | null) => string;
  onClose: () => void;
  onSave: (scores: SetScore[]) => void;
  onComplete: (scores: SetScore[]) => void;
}

export function ScoreEntryModal({
  match,
  setsPerMatch,
  pointsPerSet,
  pointsPerThirdSet = 15,
  getTeamName,
  onClose,
  onSave,
  onComplete,
}: ScoreEntryModalProps) {
  const [scoreInputs, setScoreInputs] = useState<ScoreInput[]>(() => {
    if (match.scores.length > 0) {
      // Ensure we have all 3 slots for Best of 3
      const inputs = match.scores.map(s => ({ teamA: String(s.teamA), teamB: String(s.teamB) }));
      while (inputs.length < setsPerMatch) {
        inputs.push({ teamA: '', teamB: '' });
      }
      return inputs;
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

  // For Best of 3: determine if third set is needed
  const currentScores = useMemo(
    () => scoreInputs.map(input => ({
      teamA: parseInt(input.teamA) || 0,
      teamB: parseInt(input.teamB) || 0,
    })),
    [scoreInputs]
  );
  const requiredSets = useMemo(
    () => getRequiredSetsCount(currentScores, setsPerMatch),
    [currentScores, setsPerMatch]
  );

  // Check if third set input should be shown
  const showThirdSet = setsPerMatch === 3 && (
    // Show if we need 3 sets (1:1 after 2 sets)
    requiredSets === 3 ||
    // Or if there's already data in the third set
    (scoreInputs[2] && (scoreInputs[2].teamA !== '' || scoreInputs[2].teamB !== ''))
  );

  const handleSave = () => {
    const scores = getScoresFromInputs();
    // For Best of 3, only save the required sets
    const requiredScores = setsPerMatch === 3
      ? scores.slice(0, showThirdSet ? 3 : 2)
      : scores;

    // Validate that inputs are valid integers >= 0
    const inputError = validateScoreInputs(requiredScores);
    if (inputError) {
      alert(inputError);
      return;
    }

    onSave(requiredScores);
    onClose();
  };

  const handleComplete = () => {
    const allScores = getScoresFromInputs();

    // For Best of 3: only include sets that were actually played
    let scores: SetScore[];
    if (setsPerMatch === 3) {
      const requiredCount = getRequiredSetsCount(allScores, setsPerMatch);
      scores = allScores.slice(0, requiredCount);

      // First validate that inputs are valid integers >= 0
      const inputError = validateScoreInputs(scores);
      if (inputError) {
        alert(inputError);
        return;
      }

      const validationError = validateBestOfThreeScores(scores, {
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet,
      });

      if (validationError) {
        alert(validationError);
        return;
      }
    } else {
      scores = allScores;

      // First validate that inputs are valid integers >= 0
      const inputError = validateScoreInputs(scores);
      if (inputError) {
        alert(inputError);
        return;
      }

      const validationError = validateScores(scores, pointsPerSet);

      if (validationError) {
        alert(validationError);
        return;
      }
    }

    onComplete(scores);
    onClose();
  };

  // Determine which sets to show
  const visibleSets = setsPerMatch === 3
    ? (showThirdSet ? [0, 1, 2] : [0, 1])
    : Array.from({ length: setsPerMatch }, (_, i) => i);

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
          {visibleSets.map(index => {
            const input = scoreInputs[index];
            const isThirdSet = index === 2;
            const currentPointsLimit = isThirdSet ? pointsPerThirdSet : pointsPerSet;

            return (
              <div key={index} className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 w-16">
                  Satz {index + 1}
                  {isThirdSet && <span className="text-xs block text-gray-400">({currentPointsLimit}P)</span>}
                </span>
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
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Punktelimit: {pointsPerSet} Punkte pro Satz
          {setsPerMatch === 3 && pointsPerThirdSet !== pointsPerSet && (
            <span> ({pointsPerThirdSet} im 3. Satz)</span>
          )}
        </p>

        {setsPerMatch === 3 && !showThirdSet && requiredSets === 2 && (
          <p className="text-xs text-green-600 mt-1 text-center">
            Match entschieden - 3. Satz nicht erforderlich
          </p>
        )}

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
