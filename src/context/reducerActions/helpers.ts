// Helper to check if a system uses group phase
export const isGroupBasedSystem = (system: string): boolean =>
  system === 'group-phase' || system === 'beachl-all-placements' || system === 'beachl-short-main';
