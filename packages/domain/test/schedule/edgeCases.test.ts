import { describe, expect, it } from 'vitest';
import {
  formatSlot,
  formatStage,
  planFullPlacement,
  planGroupPhase,
  planRoundRobin,
  scheduleGroupPhase,
  scheduleRoundRobin,
  scheduleRoundRobinPlacements,
} from '../../src';
import { simplifyByes } from '../../src/knockout/byes';
import { firstRound } from '../../src/knockout/firstRound';
import { placementTree, rank } from '../../src/knockout/rawPlan';
import { makeTeams } from '../helpers';
import { planFor } from '../knockout/knockoutHelpers';

describe('Bezeichnungen für die Anzeige', () => {
  it.each([
    [{ kind: 'round', size: 4 } as const, 'Halbfinale'],
    [{ kind: 'round', size: 8 } as const, 'Viertelfinale'],
    [{ kind: 'round', size: 16 } as const, 'Achtelfinale'],
    [{ kind: 'round', size: 32 } as const, 'Sechzehntelfinale'],
    [{ kind: 'round', size: 64 } as const, 'Runde der letzten 64'],
    [{ kind: 'placementRound' } as const, 'Platzierungsrunde'],
    [{ kind: 'placementMatch', place: 1 } as const, 'Finale'],
    [{ kind: 'placementMatch', place: 7 } as const, 'Spiel um Platz 7'],
    [{ kind: 'playIn' } as const, 'Vorschaltspiel'],
  ])('%j → %s', (stage, label) => {
    expect(formatStage(stage)).toBe(label);
  });

  it('unbekanntes Spiel wird als „?“ angezeigt', () => {
    const { plan } = planFor('full', 8);
    expect(formatSlot({ kind: 'winnerOf', matchId: 'K999' }, plan)).toBe('Sieger Spiel ?');
  });
});

describe('Fehlerfälle beim Planen', () => {
  it('8 Gruppen mit 5er-Gruppen gibt es nicht', () => {
    expect(() => planFullPlacement({ groupSizes: [5, 5, 5, 5, 5, 5, 5, 5] })).toThrow(RangeError);
  });

  it('Baum ohne Plan für 3 Gruppen', () => {
    expect(() => firstRound(3)).toThrow(RangeError);
  });

  it('Platzierungsbaum braucht 2^k Spiele', () => {
    expect(() =>
      placementTree(
        [
          [rank(0, 1), rank(1, 1)],
          [rank(0, 2), rank(1, 2)],
          [rank(0, 3), rank(1, 3)],
        ],
        1,
        'main',
        1,
      ),
    ).toThrow(RangeError);
  });

  it('Verweis auf ein später definiertes Spiel ist ein Programmierfehler', () => {
    const raw = {
      sections: [{ id: 'main', title: '' }],
      matches: [
        {
          key: 'A',
          sectionId: 'main',
          round: 1,
          slotA: { kind: 'winnerOf', key: 'B' } as const,
          slotB: rank(0, 1),
          placeFrom: 1,
          placeTo: 2,
          terminal: true,
        },
      ],
      unplayed: [],
    };
    expect(() => simplifyByes(raw, [2])).toThrow();
  });
});

describe('Schiedsrichter in Sonderfällen (Q49)', () => {
  it('5er-Gruppe auf zwei Feldern: freies Team der anderen Gruppe pfeift mit', () => {
    // 3 Felder: Gruppe A spielt doppelt (1 freies Team), Gruppe B einfach (2 freie Teams).
    const plan = planGroupPhase(makeTeams(10));
    const schedule = scheduleGroupPhase(plan, {
      courts: 3,
      start: 0,
      matchDuration: 30,
      referees: true,
    });
    const groupOf = new Map(plan.groups.flatMap((g) => g.teamIds.map((t) => [t, g.index])));
    const matchGroup = new Map(plan.matches.map((m) => [m.id, m.groupIndex]));
    const crossGroup = schedule.filter(
      (s) =>
        s.referee?.kind === 'team' && groupOf.get(s.referee.teamId) !== matchGroup.get(s.matchId),
    );
    expect(crossGroup.length).toBeGreaterThan(0);
  });

  it('Jeder gegen jeden ohne Schiedsrichter: keine Zuteilung', () => {
    const plan = planRoundRobin(makeTeams(5), { withPlacementMatches: true });
    const schedule = scheduleRoundRobin(plan, {
      courts: 2,
      start: 0,
      matchDuration: 20,
      referees: false,
    });
    expect(schedule.every((s) => s.referee === undefined)).toBe(true);
  });

  it('Platzierungsspiele mit Schiedsrichtern: Turnierleitung teilt zu', () => {
    const plan = planRoundRobin(makeTeams(4), { withPlacementMatches: true });
    const schedule = scheduleRoundRobinPlacements(plan.placementMatches, {
      courts: 1,
      start: 0,
      matchDuration: 20,
      referees: true,
    });
    expect(schedule.map((s) => s.referee)).toEqual([{ kind: 'organizer' }, { kind: 'organizer' }]);
  });
});
