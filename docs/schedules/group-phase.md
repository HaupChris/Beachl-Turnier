# Group Phase Schedule Reference (system: group-phase)

This document describes how **group-only** tournaments are scheduled for common team counts. It reflects current domain behavior.

## Assumptions
- Teams per group is set to **4** (default UI selection).
- Groups are created via **snake seeding** unless changed.
- Byes are distributed across the last groups.
- Group phase is round-robin inside each group.

## Schedule Summary (Teams Per Group = 4)
| Teams | Groups | Byes | Matches / Group | Total Group Matches |
| --- | --- | --- | --- | --- |
| 8 | 2 | 0 | 6 | 12 |
| 10 | 3 | 2 | 6 | 18 |
| 12 | 3 | 0 | 6 | 18 |
| 14 | 4 | 2 | 6 | 24 |
| 16 | 4 | 0 | 6 | 24 |
| 20 | 5 | 0 | 6 | 30 |
| 24 | 6 | 0 | 6 | 36 |
| 32 | 8 | 0 | 6 | 48 |

## Round Structure
- Each group plays a round-robin (n*(n-1)/2).
- Matches from different groups are interleaved for parallel court usage.
- Rounds are assigned based on court count: every `numberOfCourts` matches advance the round number.

## Validation Checklist
- Group count is between 2 and 8 but always an even number. 
- Teams per group is 3, 4, or 5.
- If byes exist, each group may have fewer actual team IDs, but the round-robin generator only creates matches between real teams.
