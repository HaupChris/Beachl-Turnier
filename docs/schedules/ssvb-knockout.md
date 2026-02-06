# Group → SSVB Knockout (System Specification)

This document describes the **Group Phase** plus **SSVB Knockout** scheduling logic.
The "SSVB" (Feed-In) logic is characterized by a **Single Elimination** structure where Group Winners receive a **Bye** into the decisive round, while Runners-up and 3rd places play an elimination "Intermediate Round".

## 1. Core Constraints
- **Even Group Counts Only:** The system forbids odd group counts (3, 5, etc.). Teams must be distributed into 2, 4, or 8 groups.
- **Ghost Groups/Byes:** If the number of teams does not perfectly fit the group count, empty slots are treated as Byes during the group generation or phase transition.
- **Elimination Mode:** Single Elimination (Loss = Exit).

---

## 2. Phase 1: Group Phase Configuration
*Note: Since odd group counts are forbidden, team distributions like "12 Teams = 3 Groups" are replaced by "4 Groups of 3".*

| Total Teams | Forced Group Count | Configuration | Matches / Group | Elimination Cut-off |
| :--- | :--- | :--- | :--- | :--- |
| **8** | 2 | 2x4 | 6 | Rank 4 |
| **10** | 2 | 2x5 | 10 | Rank 4, 5 |
| **12** | 4 | 4x3 | 3 | *None* |
| **14** | 4 | 2x4, 2x3 | 6 / 3 | Rank 4 (in 4-team grps) |
| **16** | 4 | 4x4 | 6 | Rank 4 |
| **20** | 4 | 4x5 | 10 | Rank 4, 5 |
| **24** | 8 | 8x3 | 3 | *None* |
| **32** | 8 | 8x4 | 6 | Rank 4 |

---

## 3. Phase 2: Knockout Logic (The Feed-In System)

The knockout structure is determined **solely by the number of groups**. The size of the groups (3, 4, or 5 teams) only determines how many teams are eliminated *before* the knockout starts.

### Logic by Group Size (Cut-Off Rules)
Regardless of the bracket size, the following rules apply to team progression:
- **Rank 1:** Advances directly to **Quarterfinals** (or Round of 16 in large brackets). **(Has a Bye)**.
- **Rank 2:** Advances to **Intermediate Round**.
- **Rank 3:** Advances to **Intermediate Round**.
- **Rank 4:**
    - *In 4-team groups:* **Eliminated**.
    - *In 5-team groups:* **Eliminated**.
    - *In 3-team groups:* Does not exist (N/A).
- **Rank 5:**
    - *In 5-team groups:* **Eliminated**.

---

### Bracket A: 2 Groups (8–10 Teams)
*Structure: 1st waits, 2nd plays 3rd.*

1.  **Intermediate Round (Quarterfinals):**
    * Match X: 2A vs 3B
    * Match Y: 2B vs 3A
    * *Note for 10 Teams (2x5):* Ranks 4A, 4B, 5A, 5B are eliminated.
    * *Note for 8 Teams (2x4):* Ranks 4A, 4B are eliminated.
2.  **Semifinals:**
    * 1A vs Winner Y
    * 1B vs Winner X
3.  **Finals:**
    * Gold Match (Winner Semi 1 vs Winner Semi 2)
    * Bronze Match (Loser Semi 1 vs Loser Semi 2)

---

### Bracket B: 4 Groups (12–20 Teams) - "Classic SSVB"
*Structure: 1st waits, 2nd plays 3rd (Cross-Over).*

1.  **Intermediate Round (Round of 12):**
    * Match I1: 2A vs 3D
    * Match I2: 2B vs 3C
    * Match I3: 2C vs 3B
    * Match I4: 2D vs 3A
2.  **Quarterfinals (Round of 8):**
    * QF1: 1A vs Winner I2
    * QF2: 1B vs Winner I1
    * QF3: 1C vs Winner I4
    * QF4: 1D vs Winner I3
3.  **Semis & Finals:** Standard Single Elimination.

#### Specific Team Count Behavior:
- **12 Teams (4x3):** No teams eliminated. All 12 teams play in the knockout (4 wait, 8 play intermediate).
- **16 Teams (4x4):** 4 teams eliminated (4A, 4B, 4C, 4D).
- **20 Teams (4x5):** 8 teams eliminated (All Rank 4s and Rank 5s).
- **14 Teams (2x4, 2x3):**
    - Groups with 4 teams: Rank 4 is eliminated.
    - Groups with 3 teams: No elimination.
    - *Bracket:* Fully populated (all Rank 2 and Rank 3 slots exist).

---

### Bracket C: 8 Groups (24–32 Teams)
*Structure: 1st waits, 2nd plays 3rd.*

1.  **Intermediate Round (Round of 24):**
    * 8 Matches.
    * Pairing Pattern: Snake/Cross (e.g., 2A vs 3H, 2B vs 3G, etc.).
2.  **Round of 16:**
    * 8 Group Winners (1A..1H) waiting.
    * 8 Winners from Intermediate Round.
3.  **Quarterfinals to Finals:** Standard Single Elimination.

#### Specific Team Count Behavior:
- **24 Teams (8x3):** No teams eliminated.
- **32 Teams (8x4):** 8 teams eliminated (All Rank 4s).

---

## 4. Implementation Details & Edge Cases

### Handling "Ghost Teams" (Byes)
In strict even-group configurations, we may have uneven team distributions (e.g., 14 Teams = Group A,B have 4, Group C,D have 3).
- **Group Phase:** Handled by standard generation (Snake Seeding).
- **Knockout Generation:**
    - The SSVB logic relies on Rank 2 and Rank 3 existing.
    - **Minimum 3 Teams Rule:** Since the system forces groupings like 4x3 for 12 teams, **Rank 3 always exists**.
    - **Therefore:** The Intermediate Round (2 vs 3) is **always fully populated**. There are no Byes in the knockout stage required for standard team counts (12, 14, 16, 20, 24, 32).

### Exception: < 3 Teams per Group
If a rare case allows a group of 2 teams (e.g., 10 teams split into 4 groups: 3, 3, 2, 2? *Unlikely configuration if 2x5 is preferred*).
- If a Rank 3 is missing (Group size < 3):
    - The opponent (Rank 2 from the cross-group) receives a **Walkover** in the Intermediate Round.

## 5. Validation Checklist
1.  **Check Elimination:**
    - 5-Team Group: Confirm Rank 4 AND 5 are Status `Eliminated` after group phase.
    - 3-Team Group: Confirm Rank 3 advances to Intermediate Round.
2.  **Check Waiting Teams:**
    - Confirm Group Winners (1A..1H) have NO match in the Intermediate Round.
3.  **Check Match Count (16 Teams):**
    - 4 Intermediate + 4 QF + 2 Semi + 1 Final + 1 Bronze = 12 Knockout Matches.
    - + 24 Group Matches = 36 Total.