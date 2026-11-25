# Beachl-Turnier

Turnierverwaltung für die vereinsinternen Beachvolleyball-Turniere des BeachL. Sie ersetzt die Excel-Turnierpläne des Vereins.

> **Status:** Neuaufbau. Der aktuelle Meilenstein steht in [docs/architecture.md](docs/architecture.md#meilensteine-q44).

## Turniermodi (Version 1)

| Modus | Kurz |
|---|---|
| Jeder gegen jeden | Alle gegen alle, optional Platzierungsspiele 1–2, 3–4, … |
| Full Placement | Gruppen, dann kommen alle weiter und jeder Platz wird ausgespielt |
| Short Main | Gruppen, dann kommen die ersten 3 ins Hauptfeld, die übrigen spielen eigene Platzierungsfelder |

Das Schweizer System folgt in Version 1.1. Die fachlichen Regeln stehen in [docs/schedules/](docs/schedules/README.md).

## Einsatz

- Läuft im Browser auf einem Gerät der Turnierleitung, offline und ohne Server.
- Daten bleiben im Browser (IndexedDB) und lassen sich als JSON exportieren.
- Ein Aushang lässt sich auf einem zweiten Bildschirm oder Beamer anzeigen.

## Entwicklung

Voraussetzung: Node.js ≥ 24.

```bash
npm install
npm run dev            # App unter http://localhost:5173
npm run test           # Tests
```

Weitere Befehle und Regeln: [CLAUDE.md](CLAUDE.md), [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Tech-Stack

TypeScript, React 19, Vite, Tailwind CSS 4, Zustand, Vitest, fast-check. Deployt wird per Docker auf Railway.
