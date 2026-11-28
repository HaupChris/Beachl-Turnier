import type { GroupPhasePlan } from '../groups/planGroupPhase';
import type { RoundRobinPlan } from '../roundRobin/planRoundRobin';
import { scheduleSlots } from './slotScheduler';
import { assignTeamReferees } from './teamReferees';
import type { PhaseScheduleOptions, ScheduledMatch } from './types';

/**
 * Felder je Gruppe (Q21, Q49):
 * - mindestens so viele Felder wie Gruppen: je Gruppe ein Feld; übrige Felder an die Gruppen
 *   mit den meisten Spielen, höchstens so viele, wie gleichzeitig spielbar (Gruppengröße / 2)
 * - weniger Felder als Gruppen: Gruppen teilen sich Felder und spielen abwechselnd
 *
 * @returns je Feld die Gruppenindizes, die es bedient
 */
export function assignGroupCourts(groupSizes: readonly number[], courts: number): number[][] {
  if (!Number.isInteger(courts) || courts < 1) throw new RangeError('Mindestens ein Feld nötig.');
  const groupCount = groupSizes.length;
  if (courts < groupCount) {
    const perCourt: number[][] = Array.from({ length: courts }, () => []);
    groupSizes.forEach((_, g) => perCourt[g % courts]?.push(g));
    return perCourt;
  }
  const perCourt = groupSizes.map((_, g) => [g]);
  const courtsOfGroup = groupSizes.map(() => 1);
  const matchCount = (g: number) => {
    const n = groupSizes[g] ?? 0;
    return (n * (n - 1)) / 2;
  };
  let extra = courts - groupCount;
  while (extra > 0) {
    const candidate = groupSizes
      .map((size, g) => ({ g, size }))
      .filter(({ g, size }) => (courtsOfGroup[g] ?? 0) < Math.floor(size / 2))
      .sort(
        (a, b) =>
          (courtsOfGroup[a.g] ?? 0) - (courtsOfGroup[b.g] ?? 0) ||
          matchCount(b.g) - matchCount(a.g) ||
          a.g - b.g,
      )[0];
    if (!candidate) break;
    perCourt.push([candidate.g]);
    courtsOfGroup[candidate.g] = (courtsOfGroup[candidate.g] ?? 0) + 1;
    extra--;
  }
  return perCourt;
}

/** Zeitplan der Gruppenphase mit Feldern, Zeiten und Schiedsrichtern (Q20, Q21, Q49). */
export function scheduleGroupPhase(
  plan: GroupPhasePlan,
  options: PhaseScheduleOptions,
): ScheduledMatch[] {
  const queues = plan.groups.map((g) =>
    plan.matches
      .filter((m) => m.groupIndex === g.index)
      .map((m) => ({ id: m.id, teams: [m.teamA, m.teamB] as const })),
  );
  const slots = scheduleSlots(
    queues,
    assignGroupCourts(
      plan.groups.map((g) => g.teamIds.length),
      options.courts,
    ),
  );
  const byId = new Map(plan.matches.map((m) => [m.id, m]));
  const referees = options.referees
    ? assignTeamReferees(
        slots.map((s) => {
          const match = byId.get(s.matchId);
          if (!match) throw new Error(`Spiel ${s.matchId} fehlt`);
          return {
            matchId: s.matchId,
            slot: s.slot,
            teams: [match.teamA, match.teamB],
            preferred: match.referee,
          };
        }),
        plan.groups.flatMap((g) => g.teamIds),
      )
    : undefined;
  return toScheduled(slots, options, referees);
}

/**
 * Zeitplan „Jeder gegen jeden“: Vorrunde in Rundenreihenfolge über alle Felder; Schiedsrichter
 * ist ein Team, das im Zeitfenster nicht spielt (README.md „Schiedsrichter“).
 * Die Platzierungsspiele plant `scheduleRoundRobinPlacements` nach der Vorrunde.
 */
export function scheduleRoundRobin(
  plan: RoundRobinPlan,
  options: PhaseScheduleOptions,
): ScheduledMatch[] {
  const queue = plan.matches.map((m) => ({ id: m.id, teams: [m.teamA, m.teamB] as const }));
  const slots = scheduleSlots(
    [queue],
    Array.from({ length: options.courts }, () => [0]),
  );
  const teams = [...new Set(plan.matches.flatMap((m) => [m.teamA, m.teamB]))];
  const referees = options.referees
    ? assignTeamReferees(
        slots.map((s) => {
          const match = queue.find((m) => m.id === s.matchId);
          if (!match) throw new Error(`Spiel ${s.matchId} fehlt`);
          return {
            matchId: s.matchId,
            slot: s.slot,
            teams: match.teams,
            preferred: { kind: 'none' },
          };
        }),
        teams,
      )
    : undefined;
  return toScheduled(slots, options, referees);
}

function toScheduled(
  slots: readonly { matchId: string; court: number; slot: number }[],
  options: PhaseScheduleOptions,
  referees: ReadonlyMap<string, ScheduledMatch['referee']> | undefined,
): ScheduledMatch[] {
  return slots
    .map((s) => ({
      matchId: s.matchId,
      court: s.court,
      start: options.start + s.slot * options.matchDuration,
      end: options.start + (s.slot + 1) * options.matchDuration,
      referee: referees ? (referees.get(s.matchId) ?? { kind: 'organizer' as const }) : undefined,
    }))
    .sort((a, b) => a.start - b.start || a.court - b.court);
}
