# Coding Standards für Beachl-Turnier

## 300-Zeilen-Policy

Dieses Projekt folgt einer strikten **300-Zeilen-Policy** für alle Quellcode-Dateien.

### Regel

Keine TypeScript/JavaScript-Datei darf mehr als **300 Zeilen** Code enthalten (ohne Leerzeilen und Kommentare).

### Durchsetzung

Diese Regel wird automatisch durchgesetzt durch:

1. **ESLint**: Die `max-lines` Regel ist in `eslint.config.js` konfiguriert
2. **CI/CD Pipeline**: GitHub Actions führt automatisch den Linter bei jedem Push/PR aus
3. **Lokale Entwicklung**: Führe `npm run lint` vor jedem Commit aus

### Warum 300 Zeilen?

- **Bessere Wartbarkeit**: Kleinere Dateien sind einfacher zu verstehen und zu warten
- **Modularität**: Fördert die Trennung von Belangen (Separation of Concerns)
- **Testbarkeit**: Kleinere Module sind einfacher zu testen
- **Code Reviews**: Übersichtlichere Änderungen bei Pull Requests
- **Wiederverwendbarkeit**: Kleinere Komponenten können leichter wiederverwendet werden

### Best Practices für die Einhaltung

Wenn eine Datei die 300-Zeilen-Grenze erreicht, solltest du:

1. **Komponenten extrahieren**: UI-Komponenten in separate Dateien auslagern
2. **Utility-Funktionen auslagern**: Helper-Funktionen in `utils/` verschieben
3. **Business Logic trennen**: Logik von Präsentation trennen
4. **Custom Hooks erstellen**: Wiederverwendbare Logik in Hooks extrahieren
5. **Typen separieren**: Type-Definitionen in eigene Dateien auslagern

### Beispiel-Refactoring

Vorher (zu lange Datei):
```
src/pages/Configure.tsx (359 Zeilen)
```

Nachher (aufgeteilt):
```
src/pages/Configure.tsx (185 Zeilen)
src/components/BasicSettingsForm.tsx (170 Zeilen)
src/components/TeamsList.tsx (110 Zeilen)
```

### Ausnahmen

Derzeit gibt es **keine Ausnahmen** von dieser Regel. Alle Dateien müssen die 300-Zeilen-Grenze einhalten.

### Lokale Entwicklung

Vor dem Commit prüfen:
```bash
npm run lint
```

Build (inkludiert Linting):
```bash
npm run build
```

### CI/CD

Die GitHub Actions Pipeline führt automatisch folgende Checks aus:
- TypeScript Kompilierung
- ESLint (inkl. max-lines Regel)

Bei Verstößen schlägt der Build fehl und verhindert das Mergen.

## Dateistruktur

```
src/
├── components/      # Wiederverwendbare UI-Komponenten (< 300 Zeilen)
├── pages/          # Seiten-Komponenten (< 300 Zeilen)
├── context/        # React Context und State Management (< 300 Zeilen)
├── utils/          # Utility-Funktionen (< 300 Zeilen)
└── types/          # TypeScript Type-Definitionen
```

## Weitere Standards

- Verwende TypeScript für alle neuen Dateien
- Nutze funktionale Komponenten mit Hooks
- Benenne Komponenten-Dateien mit PascalCase
- Benenne Utility-Dateien mit camelCase
- Exportiere eine Hauptkomponente pro Datei
