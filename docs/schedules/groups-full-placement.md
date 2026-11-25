# Full Placement (`groups-full-placement`)

„Alle kommen weiter, alles ausspielen.“ Nach der [Gruppenphase](group-phase.md) spielen alle Teams in einem Platzierungsbaum weiter, bis jeder Platz feststeht.

Quellen: 8er (2×4), 12er (4×3), 16er (4×4), 24er (8×3). Entscheidungen: Q19, Q27. Allgemeine Regeln: [README.md](README.md).

## Baumregel

- In Runde 1 werden die Gruppenplätze nach den Tabellen unten gepaart.
- Ab Runde 2 gilt für jeden Teilbaum, dessen Spiele in der angegebenen Reihenfolge liegen:
  - Die **Sieger** der Spiele 2i−1 und 2i spielen gegeneinander, im oberen Platzbereich.
  - Die **Verlierer** derselben Spiele spielen gegeneinander, im unteren Platzbereich.
- Auf diese Weise halbiert sich jeder Platzbereich mit jeder Runde, bis nur noch Spiele um einzelne Plätze übrig sind.
- Jedes Team spielt ⌈log₂(Baumgröße)⌉ K.o.-Spiele, Teams mit Freilos entsprechend weniger.

**Baumgröße:** Gruppenzahl × aufgefüllte Gruppengröße. Eine 3er-Gruppe wird auf 4 Plätze aufgefüllt. Eine 5er-Gruppe hat 4 Plätze plus ein Vorschaltspiel (siehe unten). Freilose gelten wie in [README.md](README.md#freilose-in-ko-bäumen-q5-q9) beschrieben.

## Runde 1

### 4 Gruppen (16er-Plan, bestätigt durch den 12er-Plan)

Partnergruppen sind (G1, G4) und (G2, G3).

| Spiel | Paarung | Spiel | Paarung |
|---|---|---|---|
| 1 | 1.G1 – 4.G4 | 5 | 1.G3 – 4.G2 |
| 2 | 2.G3 – 3.G2 | 6 | 2.G1 – 3.G4 |
| 3 | 1.G4 – 4.G1 | 7 | 1.G2 – 4.G3 |
| 4 | 2.G2 – 3.G3 | 8 | 2.G4 – 3.G1 |

So geht es im 16er-Plan weiter:

| Runde | Spiele |
|---|---|
| Viertelfinale | S1–S2, S3–S4, S5–S6, S7–S8 |
| Platz 9–16 | V1–V2, V3–V4, V5–V6, V7–V8 |
| Halbfinale | S(S1–S2) gegen S(S3–S4), S(S5–S6) gegen S(S7–S8) |
| Platz 5–8, 9–12, 13–16 | nach derselben Regel |

Am Ende stehen die Spiele um Platz 1, 3, 5, …, 15.

### 2 Gruppen (8er-Plan, Q19)

| Spiel | Paarung |
|---|---|
| 1 | 1.G1 – 4.G2 |
| 2 | 3.G1 – 2.G2 |
| 3 | 2.G1 – 3.G2 |
| 4 | 4.G1 – 1.G2 |

### 8 Gruppen (24er-Plan)

Partnergruppen sind (G1, G8), (G2, G7), (G3, G6) und (G4, G5). Die Spiele 2./3. stammen aus dem 24er-Plan. Die 1.–4.-Spiele (nur bei 4er-Gruppen) sind nach dem Muster der 4 Gruppen ergänzt; der 24er-Plan hat nur 3er-Gruppen.

| Spiel | Paarung | Spiel | Paarung |
|---|---|---|---|
| 1 | 1.G1 – 4.G8 | 9 | 1.G3 – 4.G6 |
| 2 | 2.G5 – 3.G4 | 10 | 2.G7 – 3.G2 |
| 3 | 1.G8 – 4.G1 | 11 | 1.G6 – 4.G3 |
| 4 | 2.G2 – 3.G7 | 12 | 2.G4 – 3.G5 |
| 5 | 1.G5 – 4.G4 | 13 | 1.G7 – 4.G2 |
| 6 | 2.G1 – 3.G8 | 14 | 2.G3 – 3.G6 |
| 7 | 1.G4 – 4.G5 | 15 | 1.G2 – 4.G7 |
| 8 | 2.G6 – 3.G3 | 16 | 2.G8 – 3.G1 |

So geht es im 24er-Plan weiter:
- **Achtelfinale:** 1.G1 gegen S2, 1.G8 gegen S4, 1.G5 gegen S6, 1.G4 gegen S8, 1.G3 gegen S10, 1.G6 gegen S12, 1.G7 gegen S14, 1.G2 gegen S16.
- **Viertelfinale:** G1/G8 gegen G5/G4 und G3/G6 gegen G7/G2.
- Die Verlierer spielen Platz 17–24 bzw. 9–16, jeweils nach der Baumregel.

## 3er-Gruppen

Der 4. Gruppenplatz ist ein Freilos. Die Gruppenersten kommen kampflos in Runde 2, wo sie auf die Sieger der Spiele 2. gegen 3. treffen. Die Verlierer dieser Spiele spielen die hinteren Plätze aus.

So sieht das im 12er-Plan (4×3) aus:

| Runde | Spiele |
|---|---|
| Achtelfinale | 2.G3–3.G2, 2.G2–3.G3, 2.G1–3.G4, 2.G4–3.G1 |
| Viertelfinale | 1.G1 gegen S1, 1.G4 gegen S2, 1.G3 gegen S3, 1.G2 gegen S4 |
| Platz 9–12 | V1–V2, V3–V4, danach Spiel um Platz 9 und Platz 11 |
| Platz 5–8 | Verlierer der Viertelfinals nach Baumregel, danach Spiel um Platz 5 und Platz 7 |
| Halbfinale, Finale, Platz 3 | nach Baumregel |

## 5er-Gruppen: Vorschaltspiele (Q27)

Für 5er-Gruppen gibt es keinen Vereinsplan. Die folgende Konstruktion wurde festgelegt:

1. **Vorschaltspiele:** Der 4. einer Gruppe spielt gegen den 5. einer anderen Gruppe, über Kreuz. Der Sieger nimmt im normalen Baum den Platz „4.Gx“ ein.
2. **Gegnerwahl:** Die Gegner sind so gewählt, dass der Sieger in Runde 2 nicht auf ein Team aus der eigenen Gruppe trifft. Bei 2 Gruppen lässt sich das nicht ganz vermeiden.
3. **Verlierer** der Vorschaltspiele spielen die letzten Plätze unter sich aus.
4. **Fehlt ein 5.**, etwa bei gemischten Gruppengrößen: Der 4. kommt kampflos weiter (Freilos-Regel).

| Gruppen | Vorschaltspiele | wird zu | trifft in Runde 1 auf |
|---|---|---|---|
| 2 | 4.G2 – 5.G1 | „4.G2“ | 1.G1 |
| 2 | 4.G1 – 5.G2 | „4.G1“ | 1.G2 |
| 4 | 4.G4 – 5.G3 | „4.G4“ | 1.G1 |
| 4 | 4.G1 – 5.G2 | „4.G1“ | 1.G4 |
| 4 | 4.G2 – 5.G1 | „4.G2“ | 1.G3 |
| 4 | 4.G3 – 5.G4 | „4.G3“ | 1.G2 |

Platzierung der Verlierer:
- **2 Gruppen:** ein Spiel um Platz 9.
- **4 Gruppen:** Die Verlierer der Vorschaltspiele für „4.G4“ und „4.G1“ spielen gegeneinander, ebenso die für „4.G2“ und „4.G3“. Danach folgen die Spiele um Platz 17 und Platz 19.

8 Gruppen mit 5er-Gruppen gibt es nicht, weil höchstens 32 Teams erlaubt sind.

## Spielzahlen nach der Gruppenphase

| Teams | Aufteilung | K.o.-Spiele | Herleitung |
|---|---|---|---|
| 8 | 2×4 | 12 | 8er-Baum |
| 10 | 2×5 | 15 | 2 Vorschaltspiele + 12 (8er-Baum) + 1 (Platz 9) |
| 12 | 4×3 | 20 | 12er-Plan |
| 16 | 4×4 | 32 | 16er-Plan |
| 20 | 4×5 | 40 | 4 Vorschaltspiele + 32 (16er-Baum) + 4 (Platz 17–20) |
| 24 | 8×3 | 52 | 24er-Plan |
| 32 | 8×4 | 80 | 32er-Baum |
