import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { PhaseTabs } from './PhaseTabs';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentTournament, getTournamentUrl, currentContainer } = useTournament();

  // Update browser tab title based on current tournament
  useEffect(() => {
    if (currentContainer) {
      document.title = `${currentContainer.name} | BeachL Turnier`;
    } else {
      document.title = 'BeachL Turnier Manager';
    }
  }, [currentContainer]);

  // Check if current path matches a given base path (considering tournament URLs)
  const isActive = (basePath: string) => {
    const currentPath = location.pathname;
    if (basePath === '/') {
      // Home is active for root or /tournament/:id
      return currentPath === '/' || (currentPath.startsWith('/tournament/') && !currentPath.includes('/matches') && !currentPath.includes('/standings') && !currentPath.includes('/configure'));
    }
    // For other paths, check if the current path ends with the base path
    return currentPath === basePath || currentPath.endsWith(basePath);
  };

  // Generate nav items with proper URLs
  const getNavPath = (basePath: string) => {
    if (currentContainer) {
      return getTournamentUrl(basePath);
    }
    return basePath;
  };

  const navItems = [
    { path: '/', label: 'Übersicht', icon: '🏐' },
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
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-6 py-2">
          <div className="flex items-center">
            {/* Logo container - sun logo with text overlapping */}
            <Link to={getNavPath('/')} className="relative flex items-center hover:opacity-90 transition-opacity">
              <img
                src="/sun-logo.svg"
                alt="BeachL Turnier Manager Logo"
                className="h-14 w-14 md:h-16 md:w-16"
              />
              <div className="ml-1 flex flex-col justify-center">
                {currentContainer ? (
                  <>
                    <span className="text-xs text-sky-200 tracking-wide">BeachL Turnier Manager</span>
                    <span className="text-lg md:text-xl font-bold tracking-tight -mt-0.5">
                      {currentContainer.name}
                    </span>
                  </>
                ) : (
                  <span className="text-lg md:text-xl font-bold tracking-tight">
                    BeachL Turnier Manager
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </header>

      <PhaseTabs />

      <main className="flex-1 max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full mx-auto px-4 lg:px-6 py-6">
        {children}
      </main>

      <nav className="bg-white border-t border-amber-200 fixed bottom-0 left-0 right-0 shadow-lg">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
          <div className="flex justify-around">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={getNavPath(item.path)}
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

      {/* Spacer for fixed bottom nav */}
      <div className="h-16" />
    </div>
  );
}
