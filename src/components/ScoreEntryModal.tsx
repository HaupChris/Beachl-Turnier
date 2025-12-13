import { useState, useMemo } from 'react';
import type { Match, SetScore } from '../types/tournament';
import { validateScores, validateBestOfThreeScores, getRequiredSetsCount, validateScoreInputs } from '../utils/scoreValidation';
import { ScoreButtonPicker } from './ScoreButtonInput';

interface ScoreEntryModalProps {
  match: Match;
  setsPerMatch: number;
  pointsPerSet: number;
  pointsPerThirdSet?: number;
  getTeamName: (teamId: string | null) => string;
  onClose: () => void;
  onSubmit: (scores: SetScore[]) => void;
}

export function ScoreEntryModal({
  match,
  setsPerMatch,
  pointsPerSet,
  pointsPerThirdSet = 15,
  getTeamName,
  onClose,
  onSubmit,
}: ScoreEntryModalProps) {
  // Initialize scores - start at pointsLimit if no existing scores
  const [scores, setScores] = useState<SetScore[]>(() => {
    if (match.scores.length > 0) {
      // Use existing scores, pad with defaults if needed
      const existing = [...match.scores];
      while (existing.length < setsPerMatch) {
        const limit = existing.length === 2 ? pointsPerThirdSet : pointsPerSet;
        existing.push({ teamA: limit, teamB: limit - 2 });
      }
      return existing;
    }
    // Initialize all sets with default scores at points limit
    return Array(setsPerMatch).fill(null).map((_, i) => {
      const limit = i === 2 ? pointsPerThirdSet : pointsPerSet;
      return { teamA: limit, teamB: limit - 2 };
    });
  });

  const [activeSet, setActiveSet] = useState(0);

  const handleScoreChange = (setIndex: number, team: 'teamA' | 'teamB', value: number) => {
    const newScores = [...scores];
    newScores[setIndex] = { ...newScores[setIndex], [team]: value };
    setScores(newScores);
  };

  // For Best of 3: determine if third set is needed
  const requiredSets = useMemo(
    () => getRequiredSetsCount(scores, setsPerMatch),
    [scores, setsPerMatch]
  );

  // Check if third set input should be shown
  const showThirdSet = setsPerMatch === 3 && (
    // Show if we need 3 sets (1:1 after 2 sets)
    requiredSets === 3 ||
    // Or if third set has non-default scores
    (scores[2] && (scores[2].teamA !== pointsPerThirdSet || scores[2].teamB !== pointsPerThirdSet - 2))
  );

  const handleSubmit = () => {
    // For Best of 3: only include sets that were actually played
    let finalScores: SetScore[];
    if (setsPerMatch === 3) {
      const requiredCount = getRequiredSetsCount(scores, setsPerMatch);
      finalScores = scores.slice(0, requiredCount);

      // First validate that inputs are valid integers >= 0
      const inputError = validateScoreInputs(finalScores);
      if (inputError) {
        alert(inputError);
        return;
      }

      const validationError = validateBestOfThreeScores(finalScores, {
        setsPerMatch,
        pointsPerSet,
        pointsPerThirdSet,
      });

      if (validationError) {
        alert(validationError);
        return;
      }
    } else {
      finalScores = scores;

      // First validate that inputs are valid integers >= 0
      const inputError = validateScoreInputs(finalScores);
      if (inputError) {
        alert(inputError);
        return;
      }

      const validationError = validateScores(finalScores, pointsPerSet);

      if (validationError) {
        alert(validationError);
        return;
      }
    }

    onSubmit(finalScores);
    onClose();
  };

  // Determine which sets to show
  const visibleSets = setsPerMatch === 3
    ? (showThirdSet ? [0, 1, 2] : [0, 1])
    : Array.from({ length: setsPerMatch }, (_, i) => i);

  // Get team names with placeholder support
  const teamAName = match.teamAId ? getTeamName(match.teamAId) : (match.teamAPlaceholder || 'TBD');
  const teamBName = match.teamBId ? getTeamName(match.teamBId) : (match.teamBPlaceholder || 'TBD');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Ergebnis eintragen</h3>

        {/* Team names header */}
        <div className="mb-4 text-center">
          <div className="text-base font-medium text-gray-800">
            {teamAName}
          </div>
          <div className="text-gray-400 text-sm">vs</div>
          <div className="text-base font-medium text-gray-800">
            {teamBName}
          </div>
        </div>

        {/* Set tabs */}
        <div className="flex justify-center gap-2 mb-4">
          {visibleSets.map(index => {
            const isThirdSet = index === 2;
            const currentPointsLimit = isThirdSet ? pointsPerThirdSet : pointsPerSet;
            const score = scores[index];
            const hasWinner = score.teamA !== score.teamB;

            return (
              <button
                key={index}
                onClick={() => setActiveSet(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSet === index
                    ? 'bg-sky-600 text-white'
                    : hasWinner
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div>Satz {index + 1}</div>
                {activeSet !== index && (
                  <div className="text-xs opacity-75">
                    {score.teamA}:{score.teamB}
                  </div>
                )}
                {isThirdSet && activeSet === index && (
                  <div className="text-xs opacity-75">({currentPointsLimit}P)</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active set score input with +/- buttons */}
        <div className="py-4">
          <ScoreButtonPicker
            teamAScore={scores[activeSet].teamA}
            teamBScore={scores[activeSet].teamB}
            onTeamAChange={(value) => handleScoreChange(activeSet, 'teamA', value)}
            onTeamBChange={(value) => handleScoreChange(activeSet, 'teamB', value)}
            teamAName={teamAName}
            teamBName={teamBName}
          />
        </div>

        {/* Current scores summary */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-500 text-center mb-2">Aktueller Spielstand</div>
          <div className="flex justify-center gap-4">
            {visibleSets.map(index => (
              <div
                key={index}
                className={`text-center ${activeSet === index ? 'font-bold text-sky-600' : 'text-gray-600'}`}
              >
                <div className="text-xs text-gray-400">Satz {index + 1}</div>
                <div className="text-lg font-mono">
                  {scores[index].teamA}:{scores[index].teamB}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mb-2">
          Punktelimit: {pointsPerSet} Punkte
          {setsPerMatch === 3 && pointsPerThirdSet !== pointsPerSet && (
            <span> ({pointsPerThirdSet} im 3. Satz)</span>
          )}
        </p>

        {setsPerMatch === 3 && !showThirdSet && requiredSets === 2 && (
          <p className="text-xs text-green-600 text-center mb-2">
            Match entschieden - 3. Satz nicht erforderlich
          </p>
        )}

        <div className="flex space-x-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Ergebnis eintragen
          </button>
        </div>
      </div>
    </div>
  );
}
