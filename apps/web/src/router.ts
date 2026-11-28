import { useSyncExternalStore } from 'react';

/**
 * Einfaches Hash-Routing: #/, #/neu, #/turnier/<id>/<ansicht>.
 * Funktioniert ohne Server-Konfiguration und offline (Q38).
 */
export type Route =
  | { readonly page: 'home' }
  | { readonly page: 'setup' }
  | { readonly page: 'tournament'; readonly id: string; readonly view: TournamentTab }
  | { readonly page: 'board'; readonly id: string };

export const TOURNAMENT_TABS = [
  'jetzt',
  'spielplan',
  'gruppen',
  'baum',
  'endstand',
  'teams',
] as const;
export type TournamentTab = (typeof TOURNAMENT_TABS)[number];

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'neu') return { page: 'setup' };
  if (parts[0] === 'aushang' && parts[1]) return { page: 'board', id: parts[1] };
  if (parts[0] === 'turnier' && parts[1]) {
    const view = TOURNAMENT_TABS.find((t) => t === parts[2]) ?? 'jetzt';
    return { page: 'tournament', id: parts[1], view };
  }
  return { page: 'home' };
}

export function href(route: Route): string {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'setup':
      return '#/neu';
    case 'tournament':
      return `#/turnier/${route.id}/${route.view}`;
    case 'board':
      return `#/aushang/${route.id}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
  };
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
