import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Configure } from './pages/Configure';
import { Matches } from './pages/Matches';
import { Standings } from './pages/Standings';

function App() {
  return (
    <TournamentProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/configure" element={<Configure />} />
            {/* Tournament-specific routes with container and tournament IDs */}
            <Route path="/tournament/:containerId" element={<Home />} />
            <Route path="/tournament/:containerId/configure" element={<Configure />} />
            <Route path="/tournament/:containerId/matches" element={<Matches />} />
            <Route path="/tournament/:containerId/matches/:tournamentId" element={<Matches />} />
            <Route path="/tournament/:containerId/standings" element={<Standings />} />
            <Route path="/tournament/:containerId/standings/:tournamentId" element={<Standings />} />
            {/* Legacy routes for backwards compatibility */}
            <Route path="/matches" element={<Matches />} />
            <Route path="/standings" element={<Standings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TournamentProvider>
  );
}

export default App;
