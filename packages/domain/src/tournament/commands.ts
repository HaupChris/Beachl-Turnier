import type { MatchId, SetScore, TeamId } from '../model/types';
import { evaluateResult } from '../results/evaluateResult';
import { deriveTournament, type Outcome } from './document';
import type { TournamentDocument, TournamentEvent } from './types';

/**
 * Befehle der Turnierleitung. Jeder Befehl prüft gegen den aktuellen Stand und hängt bei
 * Erfolg genau ein Ereignis an (Q40). Fehlermeldungen sind für die Oberfläche formuliert.
 */

const append = (doc: TournamentDocument, event: TournamentEvent): Outcome<TournamentDocument> => ({
  ok: true,
  value: { ...doc, events: [...doc.events, event] },
});
const fail = (error: string): Outcome<TournamentDocument> => ({ ok: false, error });

export function enterResult(
  doc: TournamentDocument,
  matchId: MatchId,
  sets: readonly SetScore[],
): Outcome<TournamentDocument> {
  const view = deriveTournament(doc);
  const match = view.matches.find((m) => m.id === matchId);
  if (!match) return fail(`Spiel ${matchId} gibt es nicht.`);
  if (match.status === 'cancelled')
    return fail('Das Spiel ist annulliert, weil ein Team zurückgezogen hat.');
  if (match.status === 'walkover') return fail('Das Spiel ist bereits kampflos entschieden.');
  if (match.teamA === undefined || match.teamB === undefined) {
    return fail('Die Teams dieses Spiels stehen noch nicht fest.');
  }
  const area = match.phase === 'group' || match.phase === 'roundRobin' ? 'preliminary' : 'knockout';
  const evaluation = evaluateResult(doc.config[area].setFormat, sets);
  if (!evaluation.ok) return fail(evaluation.error);
  return append(doc, {
    type: match.sets ? 'ResultCorrected' : 'ResultEntered',
    matchId,
    teams: [match.teamA, match.teamB],
    sets,
  });
}

export function decideRockPaperScissors(
  doc: TournamentDocument,
  groupIndex: number | null,
  order: readonly TeamId[],
): Outcome<TournamentDocument> {
  const view = deriveTournament(doc);
  const pending =
    groupIndex === null
      ? (view.table?.pendingRockPaperScissors ?? [])
      : (view.groups[groupIndex]?.standings.pendingRockPaperScissors ?? []);
  const sameSet = (tie: readonly TeamId[]) =>
    tie.length === order.length && tie.every((t) => order.includes(t));
  if (!pending.some(sameSet)) {
    return fail('Für diese Teams ist kein Schere-Stein-Papier offen.');
  }
  return append(doc, { type: 'RockPaperScissorsDecided', groupIndex, order });
}

export function withdrawTeam(doc: TournamentDocument, teamId: TeamId): Outcome<TournamentDocument> {
  if (!doc.config.teams.some((t) => t.id === teamId)) return fail('Dieses Team gibt es nicht.');
  const view = deriveTournament(doc);
  if (view.withdrawals.some((w) => w.teamId === teamId))
    return fail('Das Team hat bereits zurückgezogen.');
  if (view.isFinished) return fail('Das Turnier ist bereits beendet.');
  return append(doc, { type: 'TeamWithdrawn', teamId });
}

export function revertWithdrawal(
  doc: TournamentDocument,
  teamId: TeamId,
): Outcome<TournamentDocument> {
  const view = deriveTournament(doc);
  if (!view.withdrawals.some((w) => w.teamId === teamId))
    return fail('Das Team hat nicht zurückgezogen.');
  return append(doc, { type: 'WithdrawalReverted', teamId });
}

export function changeReferee(
  doc: TournamentDocument,
  matchId: MatchId,
  teamId: TeamId | null,
): Outcome<TournamentDocument> {
  const view = deriveTournament(doc);
  const match = view.matches.find((m) => m.id === matchId);
  if (!match) return fail(`Spiel ${matchId} gibt es nicht.`);
  if (teamId !== null) {
    if (!doc.config.teams.some((t) => t.id === teamId)) return fail('Dieses Team gibt es nicht.');
    if (teamId === match.teamA || teamId === match.teamB)
      return fail('Ein Team kann sein eigenes Spiel nicht pfeifen.');
  }
  return append(doc, { type: 'RefereeChanged', matchId, teamId });
}
