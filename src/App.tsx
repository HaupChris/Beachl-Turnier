import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Configure } from './pages/Configure';
import { Matches } from './pages/Matches';
import { Standings } from './pages/Standings';
import { Photos } from './pages/Photos';

function App() {
  return (
    <TournamentProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/configure" element={<Configure />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/photos" element={<Photos />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TournamentProvider>
  );
}

export default App;
