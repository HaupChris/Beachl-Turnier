# Turniermodi – fachliche Anforderungen

Stand: 2026-11-25. Ergebnis des Grillings (Fragen Q1–Q37, Q45–Q47). Verweise wie „Q19“ beziehen sich auf die jeweilige Entscheidung.

**Quelle:** Die Vereinspläne in `docs/Aktuelle Turnierpläne/` (xlsx) haben Vorrang (Q1). Wo ein Plan einer Regel hier widerspricht, ist das unter „Offene Punkte“ vermerkt. Das Schweizer System und die Freilos-Regeln sind in den Plänen nicht abgebildet und wurden eigens festgelegt.

## Modi

| Modus | Kennung | Datei | Priorität |
|---|---|---|---|
| Jeder gegen jeden (± Platzierungsspiele) | `round-robin` | [round-robin.md](round-robin.md) | Prio 1 |
| Gruppenphase (gemeinsame Grundlage) | – | [group-phase.md](group-phase.md) | Prio 1 |
| Full Placement („alle kommen weiter, alles ausspielen“) | `groups-full-placement` | [groups-full-placement.md](groups-full-placement.md) | Prio 1 |
| Short Main („3 kommen weiter“) | `groups-split-bracket` | [groups-split-bracket.md](groups-split-bracket.md) | Prio 1 |
| Schweizer System | `swiss` | [swiss.md](swiss.md) | Prio 1 |
| SSVB (Gruppen + K.o. nach SSVB) | `groups-ssvb-knockout` | [groups-ssvb-knockout.md](groups-ssvb-knockout.md) | zurückgestellt, Entwurf |

**Gestrichen:**
- „Nur Gruppenphase“ (`groups-only`) entfällt (Q12).
- Double Elimination ist nicht geplant.

**Zurückgestellt (Q16, Q17):**
- SSVB: offizielle Turniere, dafür gibt es eine eigene App.
- 12er mit 2×6 und Top 4.
- BeachL Meisterschaften (Gruppen mit Mini-Baum statt Jeder gegen jeden).
- Davis Cup.
- King & Queen.

### Zuordnung der Vereinspläne

| Plan | Modus |
|---|---|
| `6er/6er Jeder gegen Jeden mit Finale*.xlsx` | Jeder gegen jeden + Platzierungsspiele |
| `8er/8er Jeden gegen Jeden mit Finale.xlsx` | Jeder gegen jeden + Platzierungsspiele |
| `8er/8er_4erGruppe_1vs4_alles_ausspielen.xlsx` | Full Placement, 2×4 |
| `12er/12er_3er Gruppen_alle kommen weiter_alles ausspielen.xlsx` | Full Placement, 4×3 |
| `16er/16er_4er Gruppe_alle kommen weiter_alles ausspielen.xlsx` | Full Placement, 4×4 |
| `24er/24er_3er Gruppen_alle kommen weiter_alles ausspielen.xlsx` | Full Placement, 8×3 |
| `10er/10er_5er Gruppe_alles ausspielen.xlsx` | Short Main, 2×5 |
| `16er/16er_4er Gruppen_3 kommen weiter_alles ausspielen.xls` | Short Main, 4×4 |
| `20er/20er_5er Gruppen_3 kommen weiter_alles ausspielen.xlsx` | Short Main, 4×5 |
| `12er/12er_6er Gruppen_Top4 …`, `Spezialformen/*` | zurückgestellt |

Die Pläne lassen sich mit `soffice --headless --convert-to 'csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1'` lesen; dabei wird jedes Blatt als eigene CSV exportiert.

**Achtung, Gruppenbuchstaben:** In den Plänen entsprechen die Buchstaben nicht immer der Gruppenstärke. Im 16er-Plan steht Seed 2 zum Beispiel in Gruppe D. Diese Doku verwendet deshalb **G1…Gn = Gruppe mit Seed 1…n**. Die App benennt Gruppen nach Stärke (A = G1, B = G2, …; Q19).

---

## Allgemeine Regeln

### Satzmodus (Q22–Q24, Q33)

Das Turnier hat zwei Bereiche, für die der Modus jeweils eigens eingestellt wird:

| Bereich | Umfasst | Optionen |
|---|---|---|
| **Vorrunde** | Gruppenspiele, alle Spiele bei Jeder gegen jeden, das ganze Schweizer System | 1 Satz · 2 Sätze (ohne Entscheidungssatz, 1:1 möglich) · 2 Gewinnsätze |
| **K.o.-Runde** | Hauptfeld, alle Platzierungsspiele, Finals (auch die Platzierungsspiele nach Jeder gegen jeden) | 1 Satz · 2 Gewinnsätze |

- Jeder Satz geht bis **21 oder 15**, ein dritter Satz immer bis **15**.
- Ein Satz ist erst mit **2 Punkten Vorsprung** gewonnen, ohne Obergrenze (zum Beispiel 25:23).
- „2 Sätze“ gibt es in der K.o.-Runde nicht, damit kein 1:1 entsteht.
- Bei „2 Sätze“ zählen in der Tabelle die gewonnenen Sätze als Punkte. Ein 1:1 gibt beiden Teams einen Punkt, im Schweizer System je einen halben Sieg.

### Tabellenwertung in Gruppen und bei Jeder gegen jeden (Q6, Q7, Q34)

Grundlage ist die SSVB-Durchführungsbestimmung 2025, §2.3(12):

1. **Punkte:** Siege; bei „2 Sätze“ die gewonnenen Sätze.
2. **Satzdifferenz**
3. **Ballpunktdifferenz**
4. **Direkter Vergleich.** Aus den Spielen der gleichstehenden Teams wird eine Mini-Tabelle gebildet (Punkte → Satzdifferenz → Ballpunktdifferenz). Bei zwei Teams ist das ihr direktes Spiel. Trennt die Mini-Tabelle nur teilweise, wird der direkte Vergleich auf die verbleibenden gleichstehenden Teams erneut angewendet (Q46). Erst wenn er nichts mehr trennt, entscheidet Schritt 5.
5. **Schere-Stein-Papier** zwischen den Kapitänen, best-of-3. Vorher wird ein **Ehrenstein** gespielt: Beide zeigen einmal Stein, die Runde zählt nicht (Q32). Ein Unentschieden wird wiederholt. Die App erfasst nur den Sieger. Die Tabelle bleibt so lange offen, bis die Turnierleitung ihn eingetragen hat.

Eine einstellbare Tiebreaker-Reihenfolge gibt es nicht. Ein Losentscheid oder eine Entscheidung nach Setzplatz ist ausgeschlossen. Für das Schweizer System gilt eine eigene Wertung mit Buchholz, siehe [swiss.md](swiss.md).

### Freilose in K.o.-Bäumen (Q5, Q9)

- Freilose belegen immer die **schwächsten Setzplätze**. Die Schlangenverteilung läuft unverändert.
- **Team gegen Freilos:** Das Team kommt kampflos weiter (Walkover). Das Freilos wandert in den Verliererpfad. Das Spiel wird nicht angezeigt und belegt weder Feld noch Zeit.
- **Freilos gegen Freilos:** Das Spiel entfällt.
- Freilose landen immer auf den letzten Plätzen. Ihre Plätze werden nicht vergeben, die echten Plätze werden lückenlos von 1 bis N nummeriert.

### Geteilte Plätze (Q11, Q26)

Wird ein Platz nicht ausgespielt, teilen sich die Teams den Platz. Angezeigt wird nur der beste Platz: „19.“, nicht „19–20“.

### Absage eines Teams während des Turniers (Q28, Q31)

| Phase | Behandlung |
|---|---|
| Gruppenphase | **Alle** Spiele des Teams werden annulliert, auch die bereits gespielten. Die Gruppe wird gewertet, als hätte sie ein Team weniger. Der fehlende Gruppenplatz wird im Baum zum Freilos. |
| K.o.-Runde | Das nächste Spiel endet als Walkover für den Gegner, danach wird der Platz des Teams zum Freilos. Das Team bekommt den schlechtesten Platz des Teilbaums, in dem es ausgeschieden ist. |
| Schweizer System | Das Team wird ab der nächsten Runde nicht mehr gepaart, seine Ergebnisse bleiben stehen. Es steht am Ende der Tabelle. |

In allen Phasen gilt:
- Das Team wird als „zurückgezogen“ markiert.
- Die Aktion lässt sich rückgängig machen.
- Spiel- und Zeitplan rücken automatisch nach.

Fehlen Teams schon **vor** dem Start, wird einfach mit der kleineren Teamzahl geplant (Q2).

### Felder und Zeitplan (Q21)

- **Mindestens so viele Felder wie Gruppen:** Jede Gruppe hat ein festes Feld. Zusätzliche Felder gehen an die Gruppen mit den meisten Spielen.
- **Weniger Felder als Gruppen:** Gruppen teilen sich ein Feld und spielen abwechselnd.
- Die K.o.-Runde beginnt erst, wenn **alle** Gruppenspiele beendet sind.
- K.o.-Spiele haben eine feste Reihenfolge nach Runden. Ein Spiel kommt auf das nächste freie Feld, sobald beide Teams feststehen. Die Zeiten sind Schätzungen.

### Schiedsrichter (Q20, Q25)

- **Gruppe:** Es pfeift ein spielfreies Team derselben Gruppe, nach der festen Reihenfolge in [group-phase.md](group-phase.md).
- **K.o.-Runde:** Die App teilt automatisch ein. Bevorzugt wird der Verlierer eines kürzlich beendeten Spiels, sonst ein Team mit Freilos oder ein bereits ausgeschiedenes Team. Wer im nächsten Zeitslot selbst spielt, wird nicht eingeteilt. Die Turnierleitung kann jede Zuteilung ändern. Ob Schiedsrichter eingeteilt werden, ist einstellbar.

### Seed-Konsistenz (weiche Anforderung, Q14)

Gewinnt in jedem Spiel das besser gesetzte Team, sollte jedes Team auf seinem Setzplatz landen; bei geteilten Plätzen in der passenden Stufe. Das ist eine **weiche** Anforderung: Tests melden Abweichungen, schlagen aber nicht fehl. Die Pläne weichen bewusst davon ab, etwa um Wiederholungsspiele aus derselben Gruppe zu vermeiden.

---

## Bewusste Abweichungen von den Plänen

Offene Punkte gibt es keine. An diesen Stellen weicht die Doku bewusst von einzelnen Plänen ab:

1. **Viertelfinale im 16er-Short-Main-Plan (Q37):** Der Plan paart 1.G3 gegen S(2.G4–3.G1) und 1.G2 gegen S(2.G1–3.G4). Es gilt die Paarung aus Q19, wie im 12er-, 16er-Full-, 20er- und 24er-Plan: 1.G3 gegen S(2.G1–3.G4) und 1.G2 gegen S(2.G4–3.G1).
2. **Wer bei 4 Gruppen um Platz 9–12 spielt, Short Main (Q35) und Full Placement 4×3 (Q36):** Die Verlierer der Spiele 2. gegen 3. werden so gepaart, dass nie zwei Teams aus derselben Gruppe aufeinandertreffen: L(2.G1–3.G4) gegen L(2.G3–3.G2) und L(2.G4–3.G1) gegen L(2.G2–3.G3). So steht es im 16er- und 20er-Short-Plan. Der 12er-Plan paart dagegen L(2.G3–3.G2) gegen L(2.G2–3.G3).
3. **10er-Plan, Blatt „Zeitplan“ (Q26):** Die direkte Variante „Pl. 7 A4–B4, Pl. 9 A5–B5“ ist veraltet. Es gilt das Blatt „Hauptrunde“ mit Überkreuz-Spielen.
4. **Gruppenverteilung im 10er- und 20er-Plan (Q47):** Es gilt die Schlange.
   - Die 10er-Vorlage verteilt ab Reihe 3 nicht im Zickzack (A: 1, 4, 6, 8 · B: 2, 3, 5, 7, 9).
   - Im 20er-Plan sind Seed 17 und 18 vertauscht.

   Der 12er-, beide 16er- und der 24er-Plan folgen exakt der Schlange; der Excel-Abgleich prüft das.
