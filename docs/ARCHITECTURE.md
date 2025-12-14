# Beachvolleyball Tournament Management System - Architecture Documentation

## Overview

This is a client-side React application for managing beach volleyball tournaments. It supports multiple tournament formats and handles complete tournament lifecycle from configuration through match scheduling to final standings.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19.2 + TypeScript 5.9 |
| Build Tool | Vite 7.2 |
| Styling | Tailwind CSS 4.1 |
| State Management | React Context + useReducer |
| Persistence | Browser localStorage |
| Routing | React Router 7.10 |

**Note:** This is a pure client-side application with no backend. All data persists in browser localStorage.

---

## Project Structure

```
src/
├── pages/                  # Main page components
│   ├── Home.tsx           # Tournament list & overview
│   ├── Configure.tsx      # Tournament creation & settings
│   ├── Matches.tsx        # Match management & scoring
│   └── Standings.tsx      # Standings display
├── components/            # Reusable UI components
├── context/               # Global state management
│   ├── TournamentContext.tsx
│   ├── tournamentReducer.ts    # State update logic
│   └── tournamentActions.ts    # Action & state types
├── types/                 # TypeScript interfaces
│   └── tournament.ts      # Core data models
├── utils/                 # Business logic utilities
│   ├── scheduling.ts      # Time calculation, court assignment
│   ├── groupPhase.ts      # Group creation, seeding, matches
│   ├── knockout.ts        # SSVB knockout bracket generation
│   ├── placementTree.ts   # Full placement tree (all positions)
│   ├── shortMainRound.ts  # Optimized multi-bracket format
│   ├── playoff.ts         # Adjacent-pair playoff format
│   ├── roundRobin.ts      # Circle method match generation
│   ├── swissSystem.ts     # Swiss pairing algorithm
│   ├── standings.ts       # Ranking calculation
│   ├── refereeAssignment.ts
│   └── scoreValidation.ts
└── main.tsx
```

---

## Tournament Systems

The application supports **7 tournament formats**:

### Single-Phase Formats

| System | Description | Use Case |
|--------|-------------|----------|
| `round-robin` | Every team plays every other team | Small tournaments (≤8 teams) |
| `swiss` | Configurable rounds, teams paired by strength | Medium tournaments without groups |
| `playoff` | Adjacent pairing (1v2, 3v4, etc.) | Finals after round-robin/swiss |

### Multi-Phase Group-Based Formats (8-32 teams, multiples of 4)

| System | Phase 1 | Phase 2 |
|--------|---------|---------|
| `group-phase` (SSVB) | Round-robin groups (4 teams each) | Flexible knockout based on group count |
| `beachl-all-placements` | Round-robin groups | Complete placement tree (all 1..N positions) |
| `beachl-short-main-round` | Round-robin groups | Multi-bracket (Top-4, 5-8, 9-12, 13-16) |

---

## Core Data Models

### Tournament

```typescript
interface Tournament {
  id: string;
  name: string;
  system: TournamentSystem;
  numberOfCourts: number;
  setsPerMatch: 1 | 2 | 3;
  pointsPerSet: 21 | 15;
  pointsPerThirdSet?: 15;
  tiebreakerOrder: 'head-to-head-first' | 'point-diff-first';

  teams: Team[];
  matches: Match[];
  standings: StandingEntry[];
  groupStandings?: GroupStandingEntry[];

  status: 'configuration' | 'in-progress' | 'completed';
  containerId?: string;          // Reference to parent container
  parentPhaseId?: string;        // Link to group phase (for knockout)
  phaseOrder?: number;           // Order within container (1, 2, 3...)
  phaseName?: string;            // Display name ("Vorrunde", "Hauptrunde")

  groupPhaseConfig?: GroupPhaseConfig;
  knockoutConfig?: KnockoutConfig;
  knockoutSettings?: KnockoutSettings;
  scheduling?: SchedulingSettings;
}
```

### Match

```typescript
interface Match {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;        // Can be null before placement
  teamBId: string | null;
  courtNumber: number | null;

  scores: SetScore[];            // [{ teamA: 21, teamB: 19 }, ...]
  winnerId: string | null;
  status: 'scheduled' | 'in-progress' | 'completed' | 'pending';

  // Knockout matches
  knockoutRound?: KnockoutRoundType;
  bracketPosition?: number;
  dependsOn?: {
    teamA?: { matchId: string; result: 'winner' | 'loser' };
    teamB?: { matchId: string; result: 'winner' | 'loser' };
  };

  // Placement tree
  placementInterval?: { start: number; end: number };
  winnerInterval?: { start: number; end: number };
  loserInterval?: { start: number; end: number };

  // Playoff
  isPlayoff?: boolean;
  playoffForPlace?: number;

  // Group phase
  groupId?: string;

  // Referee
  refereeTeamId?: string | null;
  refereePlaceholder?: string;

  // Placeholders
  teamAPlaceholder?: string;
  teamBPlaceholder?: string;
}
```

### TournamentContainer (Multi-Phase Support)

```typescript
interface TournamentContainer {
  id: string;
  name: string;
  phases: TournamentPhaseRef[];    // Ordered phases
  currentPhaseIndex: number;
  status: 'in-progress' | 'completed';
}
```

---

## Tournament Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONFIGURATION                             │
│  - Set name, system type, teams                                 │
│  - Configure courts, sets, points                               │
│  - Setup groups (for group-based systems)                       │
│  - Set tiebreaker rules                                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ START TOURNAMENT
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MATCH GENERATION                             │
│  - Generate initial matches (Spielplan)                         │
│  - Assign court numbers and rounds                              │
│  - For group-based: Create knockout phase placeholder           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IN PROGRESS                                 │
│  - Enter match scores                                           │
│  - Complete matches                                             │
│  - Auto-populate knockout brackets                              │
│  - Swiss: Generate next round when current complete             │
│  - Group-based: Populate knockout teams when groups finish      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ ALL MATCHES COMPLETE
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       COMPLETED                                  │
│  - Final standings locked                                       │
│  - Optional: Create next phase (playoff)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schedule Generation (Spielplan)

### Round-Robin Algorithm

Uses the **circle method** for fair rotation:
- Fixed first team, rotating others
- For N teams: N-1 rounds needed
- Matches per round: N/2

### Group Phase

1. **Seeding:** Snake-draft (alternating pattern to balance groups)
2. **Matches:** Each group plays round-robin (6 matches for 4 teams)
3. **Interleaving:** Matches from different groups run in parallel
4. **Court Assignment:** Round-robin assignment to available courts

### Knockout Generation

| Groups | Structure |
|--------|-----------|
| 2 (8 teams) | Semifinals directly |
| 3 (12 teams) | 3 group winners + best 2nd → Semifinals |
| 4 (16 teams) | Winners → QF, 2nd/3rd → Intermediate, 4th → Bottom |
| 5-8 (20-32 teams) | Scaled knockout structure |

### Match Dependencies

Knockout matches use `dependsOn` field:
```typescript
{
  teamA: { matchId: "match-1", result: "winner" },
  teamB: { matchId: "match-2", result: "winner" }
}
```

When parent match completes, dependent matches auto-populate.

---

## Standings Calculation

### Primary Sort
- 1 set format: `wins`
- 2+ sets format: `sets won`

### Tiebreaker Order (configurable)

| Option | Order |
|--------|-------|
| `head-to-head-first` | Direct match result → Point difference |
| `point-diff-first` | Point difference → Head-to-head |

### Group Standings

Calculated per group for knockout seeding:
1. Points (wins or sets depending on format)
2. Tiebreaker as configured
3. Set difference
4. Point difference

---

## State Management

### Context Structure

```typescript
TournamentContext {
  state: {
    tournaments: Tournament[];
    containers: TournamentContainer[];
    currentTournamentId: string;
  };
  dispatch(action);
  currentTournament;     // derived
  currentContainer;      // derived
  containerPhases;       // derived, sorted by phaseOrder
}
```

### Key Actions

| Action | Description |
|--------|-------------|
| `CREATE_TOURNAMENT` | Create new tournament |
| `START_TOURNAMENT` | Initialize matches, create knockout placeholder |
| `UPDATE_MATCH_SCORE` | Record scores |
| `COMPLETE_MATCH` | Finish match, update bracket |
| `GENERATE_NEXT_SWISS_ROUND` | Create next Swiss round |
| `CREATE_KNOCKOUT_TOURNAMENT` | Create knockout phase |
| `RESET_TOURNAMENT` | Clear matches, return to config |

---

## Configuration Options

### Basic Settings
- Tournament name
- System type (7 options)
- Number of courts
- Sets per match (1, 2, or 3)
- Points per set (21 or 15)
- Tiebreaker order

### Group Phase Settings
- Number of groups (2-8)
- Teams per group (fixed at 4)
- Seeding method (snake, random, manual)

### Knockout Settings
- Sets per match (can differ from group phase)
- Points per set
- Play 3rd place match
- Use referees

### Scheduling Settings
- Start/end time
- Minutes per set type
- Break times

---

## Key Business Logic Files

| File | Purpose |
|------|---------|
| `scheduling.ts` | Time calculation, court assignment, duration estimation |
| `groupPhase.ts` | Group creation, seeding, group-phase matches, standings |
| `roundRobin.ts` | Circle method match generation |
| `swissSystem.ts` | Swiss pairing algorithm |
| `knockout.ts` | SSVB flexible knockout bracket |
| `placementTree.ts` | Full placement tree (all positions 1..N) |
| `shortMainRound.ts` | Multi-bracket format (Top-4, 5-8, 9-12, 13-16) |
| `playoff.ts` | Adjacent-pair playoff format |
| `standings.ts` | Ranking calculation with tiebreakers |
| `refereeAssignment.ts` | Referee allocation for K.O. phases |
| `tournamentReducer.ts` | Central state mutation logic |

---

## Example: 16-Team SSVB Tournament

```
1. CONFIGURATION
   - 16 teams, 4 courts
   - System: beachl-all-placements
   - Sets: 1 per match, 21 points

2. START
   - 4 groups × 6 matches = 24 group phase matches
   - Placement tree placeholder created (pending teams)

3. GROUP PHASE COMPLETION
   - Standings per group calculated
   - Seeds: 1A, 1B, 1C, 1D, 2A, ..., 4D

4. KNOCKOUT PHASE
   - Round 1: 8 matches, intervals [1..16] → [1..8] + [9..16]
   - Round 2: 8 matches, each interval splits
   - Round 3: 8 semifinal matches
   - Round 4: 8 final matches

5. COMPLETION
   - All 16 placements determined (no ties)
   - Final standings: 1st through 16th place
```

---

## Data Persistence

- **Storage:** Browser `localStorage`
- **Key:** `'beachvolleyball-tournament-state'`
- **Scope:** Entire TournamentState (tournaments + containers)
- **Sync:** Auto-save on every state change

---

## Testing Considerations

Key areas for testing schedule generation:

1. **Match Count Validation**
   - Round-robin: n*(n-1)/2 matches
   - Groups: 6 matches per group of 4
   - Knockout: Depends on format

2. **Team Coverage**
   - Every team plays correct number of matches
   - No team plays themselves
   - No duplicate matchups

3. **Dependency Integrity**
   - Knockout matches reference valid parent matches
   - Auto-population works correctly

4. **Phase Transitions**
   - Group → Knockout seeding order
   - Swiss round generation

5. **Edge Cases**
   - Odd number of teams (byes)
   - Minimum/maximum team counts
   - Single court vs multiple courts
