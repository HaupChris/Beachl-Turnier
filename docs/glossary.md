# Glossar: Fachbegriffe ↔ Code

Die Oberfläche ist deutsch, Bezeichner im Code sind englisch (Q43). Diese Tabelle legt die Zuordnung fest. Neue Fachbegriffe werden hier eingetragen, bevor sie im Code auftauchen.

## Turnier und Modi

| Deutsch (UI, Doku) | Code | Bemerkung |
|---|---|---|
| Turnier | `tournament` | |
| Modus | `format` | `round-robin`, `groups-full-placement`, `groups-split-bracket`, `swiss`, `groups-ssvb-knockout` |
| Jeder gegen jeden | `roundRobin` | |
| Full Placement („alle kommen weiter“) | `fullPlacement` | |
| Short Main („3 kommen weiter“) | `splitBracket` | |
| Schweizer System | `swiss` | |
| Turnierleitung | `organizer` | |
| Team | `team` | |
| Setzliste, Setzplatz | `seeding`, `seed` | Seed 1 = stärkstes Team |
| Teamzahl | `teamCount` | |

## Gruppenphase

| Deutsch | Code | Bemerkung |
|---|---|---|
| Gruppe | `group` | |
| G1…Gn (Gruppe nach Stärke) | `groupIndex` (0-basiert) | G1 = Gruppe mit Seed 1. Anzeige: A, B, C, … |
| Gruppenplatz, „2.G3“ | `groupRank` | „2.G3“ = Platz 2 in Gruppe G3 |
| Schlangenverteilung | `snakeSeeding` | |
| Freilos | `bye` | |
| Tabelle | `standings` | |
| Satzdifferenz | `setDifference` | |
| Ballpunktdifferenz | `pointDifference` | |
| Direkter Vergleich | `headToHead` | |
| Mini-Tabelle | `miniTable` | direkter Vergleich bei 3+ Teams |
| Schere-Stein-Papier | `rockPaperScissors` | |
| Ehrenstein | `honorStone` | Runde, die nicht zählt (Q32), nur Doku |
| Buchholz | `buchholz` | Schweizer System |

## K.o.-Runde und Platzierung

| Deutsch | Code | Bemerkung |
|---|---|---|
| K.o.-Runde | `knockoutStage` | |
| Baum | `bracket` | |
| Feld (Hauptfeld, unteres Feld) | `bracketSection` | Teilbaum bzw. Platzbereich, z. B. „Platz 9–12“ |
| Hauptfeld | `mainBracket` | |
| Platzierungsspiel | `placementMatch` | |
| Platzbereich „Platz 9–16“ | `placeRange` | |
| Quali | `qualification` | Short Main: 2. gegen 3. |
| Vorschaltspiel | `playIn` | Full Placement mit 5er-Gruppen (Q27) |
| Viertelfinale, Halbfinale, Finale | `quarterfinal`, `semifinal`, `final` | |
| Spiel um Platz 3 | `thirdPlaceMatch` | |
| Platzhalter („Sieger Spiel 5“) | `slotSource` | `winnerOf`, `loserOf`, `groupRank`, `seed` |
| Walkover (kampflos weiter) | `walkover` | |
| Endplatzierung | `finalPlacement` | |
| geteilter Platz | `sharedPlace` | |

## Spiele und Ergebnisse

| Deutsch | Code | Bemerkung |
|---|---|---|
| Spiel | `match` | |
| Spielnummer | `matchNumber` | |
| Satz | `set` | |
| Ballpunkte | `points` | |
| Satzmodus | `setFormat` | |
| 1 Satz / 2 Sätze / 2 Gewinnsätze | `singleSet` / `twoSets` / `bestOfThree` | |
| Vorrunde (Bereich) | `preliminaryStage` | |
| Ergebnis | `result` | |
| Sieger, Verlierer | `winner`, `loser` | |
| Schiedsrichter | `referee` | ein Team |
| Platz (Spielfeld) | `court` | „Feld“ in der UI |
| Runde | `round` | |

## Ereignisse (Q40)

| Deutsch | Code |
|---|---|
| Ergebnis eingetragen | `ResultEntered` |
| Ergebnis korrigiert | `ResultCorrected` |
| Schere-Stein-Papier entschieden | `RockPaperScissorsDecided` |
| Team zurückgezogen | `TeamWithdrawn` |
| Rückzug aufgehoben | `WithdrawalReverted` |
| Schiedsrichter geändert | `RefereeChanged` |
| Runde gestartet (Schweizer System) | `RoundStarted` |
