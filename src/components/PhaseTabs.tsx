import { useNavigate, useLocation } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

export function PhaseTabs() {
  const { currentTournament, currentContainer, containerPhases, dispatch } = useTournament();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't render if no container or only one phase
  if (!currentContainer || containerPhases.length <= 1) {
    return null;
  }

  const handlePhaseChange = (phaseIndex: number) => {
    const targetPhase = containerPhases[phaseIndex];
    if (!targetPhase) return;

    dispatch({
      type: 'SET_CURRENT_PHASE',
      payload: {
        containerId: currentContainer.id,
        phaseIndex,
      },
    });

    // Update URL with new tournament ID
    // Determine the current page type from the location
    const pathParts = location.pathname.split('/');
    const currentPage = pathParts[pathParts.length - 1];

    // Build new URL with the tournament ID
    let newPath = `/tournament/${currentContainer.id}`;
    if (currentPage === 'matches' || location.pathname.includes('/matches')) {
      newPath += `/matches/${targetPhase.id}`;
    } else if (currentPage === 'standings' || location.pathname.includes('/standings')) {
      newPath += `/standings/${targetPhase.id}`;
    } else if (currentPage === 'configure' || location.pathname.includes('/configure')) {
      newPath += `/configure`;
    }

    navigate(newPath);
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4">
        <nav className="flex space-x-1" aria-label="Turnierphasen">
          {containerPhases.map((phase, index) => {
            const isActive = phase.id === currentTournament?.id;
            const isCompleted = phase.status === 'completed';

            return (
              <button
                key={phase.id}
                onClick={() => handlePhaseChange(index)}
                className={`
                  relative py-3 px-4 text-sm font-medium rounded-t-lg transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  {isCompleted && !isActive && (
                    <span className="text-green-500">&#10003;</span>
                  )}
                  {phase.phaseName || `Phase ${index + 1}`}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
