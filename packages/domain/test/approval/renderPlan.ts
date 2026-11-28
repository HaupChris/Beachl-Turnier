import {
  formatSlot,
  formatStage,
  type GroupPhasePlan,
  type KnockoutPlan,
  planRoundRobin,
  type TeamId,
} from '../../src';
import { makeTeams } from '../helpers';
import {
  betterSeedWins,
  chalkGroupRanking,
  type Format,
  planFor,
  playOut,
  seedOf,
} from '../knockout/knockoutHelpers';

const FORMAT_TITLES: Record<Format, string> = {
  full: 'Full Placement („alle kommen weiter, alles ausspielen“)',
  split: 'Short Main („3 kommen weiter“)',
};

const seed = (id: TeamId | undefined) => (id === undefined ? '?' : `#${String(seedOf(id))}`);
const pad = (text: string, width: number) => text.padEnd(width);

/** Lesbarer Plan für die Freigabe (architecture.md „Teststrategie“, Freigabe-Dateien). */
export function renderGroupFormat(format: Format, teamCount: number): string {
  const { groupPhase, plan } = planFor(format, teamCount);
  return [
    `${FORMAT_TITLES[format]} · ${String(teamCount)} Teams`,
    `Gruppen: ${String(groupPhase.layout.groupCount)} (Größen ${groupPhase.layout.sizes.join(', ')})`,
    '',
    ...renderGroups(groupPhase),
    '',
    ...renderKnockout(plan),
    '',
    ...renderChalkRun(groupPhase, plan),
    '',
  ].join('\n');
}

function renderGroups(groupPhase: GroupPhasePlan): string[] {
  const lines = ['== Gruppen (Setzplätze nach Platz in der Gruppe) =='];
  for (const g of groupPhase.groups) lines.push(`  ${g.name}: ${g.teamIds.map(seed).join(', ')}`);
  lines.push('', '== Gruppenspiele (Spiel: Team – Team, Schiedsrichter) ==');
  for (const m of groupPhase.matches) {
    const referee =
      m.referee.kind === 'team'
        ? seed(m.referee.teamId)
        : m.referee.kind === 'loserOf'
          ? `Verlierer ${m.referee.matchId}`
          : 'Turnierleitung teilt zu';
    lines.push(
      `  ${pad(m.id, 5)} ${pad(`${seed(m.teamA)} – ${seed(m.teamB)}`, 11)} Schiri ${referee}`,
    );
  }
  return lines;
}

function renderKnockout(plan: KnockoutPlan): string[] {
  const lines = [`== K.o.-Runde (${String(plan.matches.length)} Spiele) ==`];
  for (const section of plan.sections) {
    const range = `Platz ${String(section.places.from)}–${String(section.places.to)}`;
    lines.push('', `-- ${section.title}${/^Platz \d/.test(section.title) ? '' : ` (${range})`} --`);
    for (const m of plan.matches.filter((x) => x.sectionId === section.id)) {
      const slots = `${formatSlot(m.slotA, plan)} – ${formatSlot(m.slotB, plan)}`;
      const places = `Platz ${String(m.places.from)}–${String(m.places.to)}`;
      lines.push(
        `  Spiel ${pad(String(m.number), 3)} R${String(m.round)}  ${pad(formatStage(m.stage), 20)} ${pad(slots, 40)} ${places}`,
      );
    }
  }
  lines.push('', '== Endplatzierung (Platzhalter) ==');
  for (const p of plan.placements)
    lines.push(`  ${pad(`${String(p.place)}.`, 4)} ${formatSlot(p.source, plan)}`);
  return lines;
}

function renderChalkRun(groupPhase: GroupPhasePlan, plan: KnockoutPlan): string[] {
  const result = playOut(plan, chalkGroupRanking(groupPhase), betterSeedWins);
  const lines = [
    '== Beispielverlauf: Gruppen enden wie gesetzt, der besser Gesetzte gewinnt jedes Spiel ==',
  ];
  for (const m of result.matches) {
    lines.push(
      `  Spiel ${pad(String(m.match.number), 3)} ${seed(m.teamA)} – ${seed(m.teamB)} → ${seed(m.winner)}`,
    );
  }
  lines.push('', '== Endstand im Beispielverlauf ==');
  for (const p of result.placements)
    lines.push(`  ${pad(`${String(p.place)}.`, 4)} ${seed(p.teamId)}`);
  const off = result.placements.filter((p) => p.place !== seedOf(p.teamId));
  lines.push(
    '',
    '== Seed-Konsistenz (weiche Anforderung, Q14) ==',
    off.length === 0
      ? '  Alle Teams landen auf ihrem Setzplatz.'
      : `  ${String(off.length)} Abweichungen: ${off.map((p) => `${seed(p.teamId)} → Platz ${String(p.place)}`).join(', ')}`,
  );
  return lines;
}

export function renderRoundRobin(teamCount: number): string {
  const plan = planRoundRobin(makeTeams(teamCount), { withPlacementMatches: true });
  const lines = [`Jeder gegen jeden · ${String(teamCount)} Teams`, '', '== Runden (Setzplätze) =='];
  const rounds = new Map<number, string[]>();
  for (const m of plan.matches) {
    rounds.set(m.round, [...(rounds.get(m.round) ?? []), `${seed(m.teamA)} – ${seed(m.teamB)}`]);
  }
  for (const [round, pairs] of rounds) lines.push(`  Runde ${String(round)}: ${pairs.join(' · ')}`);
  lines.push('', '== Platzierungsspiele (optional) ==');
  for (const p of plan.placementMatches) {
    lines.push(
      `  ${p.id}: Rang ${String(p.upperRank)} – Rang ${String(p.lowerRank)} um Platz ${String(p.upperRank)}`,
    );
  }
  if (teamCount % 2 === 1) lines.push(`  Rang ${String(teamCount)} hat kein Platzierungsspiel.`);
  return [...lines, ''].join('\n');
}
