import type { MatchId, TeamId } from '../model/types';
import { planRoundRobin, type PlacementMatchPlan } from '../roundRobin/planRoundRobin';
import { scheduleRoundRobin } from '../schedule/groupSchedule';
import { scheduleRoundRobinPlacements } from '../schedule/knockoutSchedule';
import { computeGroupStandings } from '../standings/groupStandings';
import type { CompletedMatch } from '../standings/tally';
import { type EventState, replayEvents } from './replay';
import { checkResult, refereeFor, winnerOf } from './results';
import type { TournamentDocument } from './types';
import type { MatchView, TournamentView } from './view';

/** Turnierstand für „Jeder gegen jeden“ (Q29, Q34) aus Plan und Ereignissen. */
export function deriveRoundRobinTournament(doc: TournamentDocument): TournamentView {
  const { config } = doc;
  const plan = planRoundRobin(config.teams, { withPlacementMatches: false });
  const teamIds = [...config.teams].sort((a, b) => a.seed - b.seed).map((t) => t.id);
  const warnings = new Set<string>();

  const tableFor = (state: EventState, quiet: boolean) => {
    const sink = quiet ? new Set<string>() : warnings;
    const withdrawn = new Set(
      [...state.withdrawals].filter(([, p]) => p === 'preliminary').map(([id]) => id),
    );
    const summaries = new Map(
      plan.matches.map((m) => [
        m.id,
        checkResult(
          m.id,
          state.results.get(m.id),
          m.teamA,
          m.teamB,
          config.preliminary.setFormat,
          sink,
        ),
      ]),
    );
    const matches: CompletedMatch[] = plan.matches
      .filter((m) => summaries.get(m.id))
      .map((m) => ({ teamA: m.teamA, teamB: m.teamB, sets: state.results.get(m.id)?.sets ?? [] }));
    const table = computeGroupStandings({
      teamIds,
      matches,
      setFormat: config.preliminary.setFormat,
      withdrawn,
      rockPaperScissors: state.rockPaperScissors
        .filter((d) => d.groupIndex === null)
        .map((d) => d.order),
    });
    return { table, summaries, withdrawn };
  };

  const state = replayEvents(doc.events, (partial) => tableFor(partial, true).table.isComplete);
  const { table, summaries, withdrawn } = tableFor(state, false);
  const order = table.rows.map((r) => r.teamId);

  // Platzierungsspiele 1–2, 3–4, … unter den verbleibenden Teams (Q29).
  const placementPlans: PlacementMatchPlan[] = [];
  if (config.placementMatches) {
    for (let upper = 1; upper + 1 <= order.length; upper += 2) {
      placementPlans.push({ id: `P${String(upper)}`, upperRank: upper, lowerRank: upper + 1 });
    }
  }

  const rrSchedule = scheduleRoundRobin(plan, {
    courts: config.courts,
    start: config.startTime,
    matchDuration: config.preliminary.matchDuration,
    referees: config.preliminary.referees,
  });
  const placementSchedule = scheduleRoundRobinPlacements(placementPlans, {
    courts: config.courts,
    start: Math.max(config.startTime, ...rrSchedule.map((s) => s.end)),
    matchDuration: config.knockout.matchDuration,
    referees: config.knockout.referees,
  });
  const timeOf = new Map([...rrSchedule, ...placementSchedule].map((s) => [s.matchId, s]));
  const slotTime = (id: MatchId) => {
    const t = timeOf.get(id);
    if (!t) throw new Error(`Spiel ${id} fehlt im Zeitplan`);
    return {
      court: t.court,
      start: t.start,
      end: t.end,
      referee: refereeFor(id, t.referee, state.refereeOverrides),
    };
  };

  const rrMatches: MatchView[] = plan.matches.map((m) => {
    const summary = summaries.get(m.id);
    return {
      id: m.id,
      phase: 'roundRobin',
      teamA: m.teamA,
      teamB: m.teamB,
      sets: summary ? state.results.get(m.id)?.sets : undefined,
      summary,
      winner: winnerOf(summary, m.teamA, m.teamB),
      status:
        withdrawn.has(m.teamA) || withdrawn.has(m.teamB)
          ? 'cancelled'
          : summary
            ? 'completed'
            : 'ready',
      ...slotTime(m.id),
    };
  });

  const finalOrder = table.isFinal ? [...order] : undefined;
  let finished = table.isFinal;
  const placementMatches: MatchView[] = placementPlans.map((p) => {
    const teamA = finalOrder?.[p.upperRank - 1];
    const teamB = finalOrder?.[p.lowerRank - 1];
    const stored = state.results.get(p.id);
    const summary = checkResult(p.id, stored, teamA, teamB, config.knockout.setFormat, warnings);
    const walkoverWinner = walkoverFor(teamA, teamB, state);
    const winner = walkoverWinner ?? winnerOf(summary, teamA, teamB);
    if (finalOrder && winner && winner === teamB && teamA && teamB) {
      finalOrder[p.upperRank - 1] = teamB;
      finalOrder[p.lowerRank - 1] = teamA;
    }
    if (!winner) finished = false;
    return {
      id: p.id,
      phase: 'placement',
      placementRank: p.upperRank,
      teamA,
      teamB,
      sets: summary ? stored?.sets : undefined,
      summary,
      winner,
      status: walkoverWinner
        ? 'walkover'
        : winner
          ? 'completed'
          : teamA && teamB
            ? 'ready'
            : 'waiting',
      ...slotTime(p.id),
    };
  });

  return {
    config,
    matches: [...rrMatches, ...placementMatches],
    groups: [],
    knockoutPlan: undefined,
    table,
    withdrawals: [...state.withdrawals].map(([teamId, phase]) => ({ teamId, phase })),
    placements:
      finished && finalOrder ? finalOrder.map((teamId, i) => ({ place: i + 1, teamId })) : [],
    isFinished: finished,
    warnings: [...warnings],
  };
}

/** Rückzug nach der Vorrunde: Der Gegner gewinnt das Platzierungsspiel kampflos (Q28). */
function walkoverFor(teamA: TeamId | undefined, teamB: TeamId | undefined, state: EventState) {
  if (!teamA || !teamB) return undefined;
  const aOut = state.withdrawals.get(teamA) === 'knockout';
  const bOut = state.withdrawals.get(teamB) === 'knockout';
  if (aOut === bOut) return aOut ? teamA : undefined;
  return aOut ? teamB : teamA;
}
