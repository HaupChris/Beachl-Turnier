import { deriveTournament, type TournamentView } from '@beachl/domain';
import { useMemo } from 'react';
import { useStore } from 'zustand';
import { createIndexedDbStorage } from './storage';
import { createTournamentStore, type TournamentState } from './tournamentStore';

/**
 * Store der App mit IndexedDB. Änderungen werden über einen BroadcastChannel an andere
 * Fenster gemeldet, damit der Aushang live mitläuft (Q42).
 */
const storage = createIndexedDbStorage();
const channel =
  typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('beachl-turnier');

export const appStore = createTournamentStore({
  storage: {
    ...storage,
    async save(doc) {
      await storage.save(doc);
      channel?.postMessage({ type: 'saved', id: doc.id });
    },
  },
  newId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
});

channel?.addEventListener('message', () => {
  void appStore.getState().load();
});

export function useApp<T>(selector: (state: TournamentState) => T): T {
  return useStore(appStore, selector);
}

/** Abgeleiteter Turnierstand eines Turniers; neu berechnet, wenn sich das Dokument ändert. */
export function useTournamentView(id: string | undefined): TournamentView | undefined {
  const doc = useApp((s) => (id ? s.documents[id] : undefined));
  return useMemo(() => (doc ? deriveTournament(doc) : undefined), [doc]);
}
