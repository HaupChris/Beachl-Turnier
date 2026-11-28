import { describe, expect, it } from 'vitest';
import {
  areaSettings,
  changeReferee,
  createTournament,
  deriveTournament,
  enterResult,
  parseTournament,
  revertWithdrawal,
  serializeTournament,
  undoLastEvent,
  withdrawTeam,
} from '../../src';
import { makeTeams } from '../helpers';
import { betterSeed, newTournament, playThrough, seedOf, setFor } from './tournamentHelpers';

const unwrap = <T>(o: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!o.ok) throw new Error(o.error);
  return o.value;
};

describe('Turnier anlegen', () => {
  it('neues Full Placement mit 16 Teams: 24 Gruppenspiele bereit, 32 K.o.-Spiele warten', () => {
    const view = deriveTournament(newTournament('groups-full-placement', 16));
    expect(view.matches.filter((m) => m.status === 'ready')).toHaveLength(24);
    expect(view.matches.filter((m) => m.status === 'waiting')).toHaveLength(32);
    expect(view.isFinished).toBe(false);
    expect(view.matches[0]).toMatchObject({ court: 1, start: 540, end: 565 });
  });

  it.each([
    [{ name: ' ' }, 'Namen'],
    [{ courts: 0 }, 'Feld'],
    [{ teams: makeTeams(5) }, '6–32'],
    [{ knockout: areaSettings({ kind: 'twoSets', pointsPerSet: 15 }) }, '2 Sätze'],
    [{ teams: makeTeams(6).map((t) => ({ ...t, seed: t.seed + 1 })) }, 'Setzplätze'],
    [{ teams: makeTeams(6).map((t) => ({ ...t, id: 'x' })) }, 'eindeutig'],
    [{ teams: makeTeams(6).map((t) => ({ ...t, name: '' })) }, 'Team braucht'],
    [
      { preliminary: areaSettings({ kind: 'singleSet', pointsPerSet: 21 }, { matchDuration: 0 }) },
      'Spieldauer',
    ],
  ])('lehnt ungültige Einstellungen ab (%j)', (override, message) => {
    const base = newTournament('groups-full-placement', 8).config;
    const result = createTournament({ ...base, ...override }, { id: 'x', createdAt: 'now' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(message);
  });

  it('„Jeder gegen jeden“ braucht mindestens 3 Teams', () => {
    const base = newTournament('round-robin', 4).config;
    expect(
      createTournament({ ...base, teams: makeTeams(2) }, { id: 'x', createdAt: 'now' }).ok,
    ).toBe(false);
  });
});

describe('Turnier durchspielen', () => {
  it.each(['groups-full-placement', 'groups-split-bracket'] as const)(
    '%s mit 16 Teams: Favoritensiege ergeben Endstand nach Setzliste',
    (format) => {
      const view = deriveTournament(playThrough(newTournament(format, 16)));
      expect(view.isFinished).toBe(true);
      expect(view.placements.map((p) => seedOf(p.teamId))).toEqual(
        Array.from({ length: 16 }, (_, i) => i + 1),
      );
    },
  );

  it('Jeder gegen jeden mit 6 Teams: Platzierungsspiel entscheidet den Platz (Q29)', () => {
    let doc = newTournament('round-robin', 6);
    doc = playThrough(doc, (m) =>
      m.phase === 'placement' && m.placementRank === 3
        ? 'b'
        : seedOf(m.teamA) < seedOf(m.teamB)
          ? 'a'
          : 'b',
    );
    const view = deriveTournament(doc);
    expect(view.isFinished).toBe(true);
    expect(view.placements.map((p) => seedOf(p.teamId))).toEqual([1, 2, 4, 3, 5, 6]);
  });

  it('Schere-Stein-Papier wird verlangt und löst den Gleichstand (Q6, Q7)', () => {
    let doc = newTournament('round-robin', 3, { placementMatches: false });
    // Zyklus mit gleichen Ergebnissen: T1 schlägt T2, T2 schlägt T3, T3 schlägt T1.
    const winnerSeed = (a: number, b: number) => (a + b === 3 ? 1 : a + b === 5 ? 2 : 3);
    for (const m of deriveTournament(doc).matches) {
      const side = seedOf(m.teamA) === winnerSeed(seedOf(m.teamA), seedOf(m.teamB)) ? 'a' : 'b';
      doc = unwrap(enterResult(doc, m.id, setFor(side)));
    }
    const before = deriveTournament(doc);
    expect(before.table?.pendingRockPaperScissors).toHaveLength(1);
    expect(before.isFinished).toBe(false);
    const after = deriveTournament(playThrough(doc));
    expect(after.isFinished).toBe(true);
  });
});

describe('Rückzug (Q28)', () => {
  it('in der Gruppe: Spiele annulliert, Team erhält keinen Platz', () => {
    let doc = newTournament('groups-full-placement', 16);
    doc = unwrap(withdrawTeam(doc, 'T16'));
    const view = deriveTournament(playThrough(doc));
    expect(view.matches.filter((m) => m.status === 'cancelled')).toHaveLength(3);
    expect(view.withdrawals).toEqual([{ teamId: 'T16', phase: 'preliminary' }]);
    expect(view.placements).toHaveLength(15);
    expect(view.placements.some((p) => p.teamId === 'T16')).toBe(false);
  });

  it('im K.o.: Gegner kommt kampflos weiter, Team landet hinten im Teilbaum', () => {
    let doc = newTournament('groups-full-placement', 16);
    for (const m of deriveTournament(doc).matches.filter((x) => x.phase === 'group')) {
      doc = unwrap(enterResult(doc, m.id, setFor(betterSeed(m))));
    }
    doc = unwrap(withdrawTeam(doc, 'T1'));
    const view = deriveTournament(playThrough(doc));
    expect(view.withdrawals).toEqual([{ teamId: 'T1', phase: 'knockout' }]);
    expect(view.matches.find((m) => m.id === 'K1')?.status).toBe('walkover');
    expect(view.placements.find((p) => p.teamId === 'T1')?.place).toBe(16);
    expect(view.isFinished).toBe(true);
  });

  it('Rückgängig und Aufheben stellen den vorherigen Stand her', () => {
    const doc = newTournament('groups-split-bracket', 12);
    const withdrawn = unwrap(withdrawTeam(doc, 'T5'));
    expect(deriveTournament(undoLastEvent(withdrawn))).toEqual(deriveTournament(doc));
    const reverted = unwrap(revertWithdrawal(withdrawn, 'T5'));
    expect(deriveTournament(reverted).matches).toEqual(deriveTournament(doc).matches);
    expect(withdrawTeam(withdrawn, 'T5').ok).toBe(false);
    expect(revertWithdrawal(doc, 'T5').ok).toBe(false);
    expect(withdrawTeam(doc, 'X').ok).toBe(false);
  });
});

describe('Ergebnisse und Korrekturen', () => {
  it('lehnt ungültige Ergebnisse und Spiele ohne Teams ab', () => {
    const doc = newTournament('groups-full-placement', 8);
    expect(enterResult(doc, 'A-1', [{ a: 21, b: 20 }]).ok).toBe(false);
    expect(enterResult(doc, 'K12', setFor('a')).ok).toBe(false);
    expect(enterResult(doc, 'nix', setFor('a')).ok).toBe(false);
  });

  it('Korrektur eines früheren Spiels macht ein Folgeergebnis veraltet', () => {
    const finished = playThrough(newTournament('groups-full-placement', 8));
    const view = deriveTournament(finished);
    const first = view.matches.find((m) => m.id === 'K1');
    const corrected = unwrap(
      enterResult(finished, 'K1', setFor(first?.winner === first?.teamA ? 'b' : 'a')),
    );
    const after = deriveTournament(corrected);
    expect(after.warnings.some((w) => w.includes('passt nicht mehr'))).toBe(true);
    expect(after.isFinished).toBe(false);
  });

  it('Schiedsrichter lassen sich ändern, aber nicht auf ein spielendes Team', () => {
    const doc = newTournament('groups-full-placement', 8);
    const changed = unwrap(changeReferee(doc, 'A-1', 'T8'));
    expect(deriveTournament(changed).matches.find((m) => m.id === 'A-1')?.referee).toEqual({
      kind: 'team',
      teamId: 'T8',
    });
    expect(
      deriveTournament(unwrap(changeReferee(doc, 'A-1', null))).matches[0]?.referee,
    ).toBeUndefined();
    const match = deriveTournament(doc).matches[0];
    expect(changeReferee(doc, 'A-1', match?.teamA ?? '').ok).toBe(false);
    expect(changeReferee(doc, 'nix', null).ok).toBe(false);
  });
});

describe('Export und Import', () => {
  it('Export und Import ergeben denselben Stand (metamorph)', () => {
    const doc = playThrough(newTournament('groups-split-bracket', 10));
    const parsed = unwrap(parseTournament(serializeTournament(doc)));
    expect(parsed).toEqual(doc);
    expect(deriveTournament(parsed)).toEqual(deriveTournament(doc));
  });

  it.each([
    ['kein JSON', '{'],
    ['falsche Version', '{"schemaVersion":2}'],
    ['unvollständig', '{"schemaVersion":1,"id":"x"}'],
  ])('lehnt ab: %s', (_label, json) => {
    expect(parseTournament(json).ok).toBe(false);
  });

  it('lehnt unbekannte Ereignisse und kaputte Einstellungen ab', () => {
    const doc = newTournament('round-robin', 4);
    const withBadEvent = { ...doc, events: [{ type: 'Boom' }] };
    expect(parseTournament(JSON.stringify(withBadEvent)).ok).toBe(false);
    const withBadConfig = { ...doc, config: { ...doc.config, courts: 'vier' } };
    expect(parseTournament(JSON.stringify(withBadConfig)).ok).toBe(false);
    const invalidRules = { ...doc, config: { ...doc.config, courts: 0 } };
    expect(parseTournament(JSON.stringify(invalidRules)).ok).toBe(false);
  });
});
