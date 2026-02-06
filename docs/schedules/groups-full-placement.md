# Group → Full Placement Tree (System Specification)

This document describes the **group phase** plus **full placement tree** scheduling. It uses a "Compass Draw" (Monrad) system to determine exact rankings for every team.

## 1. Core Concept
- **Goal:** Every team plays until a unique rank is determined (1st, 2nd, ... Nth).
- **Structure:** A Binary Tree where winners move to the "better" bracket (Right/Up) and losers drop to the "lower" bracket (Left/Down).
- **Fairness:** Handling non-power-of-two team counts (e.g., 12) requires precise seeding rules to ensure that "Byes" (free passes) are awarded based on merit, not luck.

---

## 2. Phase 1: Group Phase
*Assumptions: Snake Seeding used for groups.*

| Total Teams | Groups | Configuration | Matches/Group | Total Group Matches |
| :--- | :--- | :--- | :--- | :--- |
| **8** | 2 | 2x4 | 6 | 12 |
| **10** | 3 | 1x4, 2x3 | 6 / 3 | 12 |
| **12** | 3 | 3x4 | 6 | 18 |
| **14** | 4 | 2x4, 2x3 | 6 / 3 | 18 |
| **16** | 4 | 4x4 | 6 | 24 |
| **20** | 5 | 5x4 | 6 | 30 |
| **24** | 6 | 6x4 | 6 | 36 |

---

## 3. Detailed Algorithm Specification (Phase 2)

### Step A: Global Seeding (The "Rank Block" Logic)
To transition from Groups to the Tree, teams are assigned a Global Seed ($1 \dots N$).
1.  **Grouping:** Collect all teams into buckets based on their Group Rank (All 1sts, All 2nds, etc.).
2.  **Sorting:** Inside each bucket, sort teams by a **Performance Tiebreaker** (e.g., Quotient of Points, Quotient of Sets).
    * *Why?* In a 12-team tournament, Seed 4 gets a Bye, Seed 5 does not. We must ensure Seed 4 is mathematically the "Best 2nd Place", not just a random 2nd place.
3.  **Flattening:** Concatenate buckets to form the Seed List $S$.
    * $S = [1st_{best} \dots 1st_{worst}, 2nd_{best} \dots 2nd_{worst}, \dots]$

### Step B: Normalization (The "Power of Two")
The tree math works on powers of two ($P$).
1.  Calculate $P = \text{nextPowerOfTwo}(N)$.
    * *Example:* If $N=12$, $P=16$.
2.  Calculate Byes $B = P - N$.
    * These Byes are assigned implicitly to the Top $B$ seeds.

### Step C: Round 1 Generation (The Injection)
We generate $P/2$ pairings.
* **Formula:** For $i$ from $1$ to $P/2$:
    * **Home:** Seed $i$
    * **Away:** Seed $P - i + 1$
* **Bye Check:** If the **Away** seed index is $> N$ (i.e., it represents a Ghost Team):
    * **Result:** Home Team wins immediately (Walkover).
    * **Winner Flow:** Home Team advances to *Winner Bracket (Round 2)*.
    * **Loser Flow:** A "Bye" (Ghost) is pushed to the *Loser Bracket*.

### Step D: Recursive Bracket Generation
For all subsequent rounds:
1.  **Winner Bracket:** Receives winners from previous round. Plays for Ranks $1 \dots \frac{P}{2}$.
2.  **Loser Bracket:** Receives losers from previous round. Plays for Ranks $(\frac{P}{2} + 1) \dots P$.
3.  **Pruning:** If a match in the Loser Bracket consists of `Bye vs Bye` (which happens when two Ghost teams "play" each other), the match is deleted.

---

## 4. Scenario Examples

### Scenario 1: 12 Teams (The "Fairness" Case)
*Configuration: 3 Groups of 4. $N=12, P=16$. Byes = 4.*

#### 1. Seeding Analysis
* **Seeds 1–3:** Group Winners.
* **Seeds 4–6:** Group 2nd Places.
* **Critical Split:** The **Best 2nd Place** becomes **Seed 4**. The others become Seeds 5 & 6.

#### 2. Round 1 (The "Round of 16")
| # | Pairing | Status | Outcome |
| :--- | :--- | :--- | :--- |
| M1 | **Seed 1** vs Seed 16 (Ghost) | **BYE** | Seed 1 $\rightarrow$ QF |
| M2 | **Seed 2** vs Seed 15 (Ghost) | **BYE** | Seed 2 $\rightarrow$ QF |
| M3 | **Seed 3** vs Seed 14 (Ghost) | **BYE** | Seed 3 $\rightarrow$ QF |
| M4 | **Seed 4** vs Seed 13 (Ghost) | **BYE** | Seed 4 $\rightarrow$ QF |
| M5 | Seed 5 vs Seed 12 | **Play** | Winner $\rightarrow$ QF, Loser $\rightarrow$ 9–16 |
| M6 | Seed 6 vs Seed 11 | **Play** | Winner $\rightarrow$ QF, Loser $\rightarrow$ 9–16 |
| M7 | Seed 7 vs Seed 10 | **Play** | Winner $\rightarrow$ QF, Loser $\rightarrow$ 9–16 |
| M8 | Seed 8 vs Seed 9 | **Play** | Winner $\rightarrow$ QF, Loser $\rightarrow$ 9–16 |

* *Observation:* Seed 4 (Best 2nd) is already in the Top 8. Seeds 5 & 6 must fight to get there.

#### 3. Round 2 (Quarterfinals & 9–16 Bracket)
* **Winner Bracket (QF):** 1 vs 8/9, 4 vs 5/12, etc. (Full 8-team bracket).
* **Loser Bracket (9–16):**
    * Contains 4 "Real Losers" (from M5, M6, M7, M8).
    * Contains 4 "Ghosts" (Losers from M1–M4).
    * *Result:* The 4 Real Losers get a "Bye" here (playing against Ghosts) and advance directly to play for **9th–12th**. The positions 13th–16th are effectively not played (or assigned to the Ghosts).

---

### Scenario 2: 10 Teams (The "Empty Bottom" Case)
*Configuration: $N=10, P=16$. Byes = 6.*

#### 1. Seeding Analysis
* **Seeds 1–6:** Automatically qualify for QF.
    * Includes: All Group Winners + All Group 2nds (assuming 3 groups).
    * *Or:* All Group Winners + Top 3 of 4 Group 2nds (if 4 groups).
* **Seeds 7–10:** Must play Round 1.

#### 2. Round 1
| Pairing | Status | Note |
| :--- | :--- | :--- |
| Seeds 1–6 vs Ghosts | **BYE** | Top 6 teams advance to QF instantly. |
| **Seed 7 vs Seed 10** | **Play** | Winner $\rightarrow$ QF. Loser $\rightarrow$ 9–16. |
| **Seed 8 vs Seed 9** | **Play** | Winner $\rightarrow$ QF. Loser $\rightarrow$ 9–16. |

#### 3. The Collapse of the Lower Bracket
* The Loser Bracket (ranks 9–16) receives:
    * 6 Ghosts (from the Byes).
    * 2 Real Teams (Loser 7/10, Loser 8/9).
* **Matches:** The 2 Real Teams play against Ghosts $\rightarrow$ They advance automatically.
* **Effect:** The entire 9–16 bracket collapses into a single match: **Place 9 vs Place 10**.
* *Verdict:* Ranks 11–16 are not assigned. This is mathematically correct for 10 teams.

---

## 5. Validation Checklist for Developers
1.  **Check Tiebreakers:** Does Seed 4 have better stats than Seed 5? (If not, the bracket is unfair).
2.  **Check Bye Propagation:** When Seed 1 advances, is a "Ghost" correctly pushed to the loser bracket? (If not, you will have a real team playing "null" in the lower tree).
3.  **Check Match Count:**
    * For 12 Teams: Should be ~18-20 matches in placement phase (depending on full resolution of bottom ranks).
    * For 8 Teams: Exactly 12 matches.