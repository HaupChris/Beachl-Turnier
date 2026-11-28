import {
  createTournament,
  parseTournament,
  serializeTournament,
  type Outcome,
  type TournamentConfig,
  type TournamentDocument,
  undoLastEvent,
} from '@beachl/domain';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { TournamentStorage } from './storage';

/**
 * Zustand der App: alle Turniere als Dokumente (Einstellungen + Ereignisliste).
 * Jede Änderung läuft über einen Befehl der Fachlogik und wird sofort gespeichert.
 */
export interface TournamentState {
  readonly documents: Readonly<Record<string, TournamentDocument>>;
  readonly currentId: string | undefined;
  readonly loaded: boolean;
  /** Letzter Fehler für die Oberfläche, z. B. ungültiges Ergebnis. */
  readonly error: string | undefined;

  load(): Promise<void>;
  create(config: TournamentConfig): Promise<Outcome<TournamentDocument>>;
  select(id: string | undefined): void;
  /** Führt einen Befehl der Fachlogik auf dem aktuellen Turnier aus. */
  run(command: (doc: TournamentDocument) => Outcome<TournamentDocument>): Promise<boolean>;
  undo(): Promise<void>;
  remove(id: string): Promise<void>;
  importJson(json: string): Promise<Outcome<TournamentDocument>>;
  exportJson(id: string): string | undefined;
  clearError(): void;
}

export interface StoreDependencies {
  readonly storage: TournamentStorage;
  readonly newId: () => string;
  readonly now: () => string;
}

export function createTournamentStore(deps: StoreDependencies): StoreApi<TournamentState> {
  return createStore<TournamentState>()((set, get) => {
    const persist = async (doc: TournamentDocument) => {
      set((s) => ({ documents: { ...s.documents, [doc.id]: doc }, error: undefined }));
      await deps.storage.save(doc);
    };
    const current = () => {
      const id = get().currentId;
      return id ? get().documents[id] : undefined;
    };

    return {
      documents: {},
      currentId: undefined,
      loaded: false,
      error: undefined,

      async load() {
        const { documents, errors } = await deps.storage.loadAll();
        set({
          documents: Object.fromEntries(documents.map((d) => [d.id, d])),
          loaded: true,
          error: errors[0],
        });
      },

      async create(config) {
        const created = createTournament(config, { id: deps.newId(), createdAt: deps.now() });
        if (!created.ok) {
          set({ error: created.error });
          return created;
        }
        await persist(created.value);
        set({ currentId: created.value.id });
        return created;
      },

      select(id) {
        set({ currentId: id, error: undefined });
      },

      async run(command) {
        const doc = current();
        if (!doc) {
          set({ error: 'Kein Turnier ausgewählt.' });
          return false;
        }
        const result = command(doc);
        if (!result.ok) {
          set({ error: result.error });
          return false;
        }
        await persist(result.value);
        return true;
      },

      async undo() {
        const doc = current();
        if (doc && doc.events.length > 0) await persist(undoLastEvent(doc));
      },

      async remove(id) {
        set((s) => {
          const documents = Object.fromEntries(
            Object.entries(s.documents).filter(([key]) => key !== id),
          );
          return { documents, currentId: s.currentId === id ? undefined : s.currentId };
        });
        await deps.storage.remove(id);
      },

      async importJson(json) {
        const parsed = parseTournament(json);
        if (!parsed.ok) {
          set({ error: parsed.error });
          return parsed;
        }
        // Import überschreibt nie ein vorhandenes Turnier: bei gleicher ID neue ID vergeben.
        const doc = get().documents[parsed.value.id]
          ? { ...parsed.value, id: deps.newId() }
          : parsed.value;
        await persist(doc);
        set({ currentId: doc.id });
        return { ok: true, value: doc };
      },

      exportJson(id) {
        const doc = get().documents[id];
        return doc ? serializeTournament(doc) : undefined;
      },

      clearError() {
        set({ error: undefined });
      },
    };
  });
}
