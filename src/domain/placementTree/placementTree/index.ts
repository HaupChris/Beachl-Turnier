/**
 * Placement Tree Module
 *
 * Full placement tree where all positions 1..N are played out.
 */

export { generatePlacementTreeTournament } from './generator';
export { generatePlacementTreeTournamentPlaceholder } from './placeholderGenerator';
export { populatePlacementTreeTeams } from './populateTeams';
export { updatePlacementTreeBracket } from './bracketUpdater';
export {
  calculatePlacementTreePlacements,
  getPlacementRoundLabel,
  getPlacementTreeMatchCount,
} from './placements';
export type { PlacementToken } from './types';
