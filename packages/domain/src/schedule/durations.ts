import type { SetFormat } from '../model/types';

/**
 * Geschätzte Spieldauer inklusive Feldwechsel in Minuten (Q50; README.md „Felder und Zeitplan“).
 * Aus den Plänen: 1 Satz bis 21 = 25, 2 Sätze bis 15 = 30, 2 Gewinnsätze bis 15 = 50.
 * Die übrigen Werte sind abgeleitet. Die Turnierleitung kann sie je Bereich überschreiben.
 */
const DURATIONS: Readonly<Record<SetFormat['kind'], Readonly<Record<15 | 21, number>>>> = {
  singleSet: { 15: 20, 21: 25 },
  twoSets: { 15: 30, 21: 40 },
  bestOfThree: { 15: 50, 21: 60 },
};

export function defaultMatchDuration(format: SetFormat): number {
  return DURATIONS[format.kind][format.pointsPerSet];
}
