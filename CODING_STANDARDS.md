# Coding Standards für Beachl-Turnier

Alle Regeln außer der Konvention für Verweise werden durch Typprüfung, ESLint, Prettier oder CI durchgesetzt (Q43).

## 300-Zeilen-Regel

Keine TypeScript-Datei darf mehr als **300 Zeilen** Code enthalten, Leerzeilen und Kommentare nicht mitgezählt. Die ESLint-Regel `max-lines` in `eslint.config.js` prüft das. Wird eine Datei zu lang, wird sie nach fachlicher Verantwortung aufgeteilt, nicht mechanisch.

## TypeScript

- Es gilt der strengste Modus (`tsconfig.base.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` und weitere.
- `any` ist verboten. Für unbekannte Daten wird `unknown` verwendet und danach geprüft.
- Zustände werden als Discriminated Unions modelliert statt mit optionalen Feldern, zum Beispiel Platzhalter als `{ kind: 'winnerOf', matchId }`.

## Fachlogik (`packages/domain`)

- Nur reine Funktionen, ohne Seiteneffekte.
- Keine Importe von React, Zustand, IndexedDB oder anderen Browser-APIs. Das prüfen ESLint und `lib: ["ES2023"]` ohne DOM-Typen.
- Die Web-App greift nur über `packages/domain/src/index.ts` zu.
- Jede fachliche Regel verweist auf ihre Quelle, zum Beispiel `// Q35, groups-split-bracket.md`.

## Benennung

Bezeichner sind englisch, nach [docs/glossary.md](docs/glossary.md). Texte in der Oberfläche, Fehlermeldungen für Nutzer und Testbeschreibungen sind deutsch.

## Tests

- Tests werden zuerst geschrieben und aus `docs/schedules` abgeleitet.
- Ablage: `packages/domain/test/**/*.test.ts`.
- Die Testabdeckung der Fachlogik muss mindestens **90 %** betragen (`vitest.config.ts`).
- Teststrategie und Testarten sind in [docs/architecture.md](docs/architecture.md) beschrieben.

## Formatierung

Prettier mit der Konfiguration aus `.prettierrc.json`. Markdown und `docs/` sind davon ausgenommen.

## Vor dem Commit

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test:coverage
```
