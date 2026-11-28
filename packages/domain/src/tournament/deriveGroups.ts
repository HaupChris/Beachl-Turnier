import { planGroupPhase } from '../groups/planGroupPhase';
import { planFullPlacement } from '../knockout/fullPlacement';
import { resolveKnockout } from '../knockout/resolveKnockout';
import { planSplitBracket } from '../knockout/splitBracket';
import type { TeamId } from '../model/types';
import { scheduleGroupPhase } from '../schedule/groupSchedule';
import { scheduleKnockout } from '../schedule/knockoutSchedule';
import type { CompletedMatch } from '../standings/tally';
import { computeGroupStandings } from '../standings/groupStandings';
import { type EventState, replayEvents } from './replay';
import { checkResult, refereeFor, winnerOf } from './results';
import type { TournamentDocument } from './types';
import type { MatchView, TournamentView } from './view';

/** Turnierstand für Full Placement und Short Main aus Plan und Ereignissen (Q40). */
export function deriveGroupTournament(doc: TournamentDocument): TournamentView {
  const { config } = doc;
  const groupPlan = planGroupPhase(config.teams);
  const warnings = new Set<string>();

  const standingsFor = (state: EventState, quiet: boolean) => {
    const sink = quiet ? new Set<string>() : warnings;
    const withdrawn = new Set(
      [...state.withdrawals].filter(([, phase]) => phase === 'preliminary').map(([id]) => id),
    );
    const summaries = new Map(
      groupPlan.matches.map((m) => [
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
    const standings = groupPlan.groups.map((group) => {
      const matches: CompletedMatch[] = groupPlan.matches
        .filter((m) => m.groupIndex === group.index && summaries.get(m.id))
        .map((m) => ({
          teamA: m.teamA,
          teamB: m.teamB,
          sets: state.results.get(m.id)?.sets ?? [],
        }));
      return computeGroupStandings({
        teamIds: group.teamIds,
        matches,
        setFormat: config.preliminary.setFormat,
        withdrawn,
        rockPaperScissors: state.rockPaperScissors
          .filter((d) => d.groupIndex === group.index)
          .map((d) => d.order),
      });
    });
    return { standings, summaries, withdrawn };
  };

  const state = replayEvents(doc.events, (partial) =>
    standingsFor(partial, true).standings.every((s) => s.isComplete),
  );
  const { standings, summaries, withdrawn } = standingsFor(state, false);

  const groupSizes = groupPlan.groups.map(
    (g) => g.teamIds.filter((id) => !withdrawn.has(id)).length,
  );
  const plan =
    config.format === 'groups-full-placement'
      ? planFullPlacement({ groupSizes })
      : planSplitBracket({ groupSizes });
  const groupRanking = (groupIndex: number, rank: number): TeamId | undefined => {
    const s = standings[groupIndex];
    return s?.isFinal ? s.rows[rank - 1]?.teamId : undefined;
  };
  const knockoutWithdrawn = new Set(
    [...state.withdrawals].filter(([, phase]) => phase === 'knockout').map(([id]) => id),
  );

  // Sieger schrittweise auflösen: Erst wenn ein Spiel seine Teams kennt, zählt sein Ergebnis.
  const winners = new Map<string, TeamId>();
  let resolution = resolveKnockout(plan, { groupRanking, winners, withdrawn: knockoutWithdrawn });
  for (let changed = true; changed;) {
    changed = false;
    for (const m of resolution.matches) {
      if (winners.has(m.match.id) || m.walkover) continue;
      const summary = checkResult(
        m.match.id,
        state.results.get(m.match.id),
        m.teamA,
        m.teamB,
        config.knockout.setFormat,
        warnings,
      );
      const winner = winnerOf(summary, m.teamA, m.teamB);
      if (winner) {
        winners.set(m.match.id, winner);
        changed = true;
      }
    }
    if (changed)
      resolution = resolveKnockout(plan, { groupRanking, winners, withdrawn: knockoutWithdrawn });
  }

  const groupSchedule = scheduleGroupPhase(groupPlan, {
    courts: config.courts,
    start: config.startTime,
    matchDuration: config.preliminary.matchDuration,
    referees: config.preliminary.referees,
  });
  const knockoutStart = Math.max(config.startTime, ...groupSchedule.map((s) => s.end));
  const knockoutSchedule = scheduleKnockout(plan, {
    courts: config.courts,
    start: knockoutStart,
    matchDuration: config.knockout.matchDuration,
    referees: config.knockout.referees,
  });
  const timeOf = new Map([...groupSchedule, ...knockoutSchedule].map((s) => [s.matchId, s]));
  const slotTime = (id: string) => {
    const t = timeOf.get(id);
    if (!t) throw new Error(`Spiel ${id} fehlt im Zeitplan`);
    return {
      court: t.court,
      start: t.start,
      end: t.end,
      referee: refereeFor(id, t.referee, state.refereeOverrides),
    };
  };

  const groupMatches: MatchView[] = groupPlan.matches.map((m) => {
    const summary = summaries.get(m.id);
    const cancelled = withdrawn.has(m.teamA) || withdrawn.has(m.teamB);
    return {
      id: m.id,
      phase: 'group',
      groupIndex: m.groupIndex,
      teamA: m.teamA,
      teamB: m.teamB,
      sets: summary ? state.results.get(m.id)?.sets : undefined,
      summary,
      winner: winnerOf(summary, m.teamA, m.teamB),
      status: cancelled ? 'cancelled' : summary ? 'completed' : 'ready',
      ...slotTime(m.id),
    };
  });
  const knockoutMatches: MatchView[] = resolution.matches.map((m) => {
    const stored = state.results.get(m.match.id);
    const summary = m.walkover
      ? undefined
      : checkResult(m.match.id, stored, m.teamA, m.teamB, config.knockout.setFormat, new Set());
    return {
      id: m.match.id,
      phase: 'knockout',
      slotA: m.match.slotA,
      slotB: m.match.slotB,
      stage: m.match.stage,
      teamA: m.teamA,
      teamB: m.teamB,
      sets: summary ? stored?.sets : undefined,
      summary,
      winner: m.winner,
      status: m.walkover
        ? 'walkover'
        : m.winner
          ? 'completed'
          : m.teamA && m.teamB
            ? 'ready'
            : 'waiting',
      ...slotTime(m.match.id),
    };
  });

  return {
    config,
    matches: [...groupMatches, ...knockoutMatches],
    groups: groupPlan.groups.flatMap((group, i) => {
      const groupStandings = standings[i];
      return groupStandings ? [{ group, standings: groupStandings }] : [];
    }),
    knockoutPlan: plan,
    table: undefined,
    withdrawals: [...state.withdrawals].map(([teamId, phase]) => ({ teamId, phase })),
    placements: resolution.placements,
    isFinished: resolution.isComplete,
    warnings: [...warnings],
  };
}
