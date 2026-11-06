/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Code-splitting routes for fast initial loading, instant tab switching, and low memory usage
const HomePage = React.lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const CollectionPage = React.lazy(() =>
  import('./pages/CollectionPage').then((m) => ({ default: m.CollectionPage }))
);
const GameDetailPage = React.lazy(() =>
  import('./pages/GameDetailPage').then((m) => ({ default: m.GameDetailPage }))
);
const AddGamePage = React.lazy(() =>
  import('./pages/AddGamePage').then((m) => ({ default: m.AddGamePage }))
);
const SessionsPage = React.lazy(() =>
  import('./pages/SessionsPage').then((m) => ({ default: m.SessionsPage }))
);
const NewSessionPage = React.lazy(() =>
  import('./pages/NewSessionPage').then((m) => ({ default: m.NewSessionPage }))
);
const SessionDetailPage = React.lazy(() =>
  import('./pages/SessionDetailPage').then((m) => ({ default: m.SessionDetailPage }))
);
const PlayersPage = React.lazy(() =>
  import('./pages/PlayersPage').then((m) => ({ default: m.PlayersPage }))
);
const PlayerDetailPage = React.lazy(() =>
  import('./pages/PlayerDetailPage').then((m) => ({ default: m.PlayerDetailPage }))
);
const StatsPage = React.lazy(() =>
  import('./pages/StatsPage').then((m) => ({ default: m.StatsPage }))
);
const PickerPage = React.lazy(() =>
  import('./pages/PickerPage').then((m) => ({ default: m.PickerPage }))
);

const PageFallback: React.FC = () => (
  <div className="w-full min-h-[50vh] flex items-center justify-center p-8">
    <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin opacity-50" />
  </div>
);

// Ensures that upon fresh entry into the app, it always defaults to Home ('/')
const AppStartupGuard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isFirstLaunchInSession = !sessionStorage.getItem('bg_vault_launched');
    sessionStorage.setItem('bg_vault_launched', 'true');

    if (isFirstLaunchInSession) {
      const hash = window.location.hash;
      // If the app was opened directly to players tab from an old shortcut or bookmark, or empty hash, redirect to Home
      if (
        !hash ||
        hash === '#' ||
        hash === '#/' ||
        hash === '#/players' ||
        hash === '#/players/' ||
        hash.startsWith('#/players?')
      ) {
        navigate('/', { replace: true });
      }
    }
  }, [navigate]);

  return null;
};

const AnimatedRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/collection/add" element={<AddGamePage />} />
        <Route path="/collection/:id" element={<GameDetailPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/new" element={<NewSessionPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/:id" element={<PlayerDetailPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/picker" element={<PickerPage />} />
        <Route path="/tools" element={<PickerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <AppStartupGuard />
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;
