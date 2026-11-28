import type { MatchId, SetFormat, TeamId } from '../model/types';
import { evaluateResult, type ResultSummary } from '../results/evaluateResult';
import type { ScheduledReferee } from '../schedule/types';
import type { StoredResult } from './replay';

/**
 * Prüft ein gespeichertes Ergebnis gegen die aktuellen Teams und den Satzmodus.
 * Veraltete oder ungültige Ergebnisse werden ignoriert und als Hinweis gemeldet.
 */
export function checkResult(
  matchId: MatchId,
  stored: StoredResult | undefined,
  teamA: TeamId | undefined,
  teamB: TeamId | undefined,
  format: SetFormat,
  warnings: Set<string>,
): ResultSummary | undefined {
  if (!stored || teamA === undefined || teamB === undefined) return undefined;
  if (stored.teams[0] !== teamA || stored.teams[1] !== teamB) {
    warnings.add(
      `Ergebnis von Spiel ${matchId} passt nicht mehr zu den Teams, weil ein früheres Spiel korrigiert wurde. Bitte neu eintragen.`,
    );
    return undefined;
  }
  const evaluation = evaluateResult(format, stored.sets);
  if (!evaluation.ok) {
    warnings.add(`Ergebnis von Spiel ${matchId} ist ungültig: ${evaluation.error}`);
    return undefined;
  }
  return evaluation.summary;
}

export function winnerOf(
  summary: ResultSummary | undefined,
  teamA: TeamId | undefined,
  teamB: TeamId | undefined,
): TeamId | undefined {
  if (!summary?.winner) return undefined;
  return summary.winner === 'a' ? teamA : teamB;
}

/** Schiedsrichter aus dem Zeitplan, überschrieben durch die Turnierleitung (Q25). */
export function refereeFor(
  matchId: MatchId,
  scheduled: ScheduledReferee | undefined,
  overrides: ReadonlyMap<MatchId, TeamId | null>,
): ScheduledReferee | undefined {
  if (!overrides.has(matchId)) return scheduled;
  const teamId = overrides.get(matchId);
  return teamId ? { kind: 'team', teamId } : undefined;
}
