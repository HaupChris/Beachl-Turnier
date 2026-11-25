/**
 * Tests for Tournament System Types and Type Guards
 *
 * These tests verify that:
 * 1. Type guards correctly identify each system category
 * 2. System capability checks return expected values
 * 3. Legacy name mapping works correctly
 * 4. Metadata functions return valid data
 */

import { describe, it, expect } from 'vitest';
import {
  // Type guards
  isStandaloneSystem,
  isGroupBasedSystem,
  isKnockoutPhaseSystem,
  isTournamentSystem,
  // Capability checks
  requiresPhaseTransition,
  hasFullPlacementRanking,
  usesMultipleBrackets,
  eliminatesAfterGroups,
  isProgressiveRoundSystem,
  usesRoundRobinMatches,
  hasOptionalPlayoff,
  // Legacy mapping
  normalizeSystemName,
  LEGACY_SYSTEM_MAP,
  NEW_TO_LEGACY_MAP,
  // Metadata
  SYSTEM_DISPLAY_NAMES,
  SYSTEM_DESCRIPTIONS,
  getPhase2System,
  getMinimumTeamCount,
  getRecommendedMaxTeamCount,
  // Types
  type TournamentSystem,
} from '../system';

// =============================================================================
// TEST DATA
// =============================================================================

const STANDALONE_SYSTEMS = [
  'round-robin',
  'round-robin-playoff',
  'swiss',
] as const;

const GROUP_BASED_SYSTEMS = [
  'groups-only',
  'groups-full-placement',
  'groups-split-bracket',
  'groups-ssvb-knockout',
] as const;

const KNOCKOUT_PHASE_SYSTEMS = [
  'placement-tree',
  'short-main-knockout',
] as const;

const ALL_SYSTEMS: TournamentSystem[] = [
  ...STANDALONE_SYSTEMS,
  ...GROUP_BASED_SYSTEMS,
  ...KNOCKOUT_PHASE_SYSTEMS,
];

const INVALID_SYSTEMS = [
  'invalid',
  'foo-bar',
  '',
  'ROUND-ROBIN', // case matters
  'round_robin', // underscores not dashes
];

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('Type Guards', () => {
  describe('isStandaloneSystem', () => {
    it.each(STANDALONE_SYSTEMS)(
      'returns TRUE for standalone system: %s',
      (system) => {
        expect(isStandaloneSystem(system)).toBe(true);
      }
    );

    it.each([...GROUP_BASED_SYSTEMS, ...KNOCKOUT_PHASE_SYSTEMS])(
      'returns FALSE for non-standalone system: %s',
      (system) => {
        expect(isStandaloneSystem(system)).toBe(false);
      }
    );

    it.each(INVALID_SYSTEMS)(
      'returns FALSE for invalid system: "%s"',
      (system) => {
        expect(isStandaloneSystem(system)).toBe(false);
      }
    );
  });

  describe('isGroupBasedSystem', () => {
    it.each(GROUP_BASED_SYSTEMS)(
      'returns TRUE for group-based system: %s',
      (system) => {
        expect(isGroupBasedSystem(system)).toBe(true);
      }
    );

    it.each([...STANDALONE_SYSTEMS, ...KNOCKOUT_PHASE_SYSTEMS])(
      'returns FALSE for non-group-based system: %s',
      (system) => {
        expect(isGroupBasedSystem(system)).toBe(false);
      }
    );
  });

  describe('isKnockoutPhaseSystem', () => {
    it.each(KNOCKOUT_PHASE_SYSTEMS)(
      'returns TRUE for knockout phase system: %s',
      (system) => {
        expect(isKnockoutPhaseSystem(system)).toBe(true);
      }
    );

    it.each([...STANDALONE_SYSTEMS, ...GROUP_BASED_SYSTEMS])(
      'returns FALSE for non-knockout-phase system: %s',
      (system) => {
        expect(isKnockoutPhaseSystem(system)).toBe(false);
      }
    );
  });

  describe('isTournamentSystem', () => {
    it.each(ALL_SYSTEMS)(
      'returns TRUE for valid system: %s',
      (system) => {
        expect(isTournamentSystem(system)).toBe(true);
      }
    );

    it.each(INVALID_SYSTEMS)(
      'returns FALSE for invalid system: "%s"',
      (system) => {
        expect(isTournamentSystem(system)).toBe(false);
      }
    );
  });
});

// =============================================================================
// CAPABILITY CHECK TESTS
// =============================================================================

describe('System Capability Checks', () => {
  describe('requiresPhaseTransition', () => {
    const SYSTEMS_WITH_PHASE_TRANSITION = [
      'groups-full-placement',
      'groups-split-bracket',
      'groups-ssvb-knockout',
    ];

    const SYSTEMS_WITHOUT_PHASE_TRANSITION = [
      'round-robin',
      'round-robin-playoff',
      'swiss',
      'groups-only',
      'placement-tree',
      'short-main-knockout',
    ];

    it.each(SYSTEMS_WITH_PHASE_TRANSITION)(
      '%s → requires phase transition (groups → knockout)',
      (system) => {
        expect(requiresPhaseTransition(system)).toBe(true);
      }
    );

    it.each(SYSTEMS_WITHOUT_PHASE_TRANSITION)(
      '%s → does NOT require phase transition',
      (system) => {
        expect(requiresPhaseTransition(system)).toBe(false);
      }
    );
  });

  describe('hasFullPlacementRanking', () => {
    const SYSTEMS_WITH_FULL_PLACEMENT = [
      'groups-full-placement',
      'placement-tree',
    ];

    it.each(SYSTEMS_WITH_FULL_PLACEMENT)(
      '%s → determines ALL placements (1st through Nth)',
      (system) => {
        expect(hasFullPlacementRanking(system)).toBe(true);
      }
    );

    it('round-robin → does NOT determine all placements', () => {
      expect(hasFullPlacementRanking('round-robin')).toBe(false);
    });

    it('groups-ssvb-knockout → does NOT determine all placements (4ths are cut off)', () => {
      expect(hasFullPlacementRanking('groups-ssvb-knockout')).toBe(false);
    });
  });

  describe('usesMultipleBrackets', () => {
    const SYSTEMS_WITH_MULTIPLE_BRACKETS = [
      'groups-split-bracket',
      'short-main-knockout',
    ];

    it.each(SYSTEMS_WITH_MULTIPLE_BRACKETS)(
      '%s → uses multiple separate brackets (tiered structure)',
      (system) => {
        expect(usesMultipleBrackets(system)).toBe(true);
      }
    );

    it('groups-full-placement → uses single unified tree', () => {
      expect(usesMultipleBrackets('groups-full-placement')).toBe(false);
    });

    it('groups-ssvb-knockout → uses single bracket', () => {
      expect(usesMultipleBrackets('groups-ssvb-knockout')).toBe(false);
    });
  });

  describe('eliminatesAfterGroups', () => {
    it('groups-ssvb-knockout → eliminates group 4ths (no consolation)', () => {
      expect(eliminatesAfterGroups('groups-ssvb-knockout')).toBe(true);
    });

    it('groups-split-bracket → eliminates teams into lower tiers', () => {
      expect(eliminatesAfterGroups('groups-split-bracket')).toBe(true);
    });

    it('groups-full-placement → keeps ALL teams (full placement tree)', () => {
      expect(eliminatesAfterGroups('groups-full-placement')).toBe(false);
    });

    it('groups-only → no elimination (no knockout phase)', () => {
      expect(eliminatesAfterGroups('groups-only')).toBe(false);
    });
  });

  describe('isProgressiveRoundSystem', () => {
    it('swiss → generates rounds progressively (not all at once)', () => {
      expect(isProgressiveRoundSystem('swiss')).toBe(true);
    });

    it('round-robin → generates all matches upfront', () => {
      expect(isProgressiveRoundSystem('round-robin')).toBe(false);
    });

    it('groups-full-placement → generates all matches upfront', () => {
      expect(isProgressiveRoundSystem('groups-full-placement')).toBe(false);
    });
  });

  describe('usesRoundRobinMatches', () => {
    const SYSTEMS_USING_ROUND_ROBIN = [
      'round-robin',
      'round-robin-playoff',
      'groups-only',
      'groups-full-placement',
      'groups-split-bracket',
      'groups-ssvb-knockout',
    ];

    it.each(SYSTEMS_USING_ROUND_ROBIN)(
      '%s → uses round-robin match generation (internally or standalone)',
      (system) => {
        expect(usesRoundRobinMatches(system)).toBe(true);
      }
    );

    it('swiss → does NOT use round-robin (uses dynamic pairing)', () => {
      expect(usesRoundRobinMatches('swiss')).toBe(false);
    });

    it('placement-tree → does NOT use round-robin (bracket structure)', () => {
      expect(usesRoundRobinMatches('placement-tree')).toBe(false);
    });
  });

  describe('hasOptionalPlayoff', () => {
    it('round-robin-playoff → HAS playoff finale (T1 vs T2, T3 vs T4, ...)', () => {
      expect(hasOptionalPlayoff('round-robin-playoff')).toBe(true);
    });

    it('swiss → CAN have playoff finale after any round', () => {
      expect(hasOptionalPlayoff('swiss')).toBe(true);
    });

    it('round-robin → no playoff (ends after round-robin)', () => {
      expect(hasOptionalPlayoff('round-robin')).toBe(false);
    });

    it('groups-ssvb-knockout → no optional playoff (has mandatory knockout)', () => {
      expect(hasOptionalPlayoff('groups-ssvb-knockout')).toBe(false);
    });
  });
});

// =============================================================================
// LEGACY NAME MAPPING TESTS
// =============================================================================

describe('Legacy Name Mapping', () => {
  describe('normalizeSystemName', () => {
    it.each([
      ['playoff', 'round-robin-playoff'],
      ['group-phase', 'groups-only'],
      ['beachl-all-placements', 'groups-full-placement'],
      ['beachl-short-main', 'groups-split-bracket'],
      ['knockout', 'groups-ssvb-knockout'],
    ] as const)(
      'converts legacy name "%s" → "%s"',
      (legacy, expected) => {
        expect(normalizeSystemName(legacy)).toBe(expected);
      }
    );

    it.each(ALL_SYSTEMS)(
      'preserves already-new name: %s',
      (system) => {
        expect(normalizeSystemName(system)).toBe(system);
      }
    );

    it('passes through unknown names unchanged', () => {
      expect(normalizeSystemName('unknown-system')).toBe('unknown-system');
    });
  });

  describe('LEGACY_SYSTEM_MAP', () => {
    it('contains all expected legacy mappings', () => {
      expect(Object.keys(LEGACY_SYSTEM_MAP)).toEqual([
        'playoff',
        'group-phase',
        'beachl-all-placements',
        'beachl-short-main',
        'knockout',
      ]);
    });
  });

  describe('NEW_TO_LEGACY_MAP', () => {
    it('contains mapping for all tournament systems', () => {
      ALL_SYSTEMS.forEach((system) => {
        expect(NEW_TO_LEGACY_MAP[system]).toBeDefined();
      });
    });

    it('round-trip: legacy → new → legacy preserves original', () => {
      Object.entries(LEGACY_SYSTEM_MAP).forEach(([legacy, newName]) => {
        expect(NEW_TO_LEGACY_MAP[newName]).toBe(legacy);
      });
    });
  });
});

// =============================================================================
// METADATA TESTS
// =============================================================================

describe('System Metadata', () => {
  describe('SYSTEM_DISPLAY_NAMES', () => {
    it('has display name for every tournament system', () => {
      ALL_SYSTEMS.forEach((system) => {
        expect(SYSTEM_DISPLAY_NAMES[system]).toBeDefined();
        expect(SYSTEM_DISPLAY_NAMES[system].length).toBeGreaterThan(0);
      });
    });

    it('display names are in German', () => {
      expect(SYSTEM_DISPLAY_NAMES['round-robin']).toBe('Jeder gegen Jeden');
      expect(SYSTEM_DISPLAY_NAMES['swiss']).toBe('Schweizer System');
    });
  });

  describe('SYSTEM_DESCRIPTIONS', () => {
    it('has description for every tournament system', () => {
      ALL_SYSTEMS.forEach((system) => {
        expect(SYSTEM_DESCRIPTIONS[system]).toBeDefined();
        expect(SYSTEM_DESCRIPTIONS[system].length).toBeGreaterThan(10);
      });
    });
  });

  describe('getPhase2System', () => {
    it('groups-only → null (no Phase 2)', () => {
      expect(getPhase2System('groups-only')).toBeNull();
    });

    it('groups-full-placement → placement-tree', () => {
      expect(getPhase2System('groups-full-placement')).toBe('placement-tree');
    });

    it('groups-split-bracket → short-main-knockout', () => {
      expect(getPhase2System('groups-split-bracket')).toBe('short-main-knockout');
    });

    it('groups-ssvb-knockout → null (uses custom bracket, not separate system)', () => {
      expect(getPhase2System('groups-ssvb-knockout')).toBeNull();
    });
  });

  describe('getMinimumTeamCount', () => {
    it('round-robin requires minimum 2 teams', () => {
      expect(getMinimumTeamCount('round-robin')).toBe(2);
    });

    it('swiss requires minimum 4 teams', () => {
      expect(getMinimumTeamCount('swiss')).toBe(4);
    });

    it('group-based systems require minimum 8 teams (2 groups × 4)', () => {
      expect(getMinimumTeamCount('groups-ssvb-knockout')).toBe(8);
      expect(getMinimumTeamCount('groups-full-placement')).toBe(8);
    });
  });

  describe('getRecommendedMaxTeamCount', () => {
    it('round-robin recommends max 8 teams (28 matches for 8 teams)', () => {
      expect(getRecommendedMaxTeamCount('round-robin')).toBe(8);
    });

    it('group-based systems recommend max 32 teams', () => {
      expect(getRecommendedMaxTeamCount('groups-ssvb-knockout')).toBe(32);
    });
  });
});

// =============================================================================
// LEGACY NAME COMPATIBILITY TESTS
// =============================================================================

describe('Legacy Name Compatibility', () => {
  describe('isGroupBasedSystem with legacy names', () => {
    it('group-phase (legacy) → TRUE', () => {
      expect(isGroupBasedSystem('group-phase')).toBe(true);
    });

    it('beachl-all-placements (legacy) → TRUE', () => {
      expect(isGroupBasedSystem('beachl-all-placements')).toBe(true);
    });

    it('beachl-short-main (legacy) → TRUE', () => {
      expect(isGroupBasedSystem('beachl-short-main')).toBe(true);
    });
  });

  describe('isStandaloneSystem with legacy names', () => {
    it('playoff (legacy) → TRUE', () => {
      expect(isStandaloneSystem('playoff')).toBe(true);
    });
  });

  describe('requiresPhaseTransition with legacy names', () => {
    it('beachl-all-placements (legacy) → TRUE', () => {
      expect(requiresPhaseTransition('beachl-all-placements')).toBe(true);
    });

    it('beachl-short-main (legacy) → TRUE', () => {
      expect(requiresPhaseTransition('beachl-short-main')).toBe(true);
    });
  });

  describe('hasFullPlacementRanking with legacy names', () => {
    it('beachl-all-placements (legacy) → TRUE', () => {
      expect(hasFullPlacementRanking('beachl-all-placements')).toBe(true);
    });
  });

  describe('usesMultipleBrackets with legacy names', () => {
    it('beachl-short-main (legacy) → TRUE', () => {
      expect(usesMultipleBrackets('beachl-short-main')).toBe(true);
    });
  });
});

// =============================================================================
// TYPE NARROWING TESTS (TypeScript compilation checks)
// =============================================================================

describe('Type Narrowing', () => {
  it('isStandaloneSystem narrows type correctly', () => {
    const system = 'round-robin' as string;

    if (isStandaloneSystem(system)) {
      // TypeScript should allow this assignment
      const standalone: 'round-robin' | 'round-robin-playoff' | 'swiss' = system;
      expect(standalone).toBe('round-robin');
    }
  });

  it('isGroupBasedSystem narrows type correctly', () => {
    const system = 'groups-full-placement' as string;

    if (isGroupBasedSystem(system)) {
      // TypeScript should allow this assignment
      const groupBased:
        | 'groups-only'
        | 'groups-full-placement'
        | 'groups-split-bracket'
        | 'groups-ssvb-knockout' = system;
      expect(groupBased).toBe('groups-full-placement');
    }
  });
});
