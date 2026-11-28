import { areaSettings, deriveTournament, enterResult, type TournamentConfig } from '@beachl/domain';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createIndexedDbStorage } from '../src/state/storage';
import { createTournamentStore } from '../src/state/tournamentStore';

const config: TournamentConfig = {
  name: 'Sommerturnier',
  format: 'groups-full-placement',
  teams: Array.from({ length: 8 }, (_, i) => ({
    id: `T${String(i + 1)}`,
    name: `Team ${String(i + 1)}`,
    seed: i + 1,
  })),
  courts: 2,
  startTime: 600,
  preliminary: areaSettings({ kind: 'singleSet', pointsPerSet: 21 }),
  knockout: areaSettings({ kind: 'singleSet', pointsPerSet: 21 }),
  placementMatches: false,
};

function setup(factory = new IDBFactory()) {
  let counter = 0;
  const storage = createIndexedDbStorage(factory);
  const store = createTournamentStore({
    storage,
    newId: () => `id-${String(++counter)}`,
    now: () => '2026-11-28T12:00:00Z',
  });
  return { store, storage, factory };
}

describe('Speicherung (IndexedDB)', () => {
  it('angelegtes Turnier und Ergebnisse überleben einen Neustart', async () => {
    const { store, factory } = setup();
    await store.getState().create(config);
    expect(await store.getState().run((doc) => enterResult(doc, 'A-1', [{ a: 21, b: 10 }]))).toBe(
      true,
    );

    const restarted = setup(factory).store;
    await restarted.getState().load();
    const docs = Object.values(restarted.getState().documents);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.events).toHaveLength(1);
    expect(restarted.getState().loaded).toBe(true);
  });

  it('beschädigte Einträge werden gemeldet statt geladen', async () => {
    const factory = new IDBFactory();
    const { store } = setup(factory);
    await store.getState().create(config);
    await new Promise<void>((resolve) => {
      const req = factory.open('beachl-turnier', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('tournaments', 'readwrite');
        tx.objectStore('tournaments').put({ id: 'kaputt', json: '{' });
        tx.oncomplete = () => {
          resolve();
        };
      };
    });
    const restarted = setup(factory).store;
    await restarted.getState().load();
    expect(Object.keys(restarted.getState().documents)).toEqual(['id-1']);
    expect(restarted.getState().error).toContain('kaputt');
  });
});

describe('Turnier-Store', () => {
  it('ungültige Einstellungen werden abgelehnt', async () => {
    const { store } = setup();
    const result = await store.getState().create({ ...config, courts: 0 });
    expect(result.ok).toBe(false);
    expect(store.getState().error).toContain('Feld');
  });

  it('Befehle ändern das aktuelle Turnier, Fehler landen im Zustand', async () => {
    const { store } = setup();
    await store.getState().create(config);
    expect(await store.getState().run((doc) => enterResult(doc, 'A-1', [{ a: 21, b: 20 }]))).toBe(
      false,
    );
    expect(store.getState().error).toContain('2 Punkten');
    store.getState().clearError();
    expect(store.getState().error).toBeUndefined();
  });

  it('ohne ausgewähltes Turnier kein Befehl', async () => {
    const { store } = setup();
    expect(await store.getState().run((doc) => ({ ok: true, value: doc }))).toBe(false);
  });

  it('Rückgängig entfernt das letzte Ereignis', async () => {
    const { store } = setup();
    await store.getState().create(config);
    await store.getState().run((doc) => enterResult(doc, 'A-1', [{ a: 21, b: 10 }]));
    await store.getState().undo();
    const doc = store.getState().documents['id-1'];
    expect(doc?.events).toHaveLength(0);
  });

  it('Export und Import; gleiche ID wird beim Import nicht überschrieben', async () => {
    const { store } = setup();
    await store.getState().create(config);
    const json = store.getState().exportJson('id-1') ?? '';
    const imported = await store.getState().importJson(json);
    expect(imported.ok && imported.value.id).toBe('id-2');
    expect(Object.keys(store.getState().documents)).toEqual(['id-1', 'id-2']);
    expect((await store.getState().importJson('{')).ok).toBe(false);
    expect(store.getState().exportJson('nix')).toBeUndefined();
  });

  it('Löschen entfernt das Turnier auch aus der Datenbank', async () => {
    const { store, factory } = setup();
    await store.getState().create(config);
    await store.getState().remove('id-1');
    expect(store.getState().currentId).toBeUndefined();
    const restarted = setup(factory).store;
    await restarted.getState().load();
    expect(restarted.getState().documents).toEqual({});
  });

  it('der gespeicherte Stand ergibt denselben Turnierverlauf', async () => {
    const { store } = setup();
    await store.getState().create(config);
    store.getState().select('id-1');
    const doc = store.getState().documents['id-1'];
    expect(doc && deriveTournament(doc).matches.length).toBe(12 + 12);
  });
});
