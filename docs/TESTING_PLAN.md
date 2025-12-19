# Testing Framework Plan for BeachL Tournament App

## Overview

This document outlines the comprehensive testing framework for validating schedule generation and tournament progression across all tournament configurations.

## Technology Recommendation

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Test Runner | **Vitest** | Native Vite integration, fast, ESM support |
| Assertion Library | Vitest (built-in) | Jest-compatible API |
| Coverage | @vitest/coverage-v8 | V8 coverage engine |
| CI Platform | GitHub Actions | Native repo integration |

### Why Vitest over Jest?

1. **Vite-native**: This project uses Vite 7.2, Vitest integrates seamlessly
2. **Faster**: Shared transforms, hot module replacement for watch mode
3. **ESM-first**: No configuration needed for ES modules
4. **Compatible**: Jest-like API, minimal learning curve

---

## Test Categories

### 1. Unit Tests (Core Business Logic)

Focus on individual utility functions in `/src/utils/`:

#### 1.1 Round-Robin Generation (`roundRobin.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `generates correct match count` | n teams should produce n*(n-1)/2 matches | 4 teams = 6 matches, 8 teams = 28 matches |
| `no self-matches` | No team plays against itself | teamAId !== teamBId for all |
| `no duplicate matchups` | Each pair plays exactly once | Unique (teamA, teamB) pairs |
| `all teams participate` | Every team appears in matches | All team IDs covered |
| `handles odd team count` | 5 teams gets bye handling | 10 matches (not 5*4/2=10) |
| `court assignment cycles` | Courts assigned round-robin | Courts 1,2,3,1,2,3... |

#### 1.2 Group Phase (`groupPhase.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `snake-draft seeding for 16 teams` | Teams distributed correctly | Group A: 1,8,9,16; Group B: 2,7,10,15; etc. |
| `snake-draft seeding for 12 teams` | 3 groups × 4 teams | Correct snake pattern |
| `random seeding randomizes` | Different runs differ | Not deterministic |
| `group matches count` | 4 teams/group | 6 matches per group |
| `interleaved match numbering` | Matches from different groups interleave | Pattern: A1,B1,C1,D1,A2,B2... |
| `group standings calculation` | After matches complete | Correct rankings |
| `head-to-head tiebreaker` | Two teams tied on points | Direct match decides |
| `point-diff tiebreaker` | Configured for point-diff-first | Point diff takes priority |

#### 1.3 SSVB Knockout (`knockout.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `2 groups generates correct bracket` | 8 teams | SF + Final (+ 3rd place) |
| `3 groups generates correct bracket` | 12 teams | Best 2nd + SF + Final |
| `4 groups generates SSVB bracket` | 16 teams | Intermediate + QF + SF + Final |
| `5-8 groups generates large bracket` | 20-32 teams | Scaled QF bracket |
| `match dependencies are valid` | dependsOn references exist | All matchIds valid |
| `bracket progression updates teams` | Complete intermediate match | QF team populated |
| `eliminated teams identified` | 4th place teams | Correct eliminatedTeamIds |
| `referee placeholders set` | useReferees=true | refereePlaceholder filled |

#### 1.4 Placement Tree (`placementTree.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `16 teams generates 15 matches` | N-1 matches | Exactly 15 |
| `24 teams generates 23 matches` | N-1 matches | Exactly 23 |
| `seeding order correct` | Group winners first | 1A,1B,1C,1D,2A,2B... |
| `interval splitting works` | Round 1: [1-16] | Winners→[1-8], Losers→[9-16] |
| `all placements determined` | Tournament complete | 1st through 16th unique |
| `match dependencies valid` | Subsequent rounds | dependsOn references exist |

#### 1.5 Short Main Round (`shortMainRound.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `16 teams generates 24 matches` | Standard format | Exactly 24 |
| `qualification pairings correct` | 2A vs 3D pattern | Correct matchups |
| `bottom bracket for 4th place` | 4th place teams | 13-16 bracket exists |
| `QF receives group winners + quali winners` | After quali complete | Correct dependencies |
| `all placement matches exist` | 1st, 3rd, 5th, 7th, 9th, 11th, 13th, 15th | 8 placement finals |

#### 1.6 Swiss System (`swissSystem.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `round 1 pairs by seed` | Initial seeding | 1v2, 3v4, 5v6... |
| `subsequent rounds pair by standings` | After round 1 | Similar points paired |
| `no rematch in tournament` | Played before | Different opponent |
| `handles odd team count` | Bye assignment | One team per round gets bye |

#### 1.7 Standings Calculation (`standings.ts`)

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `1-set format uses wins` | setsPerMatch=1 | Sorted by wins |
| `2-set format uses sets won` | setsPerMatch=2 | Sorted by setsWon |
| `head-to-head tiebreaker works` | Two teams tied | Direct match decides |
| `point-diff tiebreaker works` | Configured | Point diff decides |

---

### 2. Integration Tests (Tournament Reducer)

Test the full state machine in `tournamentReducer.ts`:

#### 2.1 Tournament Lifecycle

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `CREATE → configuration status` | New tournament | status='configuration' |
| `START → in-progress status` | Start tournament | status='in-progress', matches generated |
| `START group-phase → knockout placeholder` | SSVB tournament | Knockout tournament created |
| `COMPLETE_MATCH → standings update` | Finish match | standings recalculated |
| `All matches complete → status=completed` | Final match | status='completed' |
| `Group complete → knockout populated` | All group matches done | Teams flow to knockout |
| `RESET → clears matches` | Reset tournament | matches=[], status='configuration' |

#### 2.2 Multi-Phase Containers

| Test Case | Description | Expected |
|-----------|-------------|----------|
| `Container created with tournament` | New tournament | Container exists |
| `Knockout phase added to container` | Start group tournament | 2 phases in container |
| `SET_CURRENT_PHASE switches tournament` | Change phase | currentTournamentId updated |
| `DELETE_CONTAINER removes all phases` | Delete container | All tournaments removed |

---

### 3. Scenario Tests (End-to-End Simulations)

Full tournament simulations with various configurations:

#### 3.1 Configuration Matrix

| Teams | Groups | Courts | Sets | System | Test Name |
|-------|--------|--------|------|--------|-----------|
| 8 | 2 | 2 | 1 | group-phase | `ssvb-8-teams` |
| 12 | 3 | 3 | 1 | group-phase | `ssvb-12-teams` |
| 16 | 4 | 4 | 1 | group-phase | `ssvb-16-teams` |
| 20 | 5 | 4 | 1 | group-phase | `ssvb-20-teams` |
| 24 | 6 | 4 | 2 | group-phase | `ssvb-24-teams-2sets` |
| 16 | 4 | 4 | 1 | beachl-all-placements | `placement-16-teams` |
| 24 | 6 | 4 | 1 | beachl-all-placements | `placement-24-teams` |
| 16 | 4 | 4 | 1 | beachl-short-main | `short-main-16-teams` |
| 8 | - | 2 | 1 | round-robin | `round-robin-8-teams` |
| 6 | - | 2 | 2 | swiss | `swiss-6-teams` |

#### 3.2 Simulation Approach

Each scenario test will:

1. **Create tournament** with configuration
2. **Start tournament** and verify initial matches
3. **Simulate all matches** with random (seeded) results
4. **Verify at each stage:**
   - Correct number of scheduled matches
   - Standings updated correctly
   - Bracket dependencies resolve
5. **Complete tournament** and verify:
   - All placements determined
   - No tied positions (for placement tree)
   - Correct phase transitions

#### 3.3 Edge Cases

| Test Case | Configuration | Validation |
|-----------|---------------|------------|
| `single court tournament` | 16 teams, 1 court | All matches sequential |
| `more courts than matches` | 4 teams, 8 courts | Courts capped at 2 |
| `minimum teams per group` | 8 teams, 2 groups | 4 per group works |
| `3-set matches with tiebreaker` | setsPerMatch=3 | Third set to 15 |

---

## Test File Structure

```
src/
├── utils/
│   ├── __tests__/
│   │   ├── roundRobin.test.ts
│   │   ├── groupPhase.test.ts
│   │   ├── knockout.test.ts
│   │   ├── placementTree.test.ts
│   │   ├── shortMainRound.test.ts
│   │   ├── swissSystem.test.ts
│   │   └── standings.test.ts
│   └── ...
├── context/
│   └── __tests__/
│       └── tournamentReducer.test.ts
└── __tests__/
    └── scenarios/
        ├── ssvb.scenario.test.ts
        ├── placement.scenario.test.ts
        ├── shortMainRound.scenario.test.ts
        ├── roundRobin.scenario.test.ts
        └── swiss.scenario.test.ts
```

---

## Test Utilities

### Helper Functions

```typescript
// src/__tests__/utils/testHelpers.ts

/**
 * Create N teams with sequential seed positions
 */
export function createTeams(count: number): Team[];

/**
 * Simulate a match with random (seeded) result
 */
export function simulateMatch(match: Match, rng: SeededRandom): Match;

/**
 * Simulate all scheduled matches in a tournament
 */
export function simulateAllMatches(tournament: Tournament, rng: SeededRandom): Tournament;

/**
 * Verify match dependencies are satisfied
 */
export function verifyDependencies(matches: Match[]): boolean;

/**
 * Verify all placements are unique (no ties)
 */
export function verifyUniquePlacements(placements: { teamId: string; placement: string }[]): boolean;

/**
 * Create a seeded random number generator for reproducible tests
 */
export function createSeededRng(seed: number): SeededRandom;
```

### Assertions

```typescript
// Custom assertions for tournament testing

expect(matches).toHaveMatchCount(expectedCount);
expect(matches).toHaveNoSelfMatches();
expect(matches).toHaveNoDuplicateMatchups();
expect(matches).toHaveAllTeamsParticipating(teams);
expect(tournament).toHaveStatus('completed');
expect(knockout).toHaveValidDependencies();
```

---

## CI Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, 'claude/**']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run build

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui"
  }
}
```

---

## Coverage Goals

| Category | Target | Rationale |
|----------|--------|-----------|
| **Unit Tests** | 90%+ | Core scheduling logic must be reliable |
| **Integration Tests** | 80%+ | State transitions well-covered |
| **Scenario Tests** | 100% configurations | All supported configs tested |

### Critical Paths (Must be 100%)

1. `generateRoundRobinMatches`
2. `generateGroupPhaseMatches`
3. `generateSSVBBracket` / `generateSSVBBracketPlaceholder`
4. `generatePlacementTreeMatches` / `generatePlacementTreeMatchesPlaceholder`
5. `generateShortMainRoundMatches` / `generateShortMainRoundMatchesPlaceholder`
6. `updateKnockoutBracket` / `updatePlacementTreeBracket` / `updateShortMainRoundBracket`
7. `calculateStandings` / `calculateGroupStandings`
8. `populateKnockoutTeams` / `populatePlacementTreeTeams` / `populateShortMainRoundTeams`

---

## Implementation Status

### Phase 1: Setup - COMPLETED
- [x] Install Vitest and coverage tools
- [x] Configure vitest.config.ts
- [x] Set up GitHub Actions workflow
- [x] Create test utility helpers (`src/__tests__/utils/testHelpers.ts`)

### Phase 2: Unit Tests - COMPLETED
- [x] roundRobin.test.ts
- [x] groupPhase.test.ts
- [x] groupPhase.standings.test.ts
- [x] knockout.test.ts
- [x] knockout.placements.test.ts
- [x] knockout/byeHandler.test.ts
- [x] placementTree.test.ts
- [x] placementTree.placements.test.ts
- [x] shortMainRound.test.ts
- [x] shortMainRound.placements.test.ts
- [x] standings.test.ts
- [ ] swissSystem.test.ts (pending)

### Phase 3: Integration Tests - COMPLETED
- [x] tournamentReducer.test.ts
- [ ] Container/phase management tests (pending)

### Phase 4: Scenario Tests - IN PROGRESS
- [x] Team dropout scenarios (teamDropout.scenario.test.ts)
- [x] Advanced team dropout scenarios (teamDropout.advanced.test.ts)
- [ ] SSVB scenarios (8, 12, 16, 20, 24 teams)
- [ ] Full placement tree scenarios
- [ ] Short main round scenarios
- [ ] Round-robin scenarios
- [ ] Swiss system scenarios

### Phase 5: Edge Cases & Polish - IN PROGRESS
- [x] Bye handling tests (byeHandler.test.ts)
- [ ] Additional edge case tests
- [ ] Coverage analysis
- [x] Documentation updates

---

## Key Invariants to Test

### Match Generation Invariants

1. **Match Count Formula:**
   - Round-robin: `n * (n-1) / 2` (accounting for byes)
   - Group phase: `groups * 6` (4 teams/group)
   - Placement tree: `n - 1`
   - Short main round (16 teams): `24`

2. **No Invalid Matches:**
   - `teamAId !== teamBId` (no self-matches)
   - `teamAId !== null && teamBId !== null` for scheduled matches
   - Valid court numbers (1 to numberOfCourts)

3. **Dependency Graph:**
   - All `dependsOn.matchId` references exist
   - No circular dependencies
   - Pending matches have dependencies

### Tournament Progression Invariants

1. **Status Transitions:**
   - `configuration` → `in-progress` (only via START)
   - `in-progress` → `completed` (only when all matches done)
   - `completed` → never changes

2. **Team Flow:**
   - Group winners → correct knockout positions
   - Match winners/losers → correct dependent matches
   - Eliminated teams → correct placement brackets

3. **Standings Consistency:**
   - Sum of wins + losses = matches played
   - Sets won + sets lost = total sets played
   - Points = wins (1-set) or setsWon (2-set)

---

## Snapshot Testing Consideration

For complex bracket structures, consider snapshot tests:

```typescript
test('SSVB 16-team bracket structure', () => {
  const bracket = generateSSVBBracketPlaceholder(4, 4, true, true);
  expect(bracket.matches.map(m => ({
    round: m.round,
    knockoutRound: m.knockoutRound,
    teamAPlaceholder: m.teamAPlaceholder,
    teamBPlaceholder: m.teamBPlaceholder,
  }))).toMatchSnapshot();
});
```

This catches unintended structural changes while keeping tests readable.

---

## Summary

This testing framework provides:

1. **Comprehensive Coverage**: All tournament systems and configurations
2. **Reproducibility**: Seeded random for deterministic scenario tests
3. **Fast Feedback**: Vitest for rapid iteration
4. **CI Integration**: GitHub Actions for every push/PR
5. **Clear Organization**: Separated unit, integration, and scenario tests

The focus on schedule generation and tournament progression ensures the core functionality is reliable across all supported configurations.
