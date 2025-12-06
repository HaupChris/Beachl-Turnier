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
    { path: '/configure', label: 'Konfig', icon: '⚙️' },
    ...(currentTournament && currentTournament.status !== 'configuration'
      ? [
          { path: '/matches', label: 'Spiele', icon: '📋' },
          { path: '/standings', label: 'Tabelle', icon: '📊' },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center">
            {/* Logo container - sun logo with text overlapping */}
            <div className="relative flex items-center">
              <img
                src="/sun-logo.svg"
                alt="Beachl Logo"
                className="h-14 w-14 md:h-16 md:w-16"
              />
              <div className="ml-1 flex flex-col justify-center">
                <div className="flex items-baseline">
                  <span className="text-2xl md:text-3xl font-black tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                    BEACHL
                  </span>
                  <span className="text-xl md:text-2xl italic ml-0.5" style={{ fontFamily: 'Brush Script MT, Segoe Script, cursive' }}>
                    -e!!
                  </span>
                </div>
                {currentTournament && (
                  <p className="text-sky-100 text-xs md:text-sm -mt-1">{currentTournament.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <nav className="bg-white border-t border-amber-200 fixed bottom-0 left-0 right-0 md:relative shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-around">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-4 flex-1 transition-colors ${
                  isActive(item.path)
                    ? 'text-sky-600 bg-sky-50'
                    : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
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
