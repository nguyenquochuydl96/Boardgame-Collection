/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { AddGamePage } from './pages/AddGamePage';
import { SessionsPage } from './pages/SessionsPage';
import { NewSessionPage } from './pages/NewSessionPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { PlayersPage } from './pages/PlayersPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { StatsPage } from './pages/StatsPage';
import { PickerPage } from './pages/PickerPage';

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
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
    </AnimatePresence>
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
