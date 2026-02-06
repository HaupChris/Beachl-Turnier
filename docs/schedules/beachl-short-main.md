# Group → Short Main Round (System Specification)

This document describes the **Group Phase** plus **Short Main Round** scheduling logic. It serves as the master specification for the tournament generator, replacing legacy hard-coded solutions.

## 1. Core Philosophy: The "Short Main" Logic
The system is designed to reward group performance while maintaining permeability for mid-ranked teams.
- **Tier A (Group Winners):** High reward. They receive a **Bye** into the decisive round (Quarterfinals or Semifinals), skipping the first knockout round.
- **Tier B (Rank 2 & 3):** Access round. They must play a **Qualification Match** (2nd vs 3rd). Winners advance to face Tier A; losers drop to the mid-tier placement bracket.
- **Tier C (Rank 4+):** Low placement. They are isolated in a separate bottom bracket.

---

## 2. Phase 1: Group Phase Configuration
*Assumptions: Minimum 3 teams per group to support Tier A/B logic.*

| Total Teams | Groups | Configuration | Matches / Group | Total Group Matches |
| :--- | :--- | :--- | :--- | :--- |
| **7** | 2 | 1x4, 1x3 | 6 / 3 | 9 |
| **8** | 2 | 2x4 | 6 | 12 |
| **10** | 3 | 1x4, 2x3 | 6 / 3 | 12 |
| **12** | 3 | 3x4 | 6 | 18 |
| **14** | 4 | 2x4, 2x3 | 6 / 3 | 18 |
| **16** | 4 | 4x4 | 6 | 24 |
| **15** | 3 | 3x5 | 10 | 30 |
| **24** | 6 | 6x4 | 6 | 36 |
| **32** | 8 | 8x4 | 6 | 48 |

---

## 3. Detailed Algorithm Specification (Phase 2)

### Step A: Tier Extraction & Sorting
Teams are extracted from groups into three distinct lists (buckets).
1.  **Tier A (Top):** Collect all **Rank 1** teams.
2.  **Tier B (Mid):** Collect all **Rank 2** and **Rank 3** teams.
3.  **Tier C (Bottom):** Collect all remaining teams (**Rank 4+**).
    * *Handling Ghosts:* If a group has no Rank 4 (3-team group), insert a **Ghost (Bye)** into Tier C to maintain structural symmetry relative to the number of groups.
    * *Handling Overflow:* If a group has Rank 5 (5-team group), add them to Tier C.

### Step B: Bracket Template Selection
Select the correct bracket logic based on the **Number of Groups ($G$)**.

* **$G=2$ (e.g., 8 Teams):**
    * *Top Bracket:* 1-Round Quali (Tier B) $\rightarrow$ Semis (Tier A waits).
    * *Bottom Bracket:* Direct Final (Tier C).
* **$G=4$ (e.g., 16 Teams):**
    * *Top Bracket:* 1-Round Quali (Tier B) $\rightarrow$ Quarterfinals (Tier A waits).
    * *Bottom Bracket:* Semifinals $\rightarrow$ Finals.
* **$G \ge 5$ (e.g., 24, 32 Teams):**
    * *Top Bracket:* 8-Team Bracket. Filled by Tier A + Best of Tier B.
    * *Lower Brackets:* Remaining teams sorted into 9–16, 17–24, etc.

### Step C: Match Generation & Pruning
1.  **Map Teams to Slots:** Fill the selected template with the teams from Step A.
2.  **Auto-Advance (Byes):**
    * If a match is `Team vs Ghost`: Team wins immediately. Push to next round.
    * If a match is `Ghost vs Ghost`: Match is **Pruned** (does not exist).
3.  **Tier C Expansion (Special Case):**
    * If Tier C has more teams than the standard bottom bracket slots (e.g., 15 teams = 6 Tier C teams for a 4-slot bracket), expand the bottom bracket to the next power of two (8 slots) and inject Byes.

---

## 4. Scenario Examples

### Scenario 1: 8 Teams (Standard Case)
*Configuration: 2 Groups of 4. Tier A=2, Tier B=4, Tier C=2.*

* **Tier A:** 1A, 1B (Wait in Semis).
* **Tier B:** 2A, 2B, 3A, 3B (Play Quali).
* **Tier C:** 4A, 4B (Play for 7th).

**Match Flow:**
| # | Round | Pairing | Consequence |
| :--- | :--- | :--- | :--- |
| M1 | Quali | **2A vs 3B** | Winner $\rightarrow$ Semi 2 (vs 1B) |
| M2 | Quali | **2B vs 3A** | Winner $\rightarrow$ Semi 1 (vs 1A) |
| M3 | 7th Place | **4A vs 4B** | Winner 7th, Loser 8th |
| M4 | Semi 1 | **1A vs Winner M2** | Winner Final, Loser 3rd |
| M5 | Semi 2 | **1B vs Winner M1** | Winner Final, Loser 3rd |
| M6 | 5th Place | **Loser M1 vs Loser M2** | Decides 5th/6th |

---

### Scenario 2: 14 Teams (The "Ghost" Case)
*Configuration: 4 Groups (2x4, 2x3). $N=14$.*
* **Tier A:** 4 Teams (1A..1D).
* **Tier B:** 8 Teams (2A..3D).
* **Tier C:** 2 Teams (4A, 4B) + 2 Ghosts (4C, 4D are missing).

**Tier C Bracket (13–16 Place) Behavior:**
* *Standard Template:* Semifinals (4A-4B, 4C-4D) $\rightarrow$ Final.
* *Application:*
    * Semi 1: **4A vs 4B** (Played).
    * Semi 2: **Ghost vs Ghost** (Pruned/Skipped).
    * Final: **Winner(4A/4B) vs Winner(Semi 2)**.
* *Result:* Since Semi 2 produced no winner, the Final effectively becomes the match 4A vs 4B. The bracket collapses to a single match. 13th is awarded, 14th is awarded. 15/16 do not exist.

---

### Scenario 3: 15 Teams (The "Overflow" Case)
*Configuration: 3 Groups of 5. $N=15$.*
* **Tier A/B:** 9 Teams. (Standard 3-Group Top Bracket).
* **Tier C:** 6 Teams (4A, 4B, 4C, 5A, 5B, 5C).

**Tier C Bracket Behavior:**
* *Standard Template:* Usually 4 slots (for 3 groups).
* *Problem:* We have 6 teams.
* *Adjustment:* Expand to **8-slot Quarterfinal Bracket**.
    * Slots 1–6: Filled with teams.
    * Slots 7–8: Filled with **Byes**.
* *Round 1 (Bottom QF):*
    * QF1: 4A vs Bye (4A $\rightarrow$ Semis)
    * QF2: 5B vs 5C (Play)
    * QF3: 4B vs Bye (4B $\rightarrow$ Semis)
    * QF4: 5A vs 4C (Play)
* *Round 2:* Semifinals for Ranks 10–15.

---

## 5. Validation Checklist for Developers
1.  **Tier A Protection:** Ensure Group Winners (1A/1B in 2-group mode, 1A-1D in 4-group mode) **never** appear in Round 1 matches. They must start in Round 2.
2.  **Tier B Access:** Verify that a rank 3 team *can* theoretically win the tournament (Path: Quali Win $\rightarrow$ QF Win $\rightarrow$ Semi Win $\rightarrow$ Final).
3.  **Ghost Pruning:** In irregular team counts (e.g., 14), ensure the UI does not show empty brackets or "Bye vs Bye" matches.
4.  **Match Count Verification:**
    * 8 Teams: 6 group + 2 Quali + 1 Bottom + 2 Semi + 1 Final + 1 Bronze + 1 Place(5) = 14 total matches? (Check against manual calculation: 12 group matches + 7 bracket matches = 19? No, 8 teams 2 groups is 12 group matches. Bracket is 7 matches. Total 19.)