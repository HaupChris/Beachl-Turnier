import { useEffect } from 'react';
import { BoardPage } from './pages/board/BoardPage';
import { Home } from './pages/Home';
import { Setup } from './pages/setup/Setup';
import { TournamentPage } from './pages/tournament/TournamentPage';
import { useRoute } from './router';
import { appStore } from './state/appStore';

export function App() {
  const route = useRoute();
  useEffect(() => {
    void appStore.getState().load();
  }, []);

  switch (route.page) {
    case 'home':
      return <Home />;
    case 'setup':
      return <Setup />;
    case 'tournament':
      return <TournamentPage id={route.id} tab={route.view} />;
    case 'board':
      return <BoardPage id={route.id} />;
  }
}
