# Architektur der neuen App

Stand: 2026-11-25. Entscheidungen Q38–Q44 aus dem Grilling. Die fachlichen Anforderungen stehen in [schedules/](schedules/README.md).

## Einsatz (Q38)

- **Version 1:** Die App läuft auf **einem Gerät der Turnierleitung**, ohne Server und offline. Die Turnierleitung trägt alle Ergebnisse ein.
- **Später:** eine Live-Ansicht für Spieler und Zuschauer. Die Architektur ist darauf vorbereitet: Die Fachlogik ist eigenständig, und der Turnierstand ist eine Ereignisliste, die sich synchronisieren lässt.

## Technik-Stack (Q39)

| Bereich | Wahl |
|---|---|
| Sprache | TypeScript im strengsten Modus, kein `any` |
| Fachlogik | `packages/domain`: reine Funktionen ohne React und ohne Browser-APIs |
| UI | React 19 + Vite, Tailwind CSS 4 |
| Zustand | Ereignisliste + Reducer, Store mit Zustand |
| Speicherung | IndexedDB, Export und Import als JSON-Datei |
| Offline | PWA (Service Worker) |
| Turnierbäume | eigene Komponente (CSS Grid + SVG), keine Bibliothek. Fertige Bibliotheken können keine Platzierungsbäume und keine getrennten Felder darstellen. |
| Tests | Vitest, fast-check, später Playwright und Stryker |
| Deployment | Docker auf Railway |

## Fachlogik (Q40)

1. **Plan aus Platzhaltern.** `planTournament(config, teams)` erzeugt vor dem Start den vollständigen Plan: Gruppen, alle Spiele aller Phasen, Felder und Reihenfolge. Teams, die noch nicht feststehen, sind Platzhalter wie `2.G3`, `Sieger Spiel 5` oder `Verlierer Q1`. Beim Schweizer System erzeugt stattdessen `pairNextRound(state)` jede Runde einzeln.
2. **Ereignisse:** `ResultEntered`, `ResultCorrected`, `RockPaperScissorsDecided`, `TeamWithdrawn`, `WithdrawalReverted`, `RefereeChanged`, `RoundStarted` (Schweizer System).
3. **Abgeleiteter Zustand:** Aus Plan und Ereignissen berechnen reine Funktionen Tabellen, aufgelöste Platzhalter, Walkover, Endplatzierungen, Schiedsrichter und Zeiten. Rückgängig machen heißt, das letzte Ereignis zu entfernen.

### Teststrategie

Tests werden zuerst geschrieben und aus `docs/schedules` abgeleitet.

| Art | Inhalt | ab |
|---|---|---|
| Plan-Tests | erwartete Paarungen der Vereinspläne | M1 |
| Excel-Abgleich | liest die lokalen Pläne (CSV per `soffice`) und vergleicht sie mit `planTournament`. Läuft nur lokal, in CI übersprungen. Abweichungen sind nur erlaubt, wenn sie in `schedules/README.md` als bewusste Abweichung stehen. | M1 |
| Freigabe-Dateien | lesbarer Plan für jedes Format und jede Teamzahl von 6 bis 32, vom Nutzer einmal freigegeben; jede Änderung zeigt sich als Diff. Ablage: `packages/domain/test/approval/__approved__/`, neu erzeugen mit `npx vitest run packages/domain/test/approval -u` | M3 |
| Eigenschafts-Tests (fast-check) | zum Beispiel keine Selbstspiele, Plätze 1 bis N lückenlos, Freilose hinten, Short Main hat weniger Spiele als Full Placement | M1 |
| Referenzlösungen | Brute-Force-Lösungen für kleine Felder: optimale Schweizer Paarung, Rangfolge bei Gleichstand | M1 |
| Metamorphe Tests | Umbenennen, Umsortieren, Rückzug mit Rückgängig, Export und Import, Sieger tauschen | M1 |
| Zufällige Ereignisfolgen | Ergebnisse, Korrekturen, Rückzüge und Rückgängig in zufälliger Reihenfolge; danach müssen alle Invarianten gelten | M5 |
| Seed-Konsistenz | Bericht, kein harter Test (Q14) | M3 |
| Mutation Testing (Stryker) | nächtlich, nur Fachlogik | M7 |
| End-to-End (Playwright) | Hauptabläufe und Screenshot-Vergleich der Bäume | M7 |

## Umfang (Q41)

**Version 1** enthält:
- **Modi:** Jeder gegen jeden (± Platzierungsspiele), Full Placement und Short Main, für alle Teamzahlen aus [group-phase.md](schedules/group-phase.md).
- **Einrichtung:** Teams und Setzliste, Modus, Felder, Satzmodus, Zeiten.
- **Turnierbetrieb:**
  - Spielplan
  - Ergebnisse satzweise eintragen und korrigieren
  - Tabellen mit Schere-Stein-Papier
  - Baum und Endstand
  - Schiedsrichter
  - Absage eines Teams mit Rückgängig
- **Daten:** automatisches Speichern, JSON-Export und -Import, offline nutzbar.

**Version 1.1:** Schweizer System.

**Später:**
- Live-Ansicht
- SSVB
- Sonderformen
- Druckansicht

## Bedienoberfläche (Q42)

**Geräte:** Hauptgerät ist ein Laptop oder Tablet im Querformat. Die App ist auch auf dem Handy bedienbar, dort scrollen Bäume seitlich. Die Sprache ist Deutsch.

**Ansichten**

| Ansicht | Inhalt |
|---|---|
| Einrichtung | mit Vorschau von Gruppen und Spielzahl |
| Jetzt | Startseite im Turnier: pro Feld das laufende und das nächste Spiel mit Schiedsrichter, schnelle Ergebniseingabe, Hinweise |
| Spielplan | alle Spiele nach Feld und Zeit, filterbar |
| Gruppen | Tabellen und Spiele je Gruppe |
| Baum | ein Abschnitt pro Feld bzw. Platzbereich |
| Endstand | Platzierung 1 bis N |
| Aushang | Vollbild ohne Bedienung für zweiten Bildschirm oder Beamer, live über `BroadcastChannel` |

**Darstellung**
- Hoher Kontrast und helles Design, damit die Anzeige in der Sonne lesbar bleibt.
- Farben sind für Rot-Grün-Farbenblinde geeignet (Blau, Orange, Violett).
- Sieger und Verlierer werden nie nur über die Farbe unterschieden.
- Große Tippflächen.

## Code-Regeln und CI (Q43)

- **Struktur:** npm-Workspaces mit `packages/domain` und `apps/web`. Die Fachlogik darf weder React noch Browser-APIs importieren, eine Lint-Regel prüft das.
- **Sprache:** Bezeichner auf Englisch, Oberfläche auf Deutsch. Die Begriffe legt das Glossar fest: [glossary.md](glossary.md).
- **Regeln:** strikter TypeScript-Modus, ESLint + Prettier, höchstens 300 Zeilen pro Datei. Fachliche Regeln verweisen im Code auf `docs/schedules`, zum Beispiel `// Q35, groups-split-bracket.md`.
- **CI (GitHub Actions):** Typprüfung, Lint, Tests, Build und mindestens 90 % Testabdeckung der Fachlogik. Später nächtlich Stryker.

## Meilensteine (Q44)

| # | Meilenstein | Inhalt | Rolle des Nutzers |
|---|---|---|---|
| M0 | Gerüst | Workspaces, TS, Lint, Vitest, CI, Docker; Glossar; Projekt-Dokumente; Skript für Excel-Fixtures | – |
| M1 | Gruppenphase | Aufteilung, Schlange, Spielfolge, Tabelle, Absage in der Gruppe | – |
| M2 | Jeder gegen jeden | Rundenplan, Platzierungsspiele | – |
| M3 | Bäume | Platzhalter, Full Placement, Short Main, Freilose, Endplatzierung, Absage im K.o. | **Freigabe-Dateien prüfen** |
| M4 | Zeitplan | Felder, Zeiten, Schiedsrichter | Stichprobe |
| M5 | Ereignisse und Speicherung | Ereignisliste, Rückgängig, IndexedDB, Export und Import | – |
| M6 | Oberfläche | Einrichtung → Jetzt → Spielplan und Gruppen → Baum → Endstand → Aushang | ausprobieren |
| M7 | Fertigstellung | PWA, Railway, Playwright, Stryker | Testturnier |
| 1.1 | Schweizer System | Matching, offene Rundenzahl, Buchholz | – |

Jeder Meilenstein endet mit grüner CI, einem Commit und einem Push auf `refactor-all`.
