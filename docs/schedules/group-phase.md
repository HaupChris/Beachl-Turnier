# Gruppenphase (gemeinsam für Full Placement und Short Main)

Entscheidungen: Q2–Q5, Q18–Q21. Allgemeine Regeln (Tabellenwertung, Absage, Felder): [README.md](README.md).

Einen Modus „nur Gruppenphase“ gibt es nicht (Q12). Nach der Gruppenphase folgt immer ein K.o.-Teil: [Full Placement](groups-full-placement.md) oder [Short Main](groups-split-bracket.md).

## Gruppenzahl und Gruppengröße (Q18)

- **Gruppenzahl:** nur **2, 4 oder 8**. Ungerade Gruppenzahlen und leere Geistergruppen sind ausgeschlossen.
- **Gruppengröße:** 3–5 Teams. Die Größen unterscheiden sich höchstens um 1.
- **Auffüllen für den Baum:** Für den K.o.-Baum werden Gruppen mit Freilosen aufgefüllt, 3er-Gruppen auf 4 Plätze und 5er-Gruppen auf 8. Die Freilose belegen die schlechtesten Gruppenplätze. Bei Full Placement kommen dadurch die besten Gruppenplätze kampflos weiter. Details stehen in den jeweiligen Modus-Dateien.
- **2er-Gruppen** gibt es nur, wenn keine andere gültige Aufteilung existiert (Q3, Q4c): bei 11 und bei 21–23 Teams. Der fehlende Gruppendritte ist dann ein Freilos.
- Unter 8 Teams empfiehlt die App [Jeder gegen jeden](round-robin.md).

### Mögliche Teamzahlen

| Teams | Gruppen | Aufteilung |
|---|---|---|
| 6 | 2 | 3-3 |
| 7 | 2 | 4-3 |
| 8 | 2 | 4-4 |
| 9 | 2 | 5-4 |
| 10 | 2 | 5-5 |
| 11 | 4 | 3-3-3-2 (Ausnahme) |
| 12 | 4 | 3-3-3-3 |
| 13 | 4 | 4-3-3-3 |
| 14 | 4 | 4-4-3-3 |
| 15 | 4 | 4-4-4-3 |
| 16 | 4 | 4-4-4-4 |
| 17 | 4 | 5-4-4-4 |
| 18 | 4 | 5-5-4-4 |
| 19 | 4 | 5-5-5-4 |
| 20 | 4 | 5-5-5-5 |
| 21–23 | 8 | 3er- und 2er-Gruppen (Ausnahme) |
| 24 | 8 | 8×3 |
| 25–31 | 8 | 4er- und 3er-Gruppen |
| 32 | 8 | 8×4 |

Mehr als 32 Teams werden nicht unterstützt (8×5 gibt es nicht).

## Setzung: Schlange nach Gruppenstärke (Q5, Q19)

Die Teams werden in Schlangenlinie nach Setzliste verteilt. **G1** ist die Gruppe mit Seed 1, **G2** die mit Seed 2 usw. Die App benennt die Gruppen in dieser Reihenfolge (A = G1, B = G2, …).

Beispiel mit 16 Teams und 4 Gruppen:

| Rang | G1 (A) | G2 (B) | G3 (C) | G4 (D) |
|---|---|---|---|---|
| 1. | 1 | 2 | 3 | 4 |
| 2. | 8 | 7 | 6 | 5 |
| 3. | 9 | 10 | 11 | 12 |
| 4. | 16 | 15 | 14 | 13 |

Bei weniger Teams bleiben die schwächsten Setzplätze leer (Q5a). Bei 14 Teams fehlen zum Beispiel die Seeds 15 und 16: G2 und G1 haben dann nur 3 Teams.

## Spielreihenfolge in der Gruppe (Q20)

Die Reihenfolge ist fest, so wie in den Plänen. Die Zahlen sind die Plätze in der Gruppe nach Setzung. In Klammern steht das Team, das pfeift. In 3er- und 4er-Gruppen kommt das Spitzenspiel 1–2 zuletzt, in 5er-Gruppen als vorletztes Spiel.

| Gruppengröße | Reihenfolge |
|---|---|
| 3er | 2–3 (1), 1–3 (2), 1–2 (3) |
| 4er | 2–3 (1), 1–4 (2), 2–4 (1), 1–3 (4), 3–4 (2), 1–2 (3) |
| 5er | 5–3, 2–4, 1–5, 3–2, 4–1, 2–5, 3–1, 5–4, 1–2, 4–3 |

Bei 5er-Gruppen pfeift ein Team, das weder dieses noch das nächste Spiel bestreitet. Daraus ergibt sich für die ersten neun Spiele genau ein Team: 1, 3, 4, 5, 3, 4, 2, 3, 5. Das letzte Spiel 4–3 pfeift der **Verlierer von 1–2** (Q45); bis dahin zeigt die App „Verlierer 1–2“ an.

Ist eine Gruppe kleiner als die anderen, gilt die Reihenfolge für ihre tatsächliche Größe. Weil fehlende Teams immer die schwächsten Setzplätze belegen, bleiben die Positionen lückenlos. Eine 2er-Gruppe hat ein einziges Spiel ohne Schiedsrichter aus der Gruppe; dann pfeift gruppenübergreifend ein freies Team (Q49).

## Spielzahlen in der Gruppenphase

| Gruppengröße | Spiele pro Gruppe |
|---|---|
| 2 | 1 |
| 3 | 3 |
| 4 | 6 |
| 5 | 10 |

Beispiele: 10 Teams (5-5) haben 20 Gruppenspiele, 14 Teams (4-4-3-3) haben 18, 16 Teams haben 24, 24 Teams (8×3) haben 24.

## Felder

Siehe [README.md](README.md#felder-und-zeitplan-q21).
- **Mindestens so viele Felder wie Gruppen:** Jede Gruppe hat ein festes Feld.
- **Weniger Felder als Gruppen:** Gruppen teilen sich ein Feld abwechselnd.

Die K.o.-Runde beginnt erst nach dem letzten Gruppenspiel.
