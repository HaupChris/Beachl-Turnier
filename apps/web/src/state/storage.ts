import { parseTournament, serializeTournament, type TournamentDocument } from '@beachl/domain';

/**
 * Speicherung der Turniere im Browser (IndexedDB, architecture.md Q39).
 * Gespeichert wird das Turnierdokument (Einstellungen + Ereignisliste) im Exportformat;
 * beim Laden wird es wie ein Import geprüft.
 */

const DB_NAME = 'beachl-turnier';
const STORE = 'tournaments';

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Datenbank konnte nicht geöffnet werden'));
    };
  });
}

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => {
      resolve(request.result);
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('Speichern fehlgeschlagen'));
    };
  });
}

interface StoredRecord {
  readonly id: string;
  readonly json: string;
}

function isStoredRecord(value: unknown): value is StoredRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record['id'] === 'string' && typeof record['json'] === 'string';
}

export interface TournamentStorage {
  loadAll(): Promise<{ documents: TournamentDocument[]; errors: string[] }>;
  save(doc: TournamentDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createIndexedDbStorage(factory: IDBFactory = indexedDB): TournamentStorage {
  let dbPromise: Promise<IDBDatabase> | undefined;
  const db = () => (dbPromise ??= openDatabase(factory));

  return {
    async loadAll() {
      const raw = await run<unknown[]>(
        await db(),
        'readonly',
        (s) => s.getAll() as IDBRequest<unknown[]>,
      );
      const documents: TournamentDocument[] = [];
      const errors: string[] = [];
      for (const record of raw.filter(isStoredRecord)) {
        const parsed = parseTournament(record.json);
        if (parsed.ok) documents.push(parsed.value);
        else errors.push(`Gespeichertes Turnier ${record.id} ist beschädigt: ${parsed.error}`);
      }
      return { documents, errors };
    },
    async save(doc) {
      const record: StoredRecord = { id: doc.id, json: serializeTournament(doc) };
      await run(await db(), 'readwrite', (s) => s.put(record));
    },
    async remove(id) {
      await run(await db(), 'readwrite', (s) => s.delete(id));
    },
  };
}
