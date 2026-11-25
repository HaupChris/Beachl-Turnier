# Schedule Test Cases - Dokumentation

Dieses Verzeichnis enthält Test Cases für die Spielplan-Generierung. Jede JSON-Datei beschreibt eine spezifische Turnierkonfiguration und die erwarteten Paarungen.

## Verzeichnisstruktur

```
schedule-cases/
├── README.md                           # Diese Datei
├── round-robin-4-teams.json           # Round Robin Beispiel
├── swiss-6-teams.json                 # Swiss System Beispiel
├── group-phase-16-teams.json          # Gruppenphase Beispiel
├── knockout-8-teams.json              # Knockout Beispiel
├── beachl-all-placements-16-teams.json # BeachL All-Placements
└── beachl-short-main-16-teams.json    # BeachL Short Main
```

## Allgemeine Struktur

Jede Test-Case-Datei hat folgende Grundstruktur:

```json
{
  "description": "Beschreibung des Test Cases",
  "config": {
    "system": "tournament-system",
    "teamCount": 8,
    "numberOfCourts": 4,
    ...
  },
  "expectedMatches": [...],
  ...
}
```

## Felder-Erklärung

### `description`
- **Typ:** String
- **Beschreibung:** Kurze Beschreibung des Test Cases
- **Beispiel:** `"Round Robin mit 4 Teams"`

### `config`
Turnierkonfiguration mit folgenden Pflichtfeldern:

#### `system`
- **Typ:** String
- **Mögliche Werte:**
  - `"round-robin"` - Jeder gegen Jeden
  - `"swiss"` - Swiss System
  - `"group-phase"` - Gruppenphase (SSVB)
  - `"knockout"` - K.O.-System
  - `"beachl-all-placements"` - BeachL mit vollem Platzierungsbaum
  - `"beachl-short-main"` - BeachL mit kurzer Hauptrunde

#### `teamCount`
- **Typ:** Number
- **Beschreibung:** Anzahl der Teams im Turnier
- **Beispiel:** `16`

#### `numberOfCourts`
- **Typ:** Number
- **Beschreibung:** Anzahl der verfügbaren Spielfelder
- **Beispiel:** `4`

#### Weitere optionale Felder je nach System:

- **`numberOfRounds`** (Swiss System): Anzahl der Runden
- **`groupPhaseConfig`** (Gruppenphase): Konfiguration der Gruppen
  ```json
  "groupPhaseConfig": {
    "numberOfGroups": 4,
    "teamsPerGroup": 4,
    "seeding": "snake"
  }
  ```

### `expectedMatches`
Array von Match-Objekten mit erwarteten Paarungen.

#### Match-Objekt Felder:

##### `round`
- **Typ:** Number
- **Beschreibung:** Rundennummer (beginnt bei 1)
- **Beispiel:** `1`, `2`, `3`
- **Wichtig:**
  - Bei Round-Robin: Alle Teams spielen einmal pro Runde
  - Bei Gruppenphase: Round-Robin innerhalb jeder Gruppe
  - Bei Swiss: Paarungen ändern sich basierend auf Ergebnissen

##### `matchNumber`
- **Typ:** Number
- **Beschreibung:** Fortlaufende Match-Nummer (beginnt bei 1)
- **Beispiel:** `1`, `2`, `3`, ...
- **Wichtig:** Matches sind sequenziell nummeriert über das gesamte Turnier

##### `teamA` / `teamB`
- **Typ:** Number
- **Beschreibung:** Seed-Position der Teams (1 = bestes gesetztes Team)
- **Beispiel:** `1`, `2`, `3`, ...
- **Wichtig:** Referenziert die Setzposition, nicht Team-IDs

##### `court`
- **Typ:** Number oder null
- **Beschreibung:** Platz-Nummer (1 bis numberOfCourts)
- **Beispiel:** `1`, `2`, `3`, `4`, `null`
- **Wichtig:**
  - `null` bedeutet kein Platz zugewiesen (Match wartet)
  - Plätze werden zyklisch vergeben (1, 2, 3, 4, 1, 2, ...)

##### `groupName` (nur Gruppenphase)
- **Typ:** String
- **Beschreibung:** Name der Gruppe
- **Beispiel:** `"Gruppe A"`, `"Gruppe B"`

##### `knockoutRound` (nur Knockout)
- **Typ:** String
- **Mögliche Werte:**
  - `"quarterfinal"` - Viertelfinale
  - `"semifinal"` - Halbfinale
  - `"third-place"` - Spiel um Platz 3
  - `"final"` - Finale
  - `"placement-round-1"`, `"placement-round-2"`, etc. - Platzierungsrunden

##### `matchId` (nur Knockout)
- **Typ:** String
- **Beschreibung:** Eindeutige ID für das Match (für Abhängigkeiten)
- **Beispiel:** `"qf1"`, `"sf1"`, `"final"`

##### `teamASource` / `teamBSource` (nur Knockout)
- **Typ:** Objekt
- **Beschreibung:** Quelle des Teams (Gewinner/Verlierer eines vorherigen Matches)
- **Struktur:**
  ```json
  {
    "matchId": "qf1",
    "result": "winner"  // oder "loser"
  }
  ```

##### `placementInterval` (nur Platzierungsbaum)
- **Typ:** Objekt
- **Beschreibung:** Platzierungsintervall, um das gespielt wird
- **Struktur:**
  ```json
  {
    "start": 1,
    "end": 16
  }
  ```

##### `winnerInterval` / `loserInterval` (nur Platzierungsbaum)
- **Typ:** Objekt
- **Beschreibung:** Intervall, in das Gewinner/Verlierer kommen
- **Struktur:** Wie `placementInterval`

## Besonderheiten verschiedener Systeme

### Round-Robin
- Jedes Team spielt gegen jedes andere Team genau einmal
- Anzahl Matches: `n * (n-1) / 2` (n = Anzahl Teams)
- Anzahl Runden: `n - 1` bei gerader Teamzahl, `n` bei ungerader
- Bei ungerader Teamzahl: Ein Team hat pro Runde ein "Freilos"

### Swiss System
- Erste Runde: Paarungen basierend auf Setzung
- Folgerunden: Paarungen basierend auf Punkten/Ergebnissen
- **Wichtig:** Nur Runde 1 kann exakt vorhergesagt werden
- Für Runden 2+ können nur die erwarteten Paarungen bei bestimmten Ergebnissen angegeben werden

### Gruppenphase
- Teams werden in Gruppen eingeteilt (Snake-Draft oder Random)
- Snake-Draft Beispiel (16 Teams, 4 Gruppen):
  - Gruppe A: 1, 8, 9, 16
  - Gruppe B: 2, 7, 10, 15
  - Gruppe C: 3, 6, 11, 14
  - Gruppe D: 4, 5, 12, 13
- Innerhalb jeder Gruppe: Round-Robin
- Matches werden zwischen Gruppen verzahnt (interleaved)

### Knockout
- Elimination nach jedem Spiel
- Verwendet `teamASource`/`teamBSource` für Abhängigkeiten
- Wichtig: `matchId` muss eindeutig sein und in Quellen referenziert werden

### BeachL All-Placements
- Mehrstufiges Turnier:
  1. Gruppenphase (Round-Robin in Gruppen)
  2. Platzierungsbaum (alle Teams spielen um finale Platzierung)
- Platzierungsbaum teilt Teams sukzessive in Intervalle

### BeachL Short Main
- Mehrstufiges Turnier:
  1. Gruppenphase (Round-Robin in Gruppen)
  2. Kurze Hauptrunde mit mehreren Brackets:
     - Top-Bracket (Plätze 1-4)
     - Placement 5-8 (mit Qualifikation)
     - Placement 9-12
     - Placement 13-16

## Verwendung der Test Cases

Die Test Cases werden von automatisierten Tests geladen und überprüft:

1. Turnier wird mit der `config` erstellt
2. Spielplan wird generiert
3. Generierte Matches werden mit `expectedMatches` verglichen
4. Test schlägt fehl, wenn Abweichungen gefunden werden

## Neue Test Cases erstellen

1. Kopiere eine bestehende Datei als Vorlage
2. Passe `description` und `config` an
3. Fülle `expectedMatches` mit den erwarteten Paarungen
4. Speichere die Datei mit aussagekräftigem Namen
5. Der Test-Runner lädt automatisch alle JSON-Dateien in diesem Verzeichnis

## Tipps

- **Round-Nummern:** Beginnen immer bei 1
- **Match-Nummern:** Fortlaufend über gesamtes Turnier
- **Team-Nummern:** Seed-Positionen (1 = bestes Team)
- **Court-Nummern:** 1 bis numberOfCourts, oder `null` wenn kein Platz zugewiesen
- **Vollständigkeit:** Nicht alle Matches müssen angegeben werden - der Test kann auch Teilmengen prüfen
- **Reihenfolge:** Matches sollten in der erwarteten Reihenfolge angegeben werden

## Beispiel: Vollständiger Test Case

```json
{
  "description": "Round Robin mit 4 Teams auf 2 Plätzen",
  "config": {
    "system": "round-robin",
    "teamCount": 4,
    "numberOfCourts": 2
  },
  "expectedMatches": [
    {
      "round": 1,
      "matchNumber": 1,
      "teamA": 1,
      "teamB": 4,
      "court": 1
    },
    {
      "round": 1,
      "matchNumber": 2,
      "teamA": 2,
      "teamB": 3,
      "court": 2
    },
    {
      "round": 2,
      "matchNumber": 3,
      "teamA": 1,
      "teamB": 3,
      "court": 1
    },
    {
      "round": 2,
      "matchNumber": 4,
      "teamA": 4,
      "teamB": 2,
      "court": 2
    },
    {
      "round": 3,
      "matchNumber": 5,
      "teamA": 1,
      "teamB": 2,
      "court": 1
    },
    {
      "round": 3,
      "matchNumber": 6,
      "teamA": 3,
      "teamB": 4,
      "court": 2
    }
  ]
}
```