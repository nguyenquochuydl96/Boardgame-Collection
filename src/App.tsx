/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AppShell } from './components/layout/AppShell';
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
      </Routes>
    </AnimatePresence>
  );
};

export function App() {
  return (
    <HashRouter>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
    </HashRouter>
  );
}

export default App;
