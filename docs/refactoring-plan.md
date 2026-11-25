npm i -g @openai/codex# Beachl-Turnier Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan for the Beachl-Turnier beach volleyball tournament management application. The goal is to transform the current organically-grown codebase into a well-structured, maintainable architecture with clear separation of concerns.

**Current State:**
- 114 TypeScript files, ~13,578 lines of code
- 8 tournament systems supported
- React 19 + TypeScript + Tailwind CSS
- Context + useReducer state management
- Client-side only (localStorage persistence)

**Key Problems Identified:**
1. Code duplication across 5 match list components
2. Scattered system type checking via string literals
3. Three similar but separate bracket generation implementations
4. Monolithic reducer handlers (200+ lines)
5. Mixed concerns (UI state, business logic, scheduling intertwined)
6. Implicit dependencies between phases
7. Type ambiguity for different match variants

**Related Documentation:**
- [Tournament Modes Specification](./tournament-modes-specification.md) - Formal algorithm definitions

---

## Tournament Mode Mapping

The following table maps the formal specification to the current implementation and proposed naming:

| Spec Mode | Current `system` | Proposed `system` | Description |
|-----------|------------------|-------------------|-------------|
| **Mode 1**: Round Robin | `round-robin` | `round-robin` | Polygon method, all vs all |
| **Mode 1 + Finale**: Round Robin + Playoff | `playoff` | `round-robin-playoff` | Round Robin + neighbor-based finals |
| **Mode 2**: Swiss System | `swiss` | `swiss` | Buchholz ranking, no repeat matchups |
| **Mode 3 Phase 1**: Groups Only | `group-phase` | `groups-only` | Snake seeding, round-robin within groups |
| **Mode 3A**: Full Placement Tree | `beachl-all-placements` | `groups-full-placement` | Groups → double-sided tree (all placements) |
| **Mode 3B**: Shortened Main Round | `beachl-short-main` | `groups-split-bracket` | Groups → tiered split brackets |
| **Mode 3C**: SSVB Knockout | `knockout` (phase 2) | `groups-ssvb-knockout` | Groups → single elimination with cutoff |
| **Mode 4**: Double Elimination | *not implemented* | `double-elimination` | Winner/Loser bracket with reset |

### Key Algorithm Requirements

From the specification, the following algorithms must be implemented correctly:

1. **Round Robin**: Polygon method with team rotation (Berger Tables)
2. **Swiss Pairing**: Greedy with backtracking, Buchholz/Fine-Buchholz tiebreakers
3. **Snake Seeding**: Alternating left-right distribution across groups
4. **Cross-Seeding**: A1 vs B4, B1 vs A4, A2 vs B3, B2 vs A3 pattern
5. **Bracket as Graph**: Matches with `winnerGoesTo` and `loserGoesTo` edges

---

## Proposed Architecture

```
src/
├── domain/                    # Pure business logic (no React)
│   ├── types/                 # Type definitions
│   │   ├── tournament.ts      # Core entities (Tournament, Team, Group)
│   │   ├── match.ts           # Match variants (discriminated unions)
│   │   ├── system.ts          # Tournament system types + guards
│   │   └── graph.ts           # MatchNode, TeamSlot, MatchEdge
│   │
│   ├── generators/            # Match generation (Spec Section 5.2)
│   │   ├── MatchGenerator.ts          # Interface + Factory
│   │   ├── RoundRobinGenerator.ts     # Mode 1: Polygon method
│   │   ├── SwissGenerator.ts          # Mode 2: Greedy + backtracking
│   │   ├── GroupPhaseGenerator.ts     # Mode 3 Phase 1: Snake seeding
│   │   └── brackets/                  # Mode 3 Phase 2 / Mode 4
│   │       ├── BracketGenerator.ts    # Interface
│   │       ├── FullPlacementTreeGenerator.ts   # Mode 3A
│   │       ├── SplitBracketGenerator.ts        # Mode 3B
│   │       ├── SSVBKnockoutGenerator.ts        # Mode 3C
│   │       ├── DoubleEliminationGenerator.ts   # Mode 4
│   │       └── configs/               # Bracket configs for 2-8 groups
│   │           ├── twoGroups.ts
│   │           ├── threeGroups.ts
│   │           ├── fourGroupsSSVB.ts
│   │           └── fiveToEightGroups.ts
│   │
│   ├── standings/             # Ranking calculation (Spec Section 5.1)
│   │   ├── RankingStrategy.ts         # Interface
│   │   ├── StandardRankingStrategy.ts # wins → set diff → point diff
│   │   ├── SwissRankingStrategy.ts    # matchPoints → Buchholz → fBH
│   │   ├── HeadToHeadStrategy.ts      # Direct comparison first
│   │   └── StandingsEngine.ts         # Orchestrates strategies
│   │
│   ├── scheduling/            # Time planning (pure functions)
│   │   ├── SchedulingEngine.ts
│   │   ├── TimeCalculator.ts
│   │   └── DurationEstimator.ts
│   │
│   ├── referees/              # Referee assignment logic
│   │   └── RefereeAssigner.ts
│   │
│   └── validation/            # Input validation
│       ├── TournamentValidator.ts
│       ├── ScoreValidator.ts
│       └── ConfigurationValidator.ts
│
├── application/               # Application layer (orchestration)
│   ├── actions/               # Action creators with validation
│   │   ├── tournamentActions.ts
│   │   ├── matchActions.ts
│   │   └── phaseActions.ts
│   │
│   ├── reducers/              # State reducers (thin, delegate to domain)
│   │   ├── tournamentReducer.ts
│   │   └── handlers/
│   │       ├── createTournament.ts
│   │       ├── startTournament.ts
│   │       ├── updateScore.ts
│   │       ├── completeMatch.ts
│   │       └── transitionPhase.ts
│   │
│   ├── orchestrators/         # Complex multi-step operations
│   │   ├── MatchCompletionOrchestrator.ts
│   │   ├── PhaseTransitionOrchestrator.ts
│   │   └── TournamentStartOrchestrator.ts
│   │
│   └── persistence/           # localStorage handling
│       └── StorageAdapter.ts
│
├── presentation/              # React UI layer
│   ├── context/
│   │   └── TournamentContext.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Configure.tsx
│   │   ├── Matches.tsx
│   │   └── Standings.tsx
│   │
│   ├── components/
│   │   ├── common/            # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Card.tsx
│   │   │
│   │   ├── tournament/
│   │   │   ├── TournamentCard.tsx
│   │   │   └── TournamentList.tsx
│   │   │
│   │   ├── configure/
│   │   │   ├── BasicSettings.tsx
│   │   │   ├── Phase1Settings.tsx
│   │   │   ├── Phase2Settings.tsx
│   │   │   ├── TimeEstimation.tsx
│   │   │   ├── TeamsList.tsx
│   │   │   └── GroupEditor.tsx
│   │   │
│   │   ├── matches/
│   │   │   ├── MatchList.tsx          # Single unified component
│   │   │   ├── MatchCard.tsx
│   │   │   ├── MatchFilters.tsx
│   │   │   ├── ScoreEntryModal.tsx
│   │   │   └── grouping/              # Grouping strategies
│   │   │       ├── GroupedByRound.tsx
│   │   │       ├── GroupedByGroup.tsx
│   │   │       └── GroupedByBracket.tsx
│   │   │
│   │   ├── brackets/
│   │   │   ├── BracketView.tsx
│   │   │   └── BracketNode.tsx
│   │   │
│   │   └── standings/
│   │       ├── StandingsTable.tsx
│   │       ├── GroupStandings.tsx
│   │       └── PlacementsList.tsx
│   │
│   └── hooks/
│       ├── useTournament.ts
│       ├── useConfigureForm.ts
│       ├── useScheduling.ts
│       └── useMatchFiltering.ts
│
├── App.tsx
├── main.tsx
└── Layout.tsx
```

---

## Refactoring Phases

### Phase 1: Foundation - Type System & Guards (Week 1)

**Goal:** Establish type-safe foundation for all refactoring work.

#### 1.1 Create System Type Guards

**Location:** `src/domain/types/system.ts`

```typescript
// Tournament system types
export type GroupBasedSystem =
  | 'group-phase'
  | 'beachl-all-placements'
  | 'beachl-short-main';

export type KnockoutVariant =
  | 'knockout'
  | 'placement-tree'
  | 'short-main-knockout';

export type SimpleSystem =
  | 'round-robin'
  | 'swiss'
  | 'playoff';

export type TournamentSystem =
  | GroupBasedSystem
  | KnockoutVariant
  | SimpleSystem;

// Type guards
export function isGroupBasedSystem(system: string): system is GroupBasedSystem {
  return ['group-phase', 'beachl-all-placements', 'beachl-short-main'].includes(system);
}

export function isKnockoutVariant(system: string): system is KnockoutVariant {
  return ['knockout', 'placement-tree', 'short-main-knockout'].includes(system);
}

export function hasPlacementRanking(system: string): boolean {
  return ['placement-tree', 'beachl-all-placements'].includes(system);
}

export function usesMultiBracket(system: string): boolean {
  return system === 'beachl-short-main' || system === 'short-main-knockout';
}
```

#### 1.2 Discriminated Union for Match Types

**Location:** `src/domain/types/match.ts`

```typescript
// Base match properties (all matches have these)
interface BaseMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scores: SetScore[];
  winnerId: string | null;
  status: MatchStatus;
  courtNumber?: number;
  scheduledTime?: string;
  refereeTeamId?: string;
}

// Standard match (round-robin, swiss, group phase)
interface StandardMatch extends BaseMatch {
  type: 'standard';
  groupId?: string;  // Only for group phase matches
}

// Knockout match with dependencies
interface KnockoutMatch extends BaseMatch {
  type: 'knockout';
  knockoutRound: KnockoutRoundType;
  bracketPosition: number;
  dependsOn?: MatchDependency;
  teamAPlaceholder?: string;
  teamBPlaceholder?: string;
}

// Placement tree match
interface PlacementMatch extends BaseMatch {
  type: 'placement';
  placementInterval: { start: number; end: number };
  winnerInterval: { start: number; end: number };
  loserInterval: { start: number; end: number };
  dependsOn?: MatchDependency;
}

// Multi-bracket match (short main round)
interface MultiBracketMatch extends BaseMatch {
  type: 'multibracket';
  bracket: 'top' | 'placement-5-8' | 'placement-9-12' | 'placement-13-16';
  bracketRound: string;
  dependsOn?: MatchDependency;
}

export type Match = StandardMatch | KnockoutMatch | PlacementMatch | MultiBracketMatch;

// Type guards for match types
export function isKnockoutMatch(match: Match): match is KnockoutMatch {
  return match.type === 'knockout';
}

export function isPlacementMatch(match: Match): match is PlacementMatch {
  return match.type === 'placement';
}
```

#### 1.3 Migration Script

Create a migration script that updates existing type checks:

```bash
# Find all string literal system checks
rg "system === '" --type ts
rg "system === \"" --type ts
rg "\.includes\(.*system\)" --type ts
```

Replace each with appropriate type guard calls.

**Deliverables:**
- [ ] `src/domain/types/system.ts` - System type definitions and guards
- [ ] `src/domain/types/match.ts` - Match discriminated unions
- [ ] Update all 50+ locations using string literal checks
- [ ] Tests for all type guards

---

### Phase 2: Domain Layer Extraction (Week 2-3)

**Goal:** Extract pure business logic from reducer handlers into testable domain functions.

#### 2.1 RankingStrategy Interface (from Spec Section 5.1)

**Location:** `src/domain/standings/RankingStrategy.ts`

Implement the strategy pattern for different ranking algorithms:

```typescript
interface RankingStrategy {
  /**
   * Calculate standings from completed matches
   */
  calculateStandings(
    matches: Match[],
    teams: Team[],
    config: RankingConfig
  ): StandingEntry[];

  /**
   * Compare two teams for ranking purposes
   * Returns: negative if a < b, positive if a > b, 0 if equal
   */
  compare(
    a: StandingEntry,
    b: StandingEntry,
    matches: Match[]
  ): number;

  /**
   * Get the ranking criteria in priority order
   */
  getCriteria(): RankingCriterion[];
}

// Implementations
class StandardRankingStrategy implements RankingStrategy {
  // Priority: wins → set diff → point diff
}

class SwissRankingStrategy implements RankingStrategy {
  // Priority: match points → Buchholz → Fine-Buchholz → set quotient
  calculateBuchholz(teamId: string, matches: Match[]): number;
  calculateFineBuchholz(teamId: string, matches: Match[]): number;
}

class HeadToHeadRankingStrategy implements RankingStrategy {
  // Priority: head-to-head result first, then standard
}
```

#### 2.2 Standings Engine

**Location:** `src/domain/standings/StandingsEngine.ts`

Extract from: `src/utils/standings.ts`

```typescript
export class StandingsEngine {
  constructor(private strategies: Map<string, RankingStrategy>) {}

  calculateStandings(
    matches: Match[],
    teams: Team[],
    strategyType: 'standard' | 'swiss' | 'head-to-head'
  ): StandingEntry[];

  calculateGroupStandings(
    matches: Match[],
    groups: Group[],
    strategyType: string
  ): Map<string, StandingEntry[]>;  // groupId → standings

  resolveTiebreakers(
    entries: StandingEntry[],
    matches: Match[],
    strategy: RankingStrategy
  ): StandingEntry[];
}
```

#### 2.3 MatchGenerator Factory (from Spec Section 5.2)

**Location:** `src/domain/generators/MatchGenerator.ts`

Factory pattern for match generation across all modes:

```typescript
interface MatchGenerator<TConfig> {
  /**
   * Generate all matches for this format
   */
  generate(teams: Team[], config: TConfig): Match[];

  /**
   * Generate next round (for progressive formats like Swiss)
   */
  generateNextRound?(
    teams: Team[],
    history: Match[],
    roundNumber: number,
    config: TConfig
  ): Match[];

  /**
   * Validate configuration before generation
   */
  validate(teams: Team[], config: TConfig): ValidationResult;
}

// Factory
class MatchGeneratorFactory {
  static create(system: TournamentSystem): MatchGenerator {
    switch (system) {
      case 'round-robin':
      case 'round-robin-playoff':
        return new RoundRobinGenerator();
      case 'swiss':
        return new SwissGenerator();
      case 'groups-only':
      case 'groups-full-placement':
      case 'groups-split-bracket':
      case 'groups-ssvb-knockout':
        return new GroupPhaseGenerator();
      case 'double-elimination':
        return new DoubleEliminationGenerator();
    }
  }
}
```

#### 2.4 Round Robin Generator (Mode 1 - Polygon Method)

**Location:** `src/domain/generators/RoundRobinGenerator.ts`

```typescript
class RoundRobinGenerator implements MatchGenerator<RoundRobinConfig> {
  /**
   * Polygon method (Berger Tables):
   * 1. If N is odd, add BYE team (N_total = N + 1)
   * 2. Fix team 1, rotate teams 2..N_total each round
   * 3. Pair index i with index (N_total - 1 - i)
   */
  generate(teams: Team[], config: RoundRobinConfig): Match[] {
    const N = teams.length;
    const needsBye = N % 2 === 1;
    const totalTeams = needsBye ? N + 1 : N;
    const rounds = totalTeams - 1;
    const matchesPerRound = Math.floor(totalTeams / 2);

    const matches: Match[] = [];

    for (let round = 1; round <= rounds; round++) {
      const positions = this.getRotatedPositions(round, totalTeams);

      for (let i = 0; i < matchesPerRound; i++) {
        const teamAIndex = positions[i];
        const teamBIndex = positions[totalTeams - 1 - i];

        // Skip BYE matches
        if (teamAIndex >= N || teamBIndex >= N) continue;

        matches.push({
          round,
          matchNumber: matches.length + 1,
          teamAId: teams[teamAIndex].id,
          teamBId: teams[teamBIndex].id,
          // Alternate home/away for fairness
          isHomeTeamA: (round + i) % 2 === 0
        });
      }
    }

    return matches;
  }

  /**
   * Optional playoff finale - neighbor-based placement matches
   */
  generatePlayoff(standings: StandingEntry[]): Match[] {
    const matches: Match[] = [];
    for (let i = 0; i < Math.floor(standings.length / 2); i++) {
      matches.push({
        round: 'playoff',
        teamAId: standings[i * 2].teamId,      // T1, T3, T5...
        teamBId: standings[i * 2 + 1].teamId,  // T2, T4, T6...
        playoffForPlace: i * 2 + 1             // 1st, 3rd, 5th...
      });
    }
    return matches;
  }
}
```

#### 2.5 Swiss Generator (Mode 2 - Greedy with Backtracking)

**Location:** `src/domain/generators/SwissGenerator.ts`

```typescript
class SwissGenerator implements MatchGenerator<SwissConfig> {
  /**
   * Round 1: Seeding-based pairing (Seed 1 vs N/2+1, etc.)
   */
  generateRound1(teams: Team[]): Match[] {
    const mid = Math.ceil(teams.length / 2);
    const matches: Match[] = [];

    for (let i = 0; i < mid; i++) {
      if (i + mid < teams.length) {
        matches.push({
          round: 1,
          teamAId: teams[i].id,      // Seeds 1, 2, 3, 4
          teamBId: teams[i + mid].id // Seeds 5, 6, 7, 8
        });
      }
    }

    return matches;
  }

  /**
   * Subsequent rounds: Greedy pairing within score groups
   */
  generateNextRound(
    teams: Team[],
    history: Match[],
    roundNumber: number
  ): Match[] {
    // 1. Calculate rankings with Buchholz
    const rankings = this.rankingStrategy.calculateStandings(history, teams);

    // 2. Group by score
    const scoreGroups = this.groupByScore(rankings);

    // 3. Pair with backtracking
    const pairings = this.pairWithBacktracking(scoreGroups, history);

    // 4. Handle bye for odd team count
    if (teams.length % 2 === 1) {
      this.assignBye(pairings, rankings, history);
    }

    return this.createMatches(pairings, roundNumber);
  }

  private pairWithBacktracking(
    scoreGroups: Map<number, Team[]>,
    history: Match[]
  ): [Team, Team][] {
    // Greedy: try to pair within score group
    // Constraint: no repeat matchups (history check)
    // Downfloat: move to next group if no valid pair
    // Backtrack: undo and retry if stuck
  }
}
```

#### 2.6 BracketGenerator (for knockout phases - Spec Section 5.3)

**Location:** `src/domain/generators/BracketGenerator.ts`

Extract common patterns from:
- `src/utils/knockout/generator.ts`
- `src/utils/placementTree/generator.ts`
- `src/utils/shortMainRound/generator.ts`

```typescript
interface BracketGenerator<TConfig> {
  /**
   * Generate bracket structure with placeholder matches
   */
  generateBracket(config: TConfig, teamCount: number): MatchNode[];

  /**
   * Populate bracket with actual teams from group standings
   */
  populateTeams(
    bracket: MatchNode[],
    groupStandings: Map<string, StandingEntry[]>
  ): MatchNode[];

  /**
   * Update bracket after a match is completed
   * (propagate winner/loser to dependent matches)
   */
  updateBracket(
    bracket: MatchNode[],
    completedMatch: MatchNode
  ): MatchNode[];

  /**
   * Calculate final placements from completed bracket
   */
  calculatePlacements(bracket: MatchNode[]): Placement[];
}

// Match as graph node (from Spec Section 6.1)
interface MatchNode {
  id: string;
  teamA: TeamSlot;
  teamB: TeamSlot;
  winnerGoesTo: MatchEdge | null;  // null = tournament ends
  loserGoesTo: MatchEdge | null;   // null = eliminated
  round: string;
  bracket?: string;
  status: 'pending' | 'ready' | 'in-progress' | 'completed';
  scores: SetScore[];
  winnerId: string | null;
}

type TeamSlot =
  | { type: 'static'; teamId: string }
  | { type: 'bye' }
  | { type: 'dependent'; matchId: string; result: 'winner' | 'loser' }
  | { type: 'placeholder'; description: string };

// Concrete implementations
class FullPlacementTreeGenerator implements BracketGenerator { }  // Mode 3A
class SplitBracketGenerator implements BracketGenerator { }       // Mode 3B
class SSVBKnockoutGenerator implements BracketGenerator { }       // Mode 3C
class DoubleEliminationGenerator implements BracketGenerator { }  // Mode 4
```

#### 2.7 Scheduling Engine

**Location:** `src/domain/scheduling/SchedulingEngine.ts`

Consolidate from `src/utils/scheduling/*`:

```typescript
export class SchedulingEngine {
  private timeCalculator: TimeCalculator;
  private durationEstimator: DurationEstimator;

  scheduleMatches(
    matches: Match[],
    config: SchedulingConfig
  ): ScheduledMatch[];

  estimateTournamentDuration(
    system: TournamentSystem,
    teamCount: number,
    config: SchedulingConfig
  ): DurationEstimate;

  calculatePhaseTimings(
    phases: TournamentPhase[],
    config: SchedulingConfig
  ): PhaseTimings;
}

interface SchedulingConfig {
  startTime: string;
  numberOfCourts: number;
  matchDuration: number;      // minutes
  breakBetweenMatches: number;
  phaseTransitionTime: number;
}
```

#### 2.8 Validation Layer

**Location:** `src/domain/validation/`

```typescript
// TournamentValidator.ts
export class TournamentValidator {
  validateConfiguration(config: TournamentConfig): ValidationResult;
  validateTeamCount(count: number, system: TournamentSystem): ValidationResult;
  validateGroupConfiguration(config: GroupPhaseConfig): ValidationResult;
}

// ScoreValidator.ts
export class ScoreValidator {
  validateScore(scores: SetScore[], config: ScoringConfig): ValidationResult;
  validateMatchCompletion(match: Match): ValidationResult;
}

// ValidationResult type
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

**Deliverables:**
- [ ] `src/domain/standings/StandingsEngine.ts`
- [ ] `src/domain/standings/TiebreakerResolver.ts`
- [ ] `src/domain/systems/base/BracketGenerator.ts`
- [ ] `src/domain/systems/knockout/KnockoutBracketGenerator.ts`
- [ ] `src/domain/systems/placementTree/PlacementTreeGenerator.ts`
- [ ] `src/domain/systems/shortMainRound/MultiBracketGenerator.ts`
- [ ] `src/domain/scheduling/SchedulingEngine.ts`
- [ ] `src/domain/validation/*.ts`
- [ ] Comprehensive unit tests for all domain classes

---

### Phase 3: Application Layer - Orchestrators (Week 4)

**Goal:** Create clear orchestration patterns for complex multi-step operations.

#### 3.1 Match Completion Orchestrator

**Location:** `src/application/orchestrators/MatchCompletionOrchestrator.ts`

Extract from: `src/context/reducerActions/matchActions.ts` (lines 39-241)

```typescript
export class MatchCompletionOrchestrator {
  constructor(
    private standingsEngine: StandingsEngine,
    private bracketGenerators: Map<TournamentSystem, BracketGenerator>,
    private refereeAssigner: RefereeAssigner
  ) {}

  completeMatch(
    match: Match,
    tournament: Tournament,
    state: TournamentState
  ): MatchCompletionResult {
    // Step 1: Calculate winner
    const winner = this.calculateWinner(match.scores);

    // Step 2: Update bracket (if knockout variant)
    const updatedMatches = this.updateBracket(match, tournament);

    // Step 3: Recalculate standings
    const standings = this.standingsEngine.calculateStandings(
      updatedMatches,
      tournament.teams
    );

    // Step 4: Assign referees (if enabled)
    const matchesWithRefs = this.assignReferees(updatedMatches, tournament);

    // Step 5: Check phase completion
    const phaseStatus = this.checkPhaseCompletion(matchesWithRefs, tournament);

    // Step 6: Populate downstream phases (if phase complete)
    const populatedPhases = this.populateDownstreamPhases(
      phaseStatus,
      standings,
      state
    );

    return {
      updatedMatch: { ...match, winnerId: winner, status: 'completed' },
      updatedMatches: matchesWithRefs,
      standings,
      tournamentStatus: this.determineTournamentStatus(matchesWithRefs),
      populatedPhases
    };
  }
}
```

#### 3.2 Tournament Start Orchestrator

**Location:** `src/application/orchestrators/TournamentStartOrchestrator.ts`

Extract from: `src/context/reducerActions/startTournamentHelper.ts`

```typescript
export class TournamentStartOrchestrator {
  startTournament(
    tournament: Tournament,
    state: TournamentState
  ): TournamentStartResult {
    // Step 1: Validate configuration
    const validation = this.validator.validateConfiguration(tournament);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // Step 2: Generate matches based on system
    const matches = this.generateMatches(tournament);

    // Step 3: Schedule matches
    const scheduledMatches = this.schedulingEngine.scheduleMatches(
      matches,
      tournament.schedulingConfig
    );

    // Step 4: Initialize standings
    const standings = this.initializeStandings(tournament.teams);

    // Step 5: Create downstream phases (if multi-phase)
    const phases = this.createDownstreamPhases(tournament);

    return {
      success: true,
      tournament: {
        ...tournament,
        matches: scheduledMatches,
        standings,
        status: 'in-progress'
      },
      additionalPhases: phases
    };
  }
}
```

#### 3.3 Slim Reducer Handlers

Reducer handlers become thin dispatchers:

```typescript
// src/application/reducers/handlers/completeMatch.ts
export function handleCompleteMatch(
  state: TournamentState,
  action: CompleteMatchAction
): TournamentState {
  const tournament = findTournament(state, action.tournamentId);
  const match = findMatch(tournament, action.matchId);

  // Delegate to orchestrator
  const result = matchCompletionOrchestrator.completeMatch(
    match,
    tournament,
    state
  );

  // Apply result to state
  return applyMatchCompletionResult(state, result);
}
```

**Deliverables:**
- [ ] `src/application/orchestrators/MatchCompletionOrchestrator.ts`
- [ ] `src/application/orchestrators/TournamentStartOrchestrator.ts`
- [ ] `src/application/orchestrators/PhaseTransitionOrchestrator.ts`
- [ ] Refactored reducer handlers (all < 50 lines)
- [ ] Integration tests for orchestrators

---

### Phase 4: Presentation Layer - Component Unification (Week 5)

**Goal:** Reduce component duplication while maintaining flexibility.

#### 4.1 Unified MatchList Component

**Location:** `src/presentation/components/matches/MatchList.tsx`

Replace 5 separate components with one configurable component:

```typescript
interface MatchListProps {
  matches: Match[];
  teams: Team[];
  groupingStrategy: 'round' | 'group' | 'bracket' | 'knockoutRound' | 'none';
  onMatchClick: (match: Match) => void;
  filters: MatchFilters;
  showScheduledTime?: boolean;
  showDelayWarnings?: boolean;
  showReferees?: boolean;
}

export function MatchList({
  matches,
  teams,
  groupingStrategy,
  ...props
}: MatchListProps) {
  const groupedMatches = useGroupedMatches(matches, groupingStrategy);

  return (
    <div className="match-list">
      {groupedMatches.map(group => (
        <MatchGroup
          key={group.id}
          group={group}
          teams={teams}
          {...props}
        />
      ))}
    </div>
  );
}
```

#### 4.2 Grouping Strategies

**Location:** `src/presentation/components/matches/grouping/`

```typescript
// useGroupedMatches.ts
export function useGroupedMatches(
  matches: Match[],
  strategy: GroupingStrategy
): MatchGroup[] {
  return useMemo(() => {
    switch (strategy) {
      case 'round':
        return groupByRound(matches);
      case 'group':
        return groupByGroup(matches);
      case 'bracket':
        return groupByBracket(matches);
      case 'knockoutRound':
        return groupByKnockoutRound(matches);
      default:
        return [{ id: 'all', name: 'All Matches', matches }];
    }
  }, [matches, strategy]);
}
```

#### 4.3 Form State Extraction

**Location:** `src/presentation/hooks/useConfigureForm.ts`

Split the 247-line hook:

```typescript
// useConfigureFormState.ts - Just state management
export function useConfigureFormState(initialTournament?: Tournament) {
  const [name, setName] = useState(initialTournament?.name ?? '');
  const [system, setSystem] = useState<TournamentSystem>('round-robin');
  // ... other state

  return { name, setName, system, setSystem, /* ... */ };
}

// useConfigureValidation.ts - Validation logic
export function useConfigureValidation(formState: ConfigureFormState) {
  const errors = useMemo(() => {
    return tournamentValidator.validateConfiguration(formState);
  }, [formState]);

  return { errors, isValid: errors.length === 0 };
}

// useConfigureForm.ts - Combines both
export function useConfigureForm(initialTournament?: Tournament) {
  const state = useConfigureFormState(initialTournament);
  const validation = useConfigureValidation(state);
  const handlers = useConfigureFormHandlers(state);

  return { ...state, ...validation, ...handlers };
}
```

**Deliverables:**
- [ ] Unified `MatchList` component
- [ ] Grouping strategy hooks
- [ ] Refactored `useConfigureForm` (split into 3 hooks)
- [ ] Delete old duplicate components
- [ ] Component tests

---

### Phase 5: Testing & Documentation (Week 6)

**Goal:** Ensure refactored code is well-tested and documented.

#### 5.1 Test Strategy

```
tests/
├── domain/                    # Pure unit tests (no React)
│   ├── generators/
│   │   ├── RoundRobinGenerator.test.ts
│   │   ├── SwissGenerator.test.ts
│   │   ├── GroupPhaseGenerator.test.ts
│   │   └── brackets/
│   │       ├── FullPlacementTreeGenerator.test.ts
│   │       ├── SplitBracketGenerator.test.ts
│   │       └── SSVBKnockoutGenerator.test.ts
│   ├── standings/
│   │   ├── StandardRankingStrategy.test.ts
│   │   ├── SwissRankingStrategy.test.ts
│   │   └── StandingsEngine.test.ts
│   └── scheduling/
│       └── SchedulingEngine.test.ts
│
├── application/               # Integration tests
│   ├── orchestrators/
│   │   ├── MatchCompletionOrchestrator.test.ts
│   │   └── TournamentStartOrchestrator.test.ts
│   └── reducers/
│       └── tournamentReducer.test.ts
│
├── presentation/              # Component tests
│   └── components/
│       ├── MatchList.test.tsx
│       └── ConfigureForm.test.tsx
│
└── e2e/                       # End-to-end scenarios
    ├── fullTournament.test.ts
    └── teamDropout.test.ts
```

#### 5.2 Test Scenarios (from Specification)

**Round Robin Tests:**
```typescript
describe('RoundRobinGenerator', () => {
  it('generates N*(N-1)/2 matches for N teams');
  it('handles odd team count with byes correctly');
  it('ensures each team plays exactly once per round');
  it('no team appears twice in same round');
  it('generates playoff matches: T1 vs T2, T3 vs T4, etc.');
  it('alternates home/away for fairness');
});
```

**Swiss System Tests:**
```typescript
describe('SwissGenerator', () => {
  it('prevents repeat matchups across all rounds');
  it('pairs teams with similar scores (same score group first)');
  it('downfloats when no valid pairs in score group');
  it('assigns bye to lowest ranked team without previous bye');
});

describe('SwissRankingStrategy', () => {
  it('calculates Buchholz as sum of opponents match points');
  it('calculates Fine-Buchholz as sum of opponents Buchholz');
  it('breaks ties: matchPoints → Buchholz → fBH → setQuotient');
});
```

**Group Phase Tests:**
```typescript
describe('GroupPhaseGenerator', () => {
  it('applies snake seeding: A gets 1,8,9,16; B gets 2,7,10,15');
  it('handles uneven groups with byes');
  it('calculates group standings with correct tiebreakers');
});

describe('SnakeSeeding', () => {
  it('row 0: left-to-right (A, B, C, D)');
  it('row 1: right-to-left (D, C, B, A)');
  it('row 2: left-to-right again');
});
```

**Bracket Tests:**
```typescript
describe('FullPlacementTreeGenerator', () => {
  it('creates double-sided tree with winner AND loser paths');
  it('every match has winnerGoesTo and loserGoesTo');
  it('determines all placements 1 through N');
  it('applies cross-seeding: A1 vs B4, B1 vs A4, A2 vs B3, B2 vs A3');
});

describe('SSVBKnockoutGenerator', () => {
  it('eliminates group 4ths with status ELIMINATED');
  it('group 4ths have no matches in knockout');
  it('only plays 3rd place match, no other consolation');
  it('intermediate round: A2 vs B3, B2 vs A3');
});

describe('SplitBracketGenerator', () => {
  it('creates 3 tiers with no reconnection');
  it('tier 3 teams cannot reach tier 1');
  it('routes intermediate losers to placement bracket');
});
```

**Match Graph Tests:**
```typescript
describe('MatchNode', () => {
  it('propagates winner to winnerGoesTo.matchId');
  it('propagates loser to loserGoesTo.matchId');
  it('handles conditional matches (Double Elim reset)');
  it('orphaned matches have static teams');
  it('dependent matches wait for prerequisite completion');
});
```

#### 5.3 Documentation Updates

- Architecture decision records (ADRs)
- API documentation for domain classes
- Component storybook (optional)
- Updated README with new structure

**Deliverables:**
- [ ] Domain layer unit tests (90%+ coverage)
- [ ] All test scenarios from specification implemented
- [ ] Orchestrator integration tests
- [ ] Component tests for unified components
- [ ] Updated project documentation

---

## Migration Strategy

### Approach: Strangler Fig Pattern

Instead of a "big bang" rewrite, we'll gradually replace old code with new implementations:

1. **New code in parallel:** Create new domain/application structure alongside existing code
2. **Feature flags:** Use flags to switch between old and new implementations
3. **Gradual migration:** Move one system type at a time
4. **Delete old code:** Remove old implementations once all systems are migrated

### Migration Order

| Order | Component | Reason |
|-------|-----------|--------|
| 1 | Type guards | Foundation for all other work |
| 2 | StandingsEngine | Used by all systems, well-contained |
| 3 | SchedulingEngine | Self-contained, clear interface |
| 4 | KnockoutBracketGenerator | Most complex bracket system |
| 5 | PlacementTreeGenerator | Similar to knockout |
| 6 | MultiBracketGenerator | Uses patterns from above |
| 7 | Orchestrators | Once domain is stable |
| 8 | Unified MatchList | Once orchestrators work |
| 9 | Form hooks | Lower priority, less duplication |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Comprehensive tests before refactoring |
| Scope creep | Medium | Stick to phases, no feature additions |
| Performance regression | Low | Benchmark before/after |
| localStorage compatibility | Medium | Ensure data format backward compatible |
| Development velocity drop | Medium | Keep old code working during migration |

---

## Success Metrics

After refactoring is complete, we should see:

1. **Code Quality**
   - No file > 300 lines
   - All system checks use type guards
   - No duplicate match list components
   - Reducer handlers < 50 lines each

2. **Test Coverage**
   - Domain layer: 90%+ coverage
   - Orchestrators: 80%+ coverage
   - Components: 70%+ coverage

3. **Developer Experience**
   - Clear folder structure matching mental model
   - Easy to add new tournament system
   - Easy to modify scoring/standings rules
   - Easy to customize scheduling

4. **Maintainability**
   - Single source of truth for each concept
   - Clear dependencies between layers
   - Documented architecture decisions

---

## File Change Summary

| Action | Count | Description |
|--------|-------|-------------|
| Create | ~30 | New domain/application/presentation structure |
| Modify | ~40 | Update imports, use new types |
| Delete | ~15 | Remove duplicate components, consolidate utils |
| Move | ~20 | Reorganize into new folder structure |

---

## Next Steps

1. Review and approve this plan
2. Create feature branch `refactor-architecture`
3. Start with Phase 1 (type system)
4. Weekly sync to assess progress
5. Merge to main after each phase is complete and tested
