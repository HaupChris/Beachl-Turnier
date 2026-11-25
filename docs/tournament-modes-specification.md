# Tournament Modes Specification

This document formally defines all tournament algorithms, their data structures, and the mapping to implementation.

---

## Table of Contents

1. [Mode Overview & Naming](#mode-overview--naming)
2. [Mode 1: Round Robin](#mode-1-round-robin)
3. [Mode 2: Swiss System](#mode-2-swiss-system)
4. [Mode 3: Group Phase with Tree Transition](#mode-3-group-phase-with-tree-transition)
5. [Mode 4: Double Elimination](#mode-4-double-elimination)
6. [Core Abstractions](#core-abstractions)
7. [Data Structure Definitions](#data-structure-definitions)

---

## Mode Overview & Naming

### Current Implementation vs. Specification Mapping

| Spec Name | Current `system` Value | Description |
|-----------|------------------------|-------------|
| Round Robin | `round-robin` | Every team plays every other team |
| Round Robin + Playoff | `playoff` | Round Robin followed by neighbor-based finals |
| Swiss System | `swiss` | Dynamic pairing by strength |
| Group Phase (standalone) | `group-phase` | Groups only, no knockout phase |
| **3A**: Full Placement Tree | `beachl-all-placements` | Groups → Full binary placement tree |
| **3B**: Shortened Main Round | `beachl-short-main` | Groups → Tiered split brackets |
| **3C**: SSVB Knockout | `knockout` (phase 2) | Groups → Single elimination with cutoff |
| Double Elimination | *not implemented* | Winner/Loser bracket system |

### Proposed Unified Naming

```typescript
type TournamentSystem =
  // Standalone modes (no phases)
  | 'round-robin'           // Mode 1 basic
  | 'round-robin-playoff'   // Mode 1 with optional finale
  | 'swiss'                 // Mode 2
  | 'double-elimination'    // Mode 4

  // Group-based modes (Phase 1 + Phase 2)
  | 'groups-only'           // Phase 1 only, no transition
  | 'groups-full-placement' // Mode 3A: Full Placement Tree
  | 'groups-split-bracket'  // Mode 3B: Shortened Main Round
  | 'groups-ssvb-knockout'; // Mode 3C: SSVB Single-Out
```

---

## Mode 1: Round Robin

### 1.1 Algorithm: Polygon Method (Berger Tables)

**Input:**
- `N` = number of teams
- `teams: Team[]` ordered by seed

**Algorithm:**

```
1. NORMALIZE
   if N is odd:
     N_total = N + 1
     add virtual team BYE
   else:
     N_total = N

2. GENERATE ROUNDS
   for round r = 1 to (N_total - 1):

     // Create position array for this round
     positions = [1]  // Team 1 is fixed

     // Rotate teams 2..N_total
     for i = 2 to N_total:
       rotated_index = ((i - 2 + r - 1) mod (N_total - 1)) + 2
       positions.push(rotated_index)

     // Create pairings
     for i = 0 to (N_total / 2 - 1):
       teamA = positions[i]
       teamB = positions[N_total - 1 - i]

       // Skip if either is BYE
       if teamA != BYE and teamB != BYE:
         create_match(round: r, teamA, teamB)

3. HOME/AWAY ALTERNATION (optional)
   For fair side selection, alternate which team is "home":
   - Round 1: lower seed is home
   - Round 2: higher seed is home
   - Continue alternating
```

**Output:** `Match[]` with all round-robin matches

### 1.2 Optional Playoff Finale

**Trigger:** After all round-robin matches are completed

**Algorithm:**

```
1. CALCULATE STANDINGS
   standings = calculateStandings(matches, teams)
   ranked_teams = sort(standings) // T1, T2, T3, ..., TN

2. GENERATE PLACEMENT MATCHES
   matches = []
   for i = 0 to floor(N/2) - 1:
     teamA = ranked_teams[i * 2]      // T1, T3, T5, ...
     teamB = ranked_teams[i * 2 + 1]  // T2, T4, T6, ...

     place_for = i * 2 + 1  // Playing for 1st, 3rd, 5th, ...
     matches.push({
       round: 'playoff',
       teamA, teamB,
       playoffForPlace: place_for,
       description: `Match for place ${place_for}/${place_for + 1}`
     })

3. If N is odd:
   // Last team has no opponent, gets last place automatically
   ranked_teams[N-1].finalPlacement = N
```

### 1.3 Edge Cases

| Condition | Handling |
|-----------|----------|
| N = 2 | 1 match total |
| N = 1 | No matches, team wins by default |
| N odd | Add BYE, matches against BYE are skipped |
| N > 7 | UI warning: ${N*(N-1)/2}$ matches grows quadratically |

### 1.4 Complexity

- Matches: $\frac{N(N-1)}{2}$
- Rounds: $N-1$ (or $N$ if $N$ is odd)
- Matches per round: $\lfloor N/2 \rfloor$

---

## Mode 2: Swiss System

### 2.1 Ranking Criteria (Priority Order)

| Priority | Criterion | Calculation |
|----------|-----------|-------------|
| 1 | Match Points | 1 point per win, 0 per loss |
| 2 | Buchholz (BH) | Sum of all opponents' match points |
| 3 | Fine-Buchholz (fBH) | Sum of all opponents' Buchholz numbers |
| 4 | Set Quotient | Sets won / Sets lost |
| 5 | Point Quotient | Points won / Points lost |

```typescript
interface SwissRanking {
  teamId: string;
  matchPoints: number;
  buchholz: number;
  fineBuchholz: number;
  setQuotient: number;
  pointQuotient: number;
}

function calculateBuchholz(teamId: string, matches: Match[]): number {
  const opponents = getOpponents(teamId, matches);
  return sum(opponents.map(opp => getMatchPoints(opp, matches)));
}

function calculateFineBuchholz(teamId: string, matches: Match[]): number {
  const opponents = getOpponents(teamId, matches);
  return sum(opponents.map(opp => calculateBuchholz(opp, matches)));
}
```

### 2.2 Round Generation Algorithm

**Input:**
- `teams: Team[]`
- `history: Match[]` (all completed matches in this tournament)
- `roundNumber: number`

**Algorithm:**

```
function generateSwissRound(teams, history, roundNumber):

  // ROUND 1: Use seeding
  if roundNumber == 1:
    return generateRound1(teams)

  // SUBSEQUENT ROUNDS
  1. CALCULATE RANKINGS
     rankings = calculateSwissRankings(teams, history)
     sortedTeams = sortByRanking(rankings)

  2. CREATE SCORE GROUPS
     scoreGroups = groupBy(sortedTeams, team => team.matchPoints)
     // Example: {2: [T1, T2], 1: [T3, T4, T5], 0: [T6, T7]}

  3. PAIRING WITH BACKTRACKING
     pairings = []
     unpaired = [...sortedTeams]

     while unpaired.length > 1:
       team = unpaired[0]

       // Find valid opponent (same score group preferred)
       opponent = findValidOpponent(team, unpaired, history)

       if opponent:
         pairings.push([team, opponent])
         unpaired.remove(team, opponent)
       else:
         // DOWNFLOAT: Move team to next score group
         downfloat(team)

         // BACKTRACK if stuck
         if noValidPairingsExist(unpaired, history):
           undoLastPairing()
           tryAlternativePairing()

  4. HANDLE BYE
     if unpaired.length == 1:
       byeTeam = unpaired[0]

       // Bye goes to lowest-ranked team without previous bye
       if hasPreviousBye(byeTeam, history):
         // Try to swap with another team
         swapForBye(byeTeam, pairings)

       pairings.push([byeTeam, BYE])

  return createMatches(pairings, roundNumber)


function findValidOpponent(team, candidates, history):
  // Filter candidates in same score group first
  sameScoreGroup = candidates.filter(c =>
    c.matchPoints == team.matchPoints &&
    c != team &&
    !hasPlayedBefore(team, c, history)
  )

  if sameScoreGroup.length > 0:
    return sameScoreGroup[0]  // Highest ranked in group

  // Try adjacent score groups
  for group in adjacentScoreGroups:
    for candidate in group:
      if !hasPlayedBefore(team, candidate, history):
        return candidate

  return null  // Trigger backtracking
```

### 2.3 Round 1 Seeding

```
Given N teams with seeds 1 to N:

Pairing formula:
  Seed 1  vs  Seed (N/2 + 1)
  Seed 2  vs  Seed (N/2 + 2)
  ...
  Seed N/2  vs  Seed N

Example (8 teams):
  1 vs 5
  2 vs 6
  3 vs 7
  4 vs 8
```

### 2.4 Number of Rounds

Recommended rounds based on team count:

| Teams | Recommended Rounds | Max Rounds |
|-------|-------------------|------------|
| 4-8 | 3 | 4 |
| 9-16 | 4 | 5 |
| 17-32 | 5 | 6 |
| 33-64 | 6 | 7 |

Formula: `recommendedRounds = ceil(log2(N)) + 1`

### 2.5 Optional Finale

Same as Mode 1 (neighbor-based playoff matches).

---

## Mode 3: Group Phase with Tree Transition

> **Ersetzt (2026-11-25).** Die fachlichen Anforderungen für die gruppenbasierten Modi stehen jetzt in `docs/schedules/`:
>
> - [Allgemeine Regeln und Übersicht](schedules/README.md): Satzmodus, Tabellenwertung, Freilose, Absage, Felder, Schiedsrichter
> - [Gruppenphase](schedules/group-phase.md)
> - [Full Placement (`groups-full-placement`)](schedules/groups-full-placement.md)
> - [Short Main (`groups-split-bracket`)](schedules/groups-split-bracket.md)
> - [SSVB (`groups-ssvb-knockout`, Entwurf)](schedules/groups-ssvb-knockout.md)
>
> Der Modus „nur Gruppenphase“ (`groups-only`) entfällt.

---

## Mode 4: Double Elimination

### 4.1 Structure

```
WINNER BRACKET (WB):
  All teams start here.
  Losers drop to Loser Bracket.

LOSER BRACKET (LB):
  Teams with 1 loss.
  Losers are eliminated (2 losses = out).

GRAND FINAL:
  WB Champion vs LB Champion
```

### 4.2 Bracket Generation

```
Given N teams (power of 2 for simplicity):

WINNER BRACKET:
  Standard single-elimination bracket.
  WB-R1: N/2 matches
  WB-R2: N/4 matches
  ...
  WB-Final: 1 match

LOSER BRACKET:
  Receives losers from WB at each round.

  LB-R1: Losers from WB-R1 play each other (N/4 matches)
  LB-R2: Winners of LB-R1 vs Losers from WB-R2
  ...
  LB-Final: 1 match (LB Champion)

GRAND FINAL:
  WB Champion vs LB Champion
```

### 4.3 True Double Elimination (Reset Match)

```
GRAND FINAL:
  Match GF: WB-Champ vs LB-Champ

  if LB-Champ wins GF:
    // WB-Champ now has 1 loss, same as LB-Champ
    Match RESET: WB-Champ vs LB-Champ (decisive match)
    Winner of RESET = Tournament Champion
  else:
    WB-Champ = Tournament Champion (LB-Champ has 2 losses)
```

**UI Implication:** The RESET match is **conditional** - it only exists if LB-Champ wins GF.

```typescript
interface ConditionalMatch {
  id: string;
  condition: {
    matchId: string;           // GF match
    requiredWinner: 'teamA' | 'teamB';  // LB-Champ position
  };
  // Only created/visible if condition is met
}
```

---

## Core Abstractions

### 5.1 RankingStrategy Interface

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
class StandardRankingStrategy implements RankingStrategy { }
class SwissRankingStrategy implements RankingStrategy { }  // Includes Buchholz
class HeadToHeadRankingStrategy implements RankingStrategy { }  // Direct comparison first
```

### 5.2 MatchGenerator Factory

```typescript
interface MatchGenerator<TConfig, TMatch extends Match> {
  /**
   * Generate all matches for this format
   */
  generate(teams: Team[], config: TConfig): TMatch[];

  /**
   * Generate next round (for progressive formats like Swiss)
   */
  generateNextRound?(
    teams: Team[],
    history: Match[],
    roundNumber: number,
    config: TConfig
  ): TMatch[];

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

### 5.3 BracketGenerator (for knockout phases)

```typescript
interface BracketGenerator<TConfig> {
  /**
   * Generate bracket structure with placeholder matches
   */
  generateBracket(config: TConfig, teamCount: number): BracketMatch[];

  /**
   * Populate bracket with actual teams from group standings
   */
  populateTeams(
    bracket: BracketMatch[],
    groupStandings: Map<string, StandingEntry[]>
  ): BracketMatch[];

  /**
   * Update bracket after a match is completed
   */
  updateBracket(
    bracket: BracketMatch[],
    completedMatch: BracketMatch
  ): BracketMatch[];

  /**
   * Calculate final placements from completed bracket
   */
  calculatePlacements(bracket: BracketMatch[]): Placement[];
}

// Implementations
class FullPlacementTreeGenerator implements BracketGenerator { }  // Mode 3A
class SplitBracketGenerator implements BracketGenerator { }       // Mode 3B
class SSVBKnockoutGenerator implements BracketGenerator { }       // Mode 3C
class DoubleEliminationBracketGenerator implements BracketGenerator { }  // Mode 4
```

---

## Data Structure Definitions

### 6.1 Match as Graph Node

```typescript
interface MatchNode {
  id: string;

  // Teams (either static or dependent)
  teamA: TeamSlot;
  teamB: TeamSlot;

  // Graph edges
  winnerGoesTo: MatchEdge | null;  // null = end of tournament
  loserGoesTo: MatchEdge | null;   // null = eliminated

  // Match metadata
  round: number | string;  // numeric for groups, string for knockout rounds
  bracket?: string;        // which bracket this belongs to
  courtNumber?: number;
  scheduledTime?: string;

  // State
  status: 'pending' | 'ready' | 'in-progress' | 'completed';
  scores: SetScore[];
  winnerId: string | null;
}

type TeamSlot =
  | { type: 'static'; teamId: string }
  | { type: 'bye' }
  | { type: 'dependent'; matchId: string; result: 'winner' | 'loser' }
  | { type: 'placeholder'; description: string };  // e.g., "Winner of QF1"

interface MatchEdge {
  matchId: string;
  slot: 'A' | 'B';
}
```

### 6.2 Tournament State

```typescript
interface Tournament {
  id: string;
  name: string;
  system: TournamentSystem;
  status: 'configuration' | 'in-progress' | 'completed';

  // Teams
  teams: Team[];

  // Phase 1: Groups (if applicable)
  groupConfig?: GroupPhaseConfig;
  groupMatches?: Match[];
  groupStandings?: Map<string, StandingEntry[]>;

  // Phase 2: Knockout/Bracket (if applicable)
  bracketConfig?: BracketConfig;
  bracketMatches?: MatchNode[];  // Graph structure

  // Computed
  placements?: Placement[];

  // Scheduling
  schedulingConfig: SchedulingConfig;
}

interface GroupPhaseConfig {
  numberOfGroups: number;
  teamsPerGroup: number;
  groups: Group[];
  internalMode: 'round-robin' | 'double-elimination';
  rankingStrategy: RankingStrategyType;
}

interface BracketConfig {
  type: 'full-placement' | 'split-bracket' | 'ssvb-knockout' | 'double-elimination';
  playThirdPlaceMatch: boolean;
  useReferees: boolean;
  eliminatedAfterGroupPhase?: string[];  // Team IDs that don't continue
}
```

### 6.3 Placement

```typescript
interface Placement {
  place: number | { start: number; end: number };  // e.g., 1 or {start: 9, end: 12}
  teamId: string;
  determinedBy:
    | { type: 'match'; matchId: string; result: 'winner' | 'loser' }
    | { type: 'eliminated'; reason: string }
    | { type: 'bye' };
}
```

---

## Test Scenarios

### Round Robin Tests

```typescript
describe('RoundRobinGenerator', () => {
  it('generates correct number of matches for even teams', () => {
    // 4 teams → 6 matches (N*(N-1)/2)
  });

  it('handles odd number of teams with byes', () => {
    // 5 teams → 10 matches, each team has 1 bye
  });

  it('ensures each team plays exactly once per round', () => {
    // No team appears twice in same round
  });

  it('generates playoff matches based on final standings', () => {
    // 1st vs 2nd, 3rd vs 4th, etc.
  });
});
```

### Swiss System Tests

```typescript
describe('SwissGenerator', () => {
  it('prevents repeat matchups', () => {
    // Team A that played Team B in R1 cannot play B again
  });

  it('pairs teams with similar scores', () => {
    // 2-0 teams play other 2-0 teams first
  });

  it('calculates Buchholz correctly', () => {
    // Sum of opponents' match points
  });

  it('handles downfloating when no valid pairs in score group', () => {
    // Odd number in score group → one team drops down
  });

  it('assigns bye to lowest ranked team without previous bye', () => {
    // Bye goes to worst team that hasn't had one
  });
});
```

### Group Phase Tests

```typescript
describe('GroupPhaseGenerator', () => {
  it('applies snake seeding correctly', () => {
    // Seeds 1,8,9,16 in Group A; 2,7,10,15 in Group B; etc.
  });

  it('handles uneven group sizes with byes', () => {
    // 14 teams, 4 groups → 2 groups of 4, 2 groups of 3
  });

  it('calculates group standings with tiebreakers', () => {
    // Head-to-head, then set diff, then point diff
  });
});
```

### Bracket Tests

```typescript
describe('FullPlacementTreeGenerator', () => {
  it('creates double-sided tree with winner and loser paths', () => {
    // Every match has both winnerGoesTo and loserGoesTo
  });

  it('determines all placements 1 through N', () => {
    // No team left without a final placement
  });
});

describe('SSVBKnockoutGenerator', () => {
  it('eliminates group 4ths before knockout', () => {
    // Group 4ths have status ELIMINATED, no matches
  });

  it('only plays 3rd place match, no other consolation', () => {
    // SF losers play for 3rd, QF losers are eliminated
  });
});

describe('SplitBracketGenerator', () => {
  it('creates separate tier brackets with no reconnection', () => {
    // Tier 3 teams cannot reach Tier 1
  });

  it('routes intermediate round losers to placement bracket', () => {
    // IR losers go to 5-8 bracket
  });
});
```

---

## Appendix: SSVB Official Rules Reference

The SSVB (Sächsischer Sportverband Volleyball) format follows these specific rules:

1. **4 Groups of 4 teams** (16 teams total, most common)
2. **Group phase:** Round robin within each group
3. **Knockout entry:**
   - Group winners (A1, B1, C1, D1) → Wait for intermediate round
   - 2nd and 3rd → Intermediate round (Zwischenrunde)
   - 4th → Eliminated
4. **Intermediate round:** A2 vs D3, B2 vs C3, C2 vs B3, D2 vs A3
5. **Quarterfinals:** A1 vs W(B2-C3), B1 vs W(A2-D3), etc.
6. **3rd place match:** Yes
7. **Referee system:** Eliminated teams serve as referees
