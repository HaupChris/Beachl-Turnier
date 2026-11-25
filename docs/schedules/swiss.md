# Schweizer System (`swiss`)

Dieser Modus ist nicht in den Vereinsplänen enthalten. Er braucht ein Werkzeug, das die Paarungen dynamisch berechnet (Q16). Entscheidungen: Q30, Q31. Allgemeine Regeln: [README.md](README.md).

## Ziel

Es sollen **beliebig viele Runden** spielbar sein, auch mehr als N − 1, und dabei möglichst **wenige Wiederholungsspiele** entstehen. Klassische Regelwerke (FIDE Dutch, Pétanque NRW, BTTV) verbieten Wiederholungen ganz und kommen deshalb nur mit wenigen Runden aus. Ab N − 1 Runden ist eine Wiederholung unvermeidbar.

## Ablauf

1. **Rundenzahl offen:** Die Turnierleitung startet jede weitere Runde selbst. Die App empfiehlt ⌈log₂ N⌉ + 2 Runden; das ist der Idealwert des BTTV.
2. **Runde 1** wird nach Setzliste gepaart, obere Hälfte gegen untere Hälfte. Bei 12 Teams: 1–7, 2–8, …, 6–12. Bei ungerader Zahl bekommt der schwächste Seed das Freilos.
3. **Jede weitere Runde** ist eine **optimale Paarung über alle Teams**. Die Rangfolge ist strikt, ein höheres Kriterium wird nie zugunsten eines niedrigeren verletzt:
   1. **Freilose fair verteilen:** Kein Team bekommt ein zweites Freilos, solange ein anderes noch keines hatte. Das Freilos geht an das schwächste berechtigte Team.
   2. **Wiederholungen vermeiden:** Wenn es nicht anders geht, wird die Paarung gewählt, die bisher am seltensten vorkam, und nie zweimal in direkt aufeinanderfolgenden Runden.
   3. **Gleiche Stärke:** möglichst gleich viele Siege (Punkte).
   4. **Feinsortierung:** innerhalb gleicher Siegzahl spielt die obere Hälfte gegen die untere.
4. **Die nächste Runde** wird gepaart, sobald alle Ergebnisse der laufenden Runde eingetragen sind.
5. Es gibt **kein Finale und keine Platzierungsspiele**. Die Tabelle nach der letzten Runde ist der Endstand.

Mit vielen Runden verschiebt sich die Paarung zwangsläufig von „gleich stark gegen gleich stark“ zu „möglichst oft gegen jemand Neues“. Das ist gewollt.

## Verfahren: gewichtetes Matching

Jede Runde wird als **Minimum-Cost-Perfect-Matching** berechnet, mit dem Blossom-Algorithmus von Edmonds:

- **Knoten** sind alle aktiven Teams. Bei ungerader Zahl kommt ein **Phantom-Team** dazu; wer gegen das Phantom gepaart wird, hat ein Freilos.
- **Kanten** sind alle möglichen Paarungen. Die Kosten sind ein **lexikografisches Tupel** aus den Kriterien 1–4 oben. Ein höheres Kriterium dominiert jedes niedrigere vollständig.
- Für Kriterium 2 zählt, wie oft das Paar schon gespielt hat. Eine Paarung aus der Vorrunde kostet zusätzlich so viel, dass sie nur gewählt wird, wenn es keine Alternative gibt.
- Für Felder bis 32 Teams dauert die Berechnung Millisekunden.

Referenzen:
- [kalafut/minipair](https://github.com/kalafut/minipair): lexikografische Kosten, Phantom-Knoten für das Freilos
- [bluebones.net: Swiss Pairing Algorithm](https://bluebones.net/2018/04/swiss-pairing-algorithm/)
- [Biró et al.: Designing chess pairing mechanisms](https://real.mtak.hu/80729/7/jXaio4T11ygd57-77-86.pdf)
- [tsh: Pairing-Systeme](https://tsh.poslfit.com/doc/pairing.html): Wiederholungen minimieren, nicht gegen den Gegner der Vorrunde
- [Pétanque NRW, Anlage 3](https://www.boule-nrw.de/regelwerke/pdf/04_Sportordnung_Petanque_Anlage3_Schweizer_System.pdf) und [BTTV](https://www.bttv.de/fileadmin/bttv/media/000/senioren/es/2025_BEMSenL/BEMSenL-SchweizerSystem.pdf): klassische Regelwerke

## Satzmodus

Das ganze Turnier gilt als **Vorrunde**, alle drei Optionen sind möglich. Bei „2 Sätze“ zählt jeder gewonnene Satz als halber Sieg (1:1 gibt beiden 0,5). Gepaart wird nach dieser Punktzahl.

## Tabelle (Q31)

1. **Siege** (Punkte)
2. **Buchholz:** Summe der Siege aller bisherigen Gegner
3. **Satzdifferenz**
4. **Ballpunktdifferenz**
5. **Direkter Vergleich:** alle Begegnungen der gleichstehenden Teams als Mini-Tabelle
6. **Schere-Stein-Papier** (siehe [README.md](README.md))

## Freilos

- Es zählt als **Sieg ohne Sätze und Ballpunkte**, damit Satz- und Ballpunktdifferenz nicht verfälscht werden.
- In der Buchholz-Wertung zählt es so viel wie die Siege des aktuell letzten Teams. So halten es auch Pétanque NRW und BTTV.

## Absage

Das Team wird ab der nächsten Runde nicht mehr gepaart. Bereits gespielte Ergebnisse bleiben stehen, weil die Buchholz-Werte der früheren Gegner daran hängen. Das Team steht als „zurückgezogen“ am Ende der Tabelle. Wird die Teamzahl ungerade, greift die Freilos-Regel.
