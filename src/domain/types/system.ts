/**
 * Tournament System Type Definitions
 *
 * This module defines all tournament system types and provides type guards
 * for safe type narrowing throughout the application.
 *
 * Naming Convention:
 * - Standalone modes: descriptive name (e.g., 'round-robin', 'swiss')
 * - Group-based modes: 'groups-' prefix (e.g., 'groups-full-placement')
 * - Internal phase types: descriptive suffix (e.g., 'placement-tree')
 */

// =============================================================================
// TOURNAMENT SYSTEM TYPES
// =============================================================================

/**
 * Standalone tournament systems (single phase, no group stage)
 */
export type StandaloneSystem =
  | 'round-robin'          // Mode 1: Every team plays every other team
  | 'round-robin-playoff'  // Mode 1 + Finale: Round-robin with neighbor-based playoff
  | 'swiss';               // Mode 2: Dynamic pairing by strength

/**
 * Group-based tournament systems (Phase 1: Groups → Phase 2: Knockout/Tree)
 */
export type GroupBasedSystem =
  | 'groups-only'           // Groups without knockout phase
  | 'groups-full-placement' // Mode 3A: Groups → Full placement tree (all rankings)
  | 'groups-split-bracket'  // Mode 3B: Groups → Tiered split brackets
  | 'groups-ssvb-knockout'; // Mode 3C: Groups → SSVB single elimination with cutoff

/**
 * Internal knockout phase types (used as Phase 2 of group-based tournaments)
 */
export type KnockoutPhaseSystem =
  | 'placement-tree'       // Full placement tree knockout (for Mode 3A)
  | 'short-main-knockout'; // Split bracket knockout (for Mode 3B)

/**
 * Legacy tournament system names (for backward compatibility)
 */
export type LegacySystem =
  | 'playoff'                // Legacy: use 'round-robin-playoff'
  | 'group-phase'            // Legacy: use 'groups-only'
  | 'beachl-all-placements'  // Legacy: use 'groups-full-placement'
  | 'beachl-short-main'      // Legacy: use 'groups-split-bracket'
  | 'knockout';              // Legacy: use 'groups-ssvb-knockout'

/**
 * All tournament system types (includes legacy names for compatibility)
 */
export type TournamentSystem =
  | StandaloneSystem
  | GroupBasedSystem
  | KnockoutPhaseSystem
  | LegacySystem;

// =============================================================================
// LEGACY NAME MAPPING (for migration)
// =============================================================================

/**
 * Maps old system names to new names for backward compatibility
 */
export const LEGACY_SYSTEM_MAP: Record<string, TournamentSystem> = {
  'playoff': 'round-robin-playoff',
  'group-phase': 'groups-only',
  'beachl-all-placements': 'groups-full-placement',
  'beachl-short-main': 'groups-split-bracket',
  'knockout': 'groups-ssvb-knockout',
} as const;

/**
 * Maps new system names to old names for data export/compatibility
 */
export const NEW_TO_LEGACY_MAP: Record<TournamentSystem, string> = {
  'round-robin': 'round-robin',
  'round-robin-playoff': 'playoff',
  'swiss': 'swiss',
  'groups-only': 'group-phase',
  'groups-full-placement': 'beachl-all-placements',
  'groups-split-bracket': 'beachl-short-main',
  'groups-ssvb-knockout': 'knockout',
  'placement-tree': 'placement-tree',
  'short-main-knockout': 'short-main-knockout',
  // Legacy names map to themselves
  'playoff': 'playoff',
  'group-phase': 'group-phase',
  'beachl-all-placements': 'beachl-all-placements',
  'beachl-short-main': 'beachl-short-main',
  'knockout': 'knockout',
} as const;

/**
 * Normalize a system name (convert legacy names to new names)
 */
export function normalizeSystemName(system: string): TournamentSystem {
  if (system in LEGACY_SYSTEM_MAP) {
    return LEGACY_SYSTEM_MAP[system];
  }
  return system as TournamentSystem;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a system is a standalone system (no group phase)
 * Also accepts legacy names for backward compatibility.
 */
export function isStandaloneSystem(system: string): system is StandaloneSystem {
  // New and legacy names
  return ['round-robin', 'round-robin-playoff', 'swiss', 'playoff'].includes(system);
}

/**
 * Check if a system is group-based (has Phase 1 group stage)
 * Also accepts legacy names for backward compatibility.
 */
export function isGroupBasedSystem(system: string): system is GroupBasedSystem {
  // New names
  if ([
    'groups-only',
    'groups-full-placement',
    'groups-split-bracket',
    'groups-ssvb-knockout',
  ].includes(system)) {
    return true;
  }
  // Legacy names
  if ([
    'group-phase',
    'beachl-all-placements',
    'beachl-short-main',
  ].includes(system)) {
    return true;
  }
  return false;
}

/**
 * Check if a system is an internal knockout phase type
 */
export function isKnockoutPhaseSystem(system: string): system is KnockoutPhaseSystem {
  return ['placement-tree', 'short-main-knockout'].includes(system);
}

/**
 * Check if a system is a valid tournament system
 */
export function isTournamentSystem(system: string): system is TournamentSystem {
  return (
    isStandaloneSystem(system) ||
    isGroupBasedSystem(system) ||
    isKnockoutPhaseSystem(system)
  );
}

// =============================================================================
// SYSTEM CAPABILITY CHECKS
// =============================================================================

/**
 * Check if a system requires a phase transition (group → knockout)
 * Also accepts legacy names for backward compatibility.
 */
export function requiresPhaseTransition(system: string): boolean {
  return [
    // New names
    'groups-full-placement',
    'groups-split-bracket',
    'groups-ssvb-knockout',
    // Legacy names
    'beachl-all-placements',
    'beachl-short-main',
    // Note: 'group-phase' with knockoutSettings also requires transition,
    // but that's handled at the application level
  ].includes(system);
}

/**
 * Check if a system generates all placement rankings (1st through Nth)
 * Also accepts legacy names for backward compatibility.
 */
export function hasFullPlacementRanking(system: string): boolean {
  return [
    'groups-full-placement', 'placement-tree',
    'beachl-all-placements', // Legacy
  ].includes(system);
}

/**
 * Check if a system uses multiple separate brackets (tiered structure)
 * Also accepts legacy names for backward compatibility.
 */
export function usesMultipleBrackets(system: string): boolean {
  return [
    'groups-split-bracket', 'short-main-knockout',
    'beachl-short-main', // Legacy
  ].includes(system);
}

/**
 * Check if a system eliminates teams after group phase (no consolation for 4ths)
 */
export function eliminatesAfterGroups(system: string): boolean {
  return ['groups-ssvb-knockout', 'groups-split-bracket'].includes(system);
}

/**
 * Check if a system supports Swiss-style progressive rounds
 */
export function isProgressiveRoundSystem(system: string): boolean {
  return system === 'swiss';
}

/**
 * Check if a system uses round-robin internally (for groups or standalone)
 */
export function usesRoundRobinMatches(system: string): boolean {
  return [
    'round-robin',
    'round-robin-playoff',
    'groups-only',
    'groups-full-placement',
    'groups-split-bracket',
    'groups-ssvb-knockout',
  ].includes(system);
}

/**
 * Check if a system has an optional playoff finale (neighbor-based matches)
 */
export function hasOptionalPlayoff(system: string): boolean {
  return ['round-robin-playoff', 'swiss'].includes(system);
}

// =============================================================================
// SYSTEM METADATA
// =============================================================================

/**
 * Human-readable display names for tournament systems
 */
export const SYSTEM_DISPLAY_NAMES: Record<TournamentSystem, string> = {
  'round-robin': 'Jeder gegen Jeden',
  'round-robin-playoff': 'Jeder gegen Jeden mit Finale',
  'swiss': 'Schweizer System',
  'groups-only': 'Nur Gruppenphase',
  'groups-full-placement': 'Gruppen + Alle Platzierungen',
  'groups-split-bracket': 'Gruppen + Verkürzte Hauptrunde',
  'groups-ssvb-knockout': 'Gruppen + K.O.-Phase (SSVB)',
  'placement-tree': 'Platzierungsbaum',
  'short-main-knockout': 'Verkürzte K.O.-Phase',
  // Legacy names (map to same display as new names)
  'playoff': 'Jeder gegen Jeden mit Finale',
  'group-phase': 'Nur Gruppenphase',
  'beachl-all-placements': 'Gruppen + Alle Platzierungen',
  'beachl-short-main': 'Gruppen + Verkürzte Hauptrunde',
  'knockout': 'Gruppen + K.O.-Phase (SSVB)',
};

/**
 * Short descriptions for tournament systems
 */
export const SYSTEM_DESCRIPTIONS: Record<TournamentSystem, string> = {
  'round-robin': 'Jedes Team spielt gegen jedes andere Team',
  'round-robin-playoff': 'Jeder gegen Jeden, dann Platzierungsspiele (1. vs 2., 3. vs 4., ...)',
  'swiss': 'Dynamische Paarung nach Spielstärke ohne Ausscheiden',
  'groups-only': 'Gruppenphase mit Jeder-gegen-Jeden innerhalb der Gruppen',
  'groups-full-placement': 'Gruppenphase + vollständiger Platzierungsbaum für alle Ränge',
  'groups-split-bracket': 'Gruppenphase + getrennte Turnierbäume nach Leistungsstufe',
  'groups-ssvb-knockout': 'Gruppenphase + K.O.-Runde nach SSVB-Regeln (Viertplatzierte ausgeschieden)',
  'placement-tree': 'Binärer Platzierungsbaum für alle Ränge',
  'short-main-knockout': 'Mehrere getrennte K.O.-Bäume nach Leistungsstufe',
  // Legacy names (map to same descriptions as new names)
  'playoff': 'Jeder gegen Jeden, dann Platzierungsspiele (1. vs 2., 3. vs 4., ...)',
  'group-phase': 'Gruppenphase mit Jeder-gegen-Jeden innerhalb der Gruppen',
  'beachl-all-placements': 'Gruppenphase + vollständiger Platzierungsbaum für alle Ränge',
  'beachl-short-main': 'Gruppenphase + getrennte Turnierbäume nach Leistungsstufe',
  'knockout': 'Gruppenphase + K.O.-Runde nach SSVB-Regeln (Viertplatzierte ausgeschieden)',
};

/**
 * Get the Phase 2 system type for a group-based system
 */
export function getPhase2System(system: GroupBasedSystem): KnockoutPhaseSystem | null {
  switch (system) {
    case 'groups-only':
      return null;
    case 'groups-full-placement':
      return 'placement-tree';
    case 'groups-split-bracket':
      return 'short-main-knockout';
    case 'groups-ssvb-knockout':
      // SSVB knockout uses a custom bracket, not a separate system type
      return null;
    default:
      return null;
  }
}

/**
 * Get the minimum number of teams required for a system
 */
export function getMinimumTeamCount(system: TournamentSystem): number {
  switch (system) {
    case 'round-robin':
    case 'round-robin-playoff':
      return 2;
    case 'swiss':
      return 4;
    case 'groups-only':
    case 'groups-full-placement':
    case 'groups-split-bracket':
    case 'groups-ssvb-knockout':
      return 8; // Minimum 2 groups × 4 teams
    case 'placement-tree':
    case 'short-main-knockout':
      return 4; // Internal phase, minimum for bracket
    default:
      return 2;
  }
}

/**
 * Get the recommended maximum team count for a system
 */
export function getRecommendedMaxTeamCount(system: TournamentSystem): number {
  switch (system) {
    case 'round-robin':
    case 'round-robin-playoff':
      return 8; // Beyond this, too many matches (N*(N-1)/2)
    case 'swiss':
      return 32;
    case 'groups-only':
    case 'groups-full-placement':
    case 'groups-split-bracket':
    case 'groups-ssvb-knockout':
      return 32; // 8 groups × 4 teams
    case 'placement-tree':
    case 'short-main-knockout':
      return 16;
    default:
      return 32;
  }
}
