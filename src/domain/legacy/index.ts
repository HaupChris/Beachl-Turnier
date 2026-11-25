/**
 * Legacy Adapters
 *
 * Temporary re-exports of legacy utilities while the domain layer
 * becomes the single source of truth. These will be replaced by
 * domain-native implementations over time.
 */

// Knockout
export {
  getKnockoutRoundLabel,
  calculateKnockoutPlacements,
  populateKnockoutTeams,
  updateKnockoutBracket,
  generateKnockoutTournament,
  generateKnockoutTournamentPlaceholder,
} from '../../utils/knockout';

// Short main round
export {
  getShortMainRoundLabel,
  calculateShortMainRoundPlacements,
  populateShortMainRoundTeams,
  updateShortMainRoundBracket,
  generateShortMainRoundTournament,
  generateShortMainRoundTournamentPlaceholder,
} from '../../utils/shortMainRound';

// Placement tree
export {
  getPlacementRoundLabel,
  calculatePlacementTreePlacements,
  populatePlacementTreeTeams,
  updatePlacementTreeBracket,
  generatePlacementTreeTournament,
  generatePlacementTreeTournamentPlaceholder,
} from '../../utils/placementTree/index';

// Playoff
export {
  getPlayoffMatchLabel,
  populatePlayoffTeams,
  generatePlayoffTournament,
  generatePlayoffTournamentPlaceholder,
} from '../../utils/playoff';

// Score validation
export {
  validateScores,
  validateBestOfThreeScores,
  getRequiredSetsCount,
  validateScoreInputs,
} from '../../utils/scoreValidation';

// Scheduling
export {
  DEFAULT_SCHEDULING,
  estimateTournamentDuration,
  calculateMatchStartTimeForPhase,
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateMatchDuration,
} from '../../utils/scheduling';

// Time estimation
export {
  formatDuration,
  calculateTimeEstimation,
  calculateEndTime,
} from '../../utils/timeEstimation';

// Group phase
export {
  generateGroups,
  calculateAllGroupStandings,
  generateGroupPhaseMatches,
} from '../../utils/groupPhase';

// Group configuration
export {
  calculateGroupConfiguration,
} from '../../utils/groupConfiguration';

// Standings
export {
  calculateStandings,
} from '../../utils/standings';

// Swiss system
export {
  generateSwissRoundMatches,
} from '../../utils/swissSystem';

// Round robin
export {
  generateRoundRobinMatches,
} from '../../utils/roundRobin';

// Referee assignment
export {
  updateRefereeAssignmentsAfterRound,
  assignAllKnockoutReferees,
} from '../../utils/refereeAssignment';
