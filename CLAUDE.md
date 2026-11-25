# CLAUDE.md – Beachl-Turnier

Turnierverwaltung für die vereinsinternen Beachvolleyball-Turniere des BeachL. Die App wird gerade **von Grund auf neu entwickelt**. Die alte Codebase liegt auf dem Branch `archive/refactor-all-old` und dient nur als Nachschlagewerk.

## Maßgebliche Dokumente

| Dokument | Inhalt |
|---|---|
| `docs/schedules/README.md` | fachliche Anforderungen aller Modi und allgemeine Regeln. **Fachliche Quelle der Wahrheit.** |
| `docs/schedules/*.md` | Details je Modus |
| `docs/architecture.md` | Architektur, Stack, Teststrategie, Meilensteine (Q38–Q44) |
| `docs/glossary.md` | Zuordnung der Fachbegriffe zu Code-Bezeichnern |
| `CODING_STANDARDS.md` | Code-Regeln |

Verweise wie „Q19“ beziehen sich auf die Entscheidungen aus dem Grilling, die in den Dokumenten stehen. Bei fachlichen Fragen zuerst `docs/schedules` lesen. Fehlt dort etwas, sind die lokalen Vereinspläne in `docs/Aktuelle Turnierpläne/` maßgeblich. Sie sind nicht im Repo; mit `npm run plans:export` werden sie nach `.local/plans-csv/` exportiert. Fachliche Entscheidungen werden mit dem Nutzer geklärt (Skill `grill-me`), nicht angenommen.

## Aufbau

```
packages/domain   Fachlogik: reines TypeScript, ohne React und ohne Browser-APIs
apps/web          React-App (Vite, Tailwind), nutzt nur die öffentliche API von @beachl/domain
scripts/          Hilfsskripte (z. B. Export der Vereinspläne)
docs/             Anforderungen, Architektur, Glossar
```

## Befehle

```bash
npm run dev            # Web-App starten
npm run typecheck      # Typprüfung aller Workspaces
npm run lint           # ESLint inkl. 300-Zeilen-Regel
npm run format         # Prettier
npm run test           # Vitest (Watch)
npm run test:coverage  # Tests mit Abdeckung (Fachlogik >= 90 %)
npm run build          # Produktions-Build der Web-App
npm run plans:export   # Vereinspläne lokal als CSV exportieren (LibreOffice nötig)
```

Vor jedem Commit müssen `typecheck`, `lint`, `format:check` und `test:coverage` grün sein. Das prüft auch die CI.

## Arbeitsweise

- **Tests zuerst**, abgeleitet aus `docs/schedules`. Die Teststrategie steht in `docs/architecture.md`.
- Fachliche Regeln im Code verweisen auf ihre Quelle, zum Beispiel `// Q35, groups-split-bracket.md`.
- Bezeichner im Code sind englisch, nach `docs/glossary.md`; die Oberfläche ist deutsch.
- Der Nutzer ist rot-grün-farbenblind. Farben deshalb aus Blau, Orange und Violett wählen, Sieger und Verlierer nie nur über die Farbe unterscheiden.
- Jeder Meilenstein endet mit grüner CI sowie Commit und Push auf `refactor-all`. Nach M3 anhalten, damit der Nutzer die Freigabe-Dateien prüft.
