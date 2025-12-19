# Beachl-Turnier

Eine webbasierte Turnierverwaltung für Beachvolleyball-Turniere.

## Features

- **8 Turniersysteme**: Round-Robin, Swiss, Playoff, Gruppenphase (SSVB), BeachL-All-Placements, BeachL-Short-Main-Round, Knockout und Placement-Tree
- **Flexible Teamanzahl**: Unterstützt 8-32 Teams mit konfigurierbaren Gruppen
- **Echtzeit-Tabellen**: Automatische Berechnung der Platzierungen mit konfigurierbaren Tiebreakern
- **Knockout-Visualisierung**: Grafische Darstellung der K.O.-Runden
- **Zeitplanung**: Schätzung der Turnierdauer mit Warnungen bei Zeitüberschreitung
- **Freilos-Unterstützung**: Handhabung von Byes bei ungeraden Teamanzahlen
- **Multi-Phasen-Turniere**: Verkettung von Vorrunde, Hauptrunde und Finale
- **Offline-fähig**: Vollständig client-seitig mit localStorage-Persistenz

## Turniersysteme

| System | Beschreibung | Empfohlen für |
|--------|--------------|---------------|
| Round-Robin | Jeder gegen jeden | Kleine Turniere (≤8 Teams) |
| Swiss | Paarung nach Stärke | Mittlere Turniere ohne Gruppen |
| Playoff | Platznachbarn (1v2, 3v4) | Finalrunden |
| Gruppenphase (SSVB) | Gruppen → flexibles K.O. | 8-32 Teams, SSVB-Format |
| BeachL-All-Placements | Gruppen → kompletter Platzierungsbaum | Alle Plätze (1..N) bestimmen |
| BeachL-Short-Main-Round | Gruppen → Multi-Bracket | Top-4, 5-8, 9-12, 13-16 Brackets |
| Knockout | Direktes K.O.-Bracket | Schnelle Entscheidung |
| Placement-Tree | Voller Platzierungsbaum | Alle Platzierungen ohne Gruppenphase |

## Tech-Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| State | React Context + useReducer |
| Routing | React Router 7 |
| Testing | Vitest |
| Persistenz | Browser localStorage |

## Schnellstart

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Build erstellen
npm run build

# Tests ausführen
npm test
```

## Projektstruktur

```
src/
├── pages/           # Hauptseiten (Home, Configure, Matches, Standings)
├── components/      # Wiederverwendbare UI-Komponenten
│   ├── matches/     # Match-bezogene Komponenten
│   └── standings/   # Tabellen-bezogene Komponenten
├── context/         # State Management (TournamentContext)
│   └── reducerActions/  # Reducer-Handler für verschiedene Actions
├── types/           # TypeScript Interfaces
├── utils/           # Business-Logik
│   ├── knockout/    # SSVB K.O.-System
│   ├── placementTree/   # Platzierungsbaum
│   ├── shortMainRound/  # Multi-Bracket Format
│   └── scheduling/      # Zeitplanung
└── hooks/           # Custom React Hooks
```

## Code-Standards

- **300-Zeilen-Limit**: Keine Datei darf mehr als 300 Zeilen haben (enforced via ESLint)
- **TypeScript**: Strict Mode aktiviert
- **Funktionale Komponenten**: Mit React Hooks

Siehe [CODING_STANDARDS.md](./CODING_STANDARDS.md) für Details.

## Dokumentation

- [Architektur](./docs/ARCHITECTURE.md) - Technische Architektur und Datenmodelle
- [Testing Plan](./docs/TESTING_PLAN.md) - Test-Framework und Coverage-Ziele

## Scripts

| Script | Beschreibung |
|--------|--------------|
| `npm run dev` | Entwicklungsserver starten |
| `npm run build` | Produktions-Build erstellen |
| `npm run lint` | ESLint ausführen |
| `npm test` | Tests im Watch-Modus |
| `npm run test:run` | Tests einmal ausführen |
| `npm run test:ci` | Tests mit Coverage |
| `npm run preview` | Build-Preview |

## Lizenz

Privates Projekt
