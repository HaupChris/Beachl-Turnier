/**
 * Formatiert einen Platz für die Anzeige.
 *
 * Geteilte Plätze werden nur mit dem besten Platz angezeigt, also „19.“ statt „19–20“
 * (Q11, Q26; docs/schedules/README.md, Abschnitt „Geteilte Plätze“).
 */
export function formatPlace(bestPlace: number): string {
  if (!Number.isInteger(bestPlace) || bestPlace < 1) {
    throw new RangeError(`Ungültiger Platz: ${String(bestPlace)}`);
  }
  return `${String(bestPlace)}.`;
}
