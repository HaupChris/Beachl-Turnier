import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentTournament } = useTournament();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Start', icon: '🏐' },
    { path: '/configure', label: 'Konfiguration', icon: '⚙️' },
    ...(currentTournament && currentTournament.status !== 'configuration'
      ? [
          { path: '/matches', label: 'Spiele', icon: '📋' },
          { path: '/standings', label: 'Tabelle', icon: '📊' },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold">Beachvolleyball Turnier</h1>
          {currentTournament && (
            <p className="text-blue-100 text-sm">{currentTournament.name}</p>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 md:relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-around">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-4 flex-1 transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
