import React, { useState, useEffect } from 'react';
import { BoardGame, CabinetType } from './types/boardgame';
import { USER_46_GAMES } from './data/userCollectionCatalog';
import { fetchFromGoogleSheet, SAMPLE_GOOGLE_SHEET_URL, USER_COLLECTION_SHEET_URL } from './services/googleSheets';
import { enrichCollectionWithBgg } from './services/bggService';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { CabinetsView } from './components/CabinetsView';
import { ComparisonMode } from './components/ComparisonMode';
import { StatsView } from './components/StatsView';
import { BottomDock } from './components/BottomDock';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { GameDetailModal } from './components/GameDetailModal';
import { AddEditGameModal } from './components/AddEditGameModal';
import { SmartGamePickerModal } from './components/SmartGamePickerModal';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  AlertTriangle,
  Sheet,
  Sparkles,
  Smartphone,
  WifiOff,
} from 'lucide-react';

const STORAGE_KEY = 'boardgame_vault_games_v11';
const SHEET_URL_KEY = 'boardgame_vault_sheet_url_v11';
const LAST_SYNC_KEY = 'boardgame_vault_last_sync_v11';

export default function App() {
  // Navigation tab - Default to 'overview' with hash support (#cabinets, #overview, etc.)
  const [activeTab, setActiveTabState] = useState<'overview' | 'cabinets' | 'compare' | 'stats' | 'sheet'>(() => {
    try {
      const h = window.location.hash.replace('#', '');
      if (['overview', 'cabinets', 'compare', 'stats', 'sheet'].includes(h)) {
        return h as any;
      }
    } catch {}
    return 'overview';
  });

  const setActiveTab = (tab: 'overview' | 'cabinets' | 'compare' | 'stats' | 'sheet') => {
    setActiveTabState(tab);
    try {
      window.location.hash = tab;
    } catch {}
  };

  useEffect(() => {
    const handleHash = () => {
      try {
        const h = window.location.hash.replace('#', '');
        if (['overview', 'cabinets', 'compare', 'stats', 'sheet'].includes(h)) {
          setActiveTabState(h as any);
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [currentTheme, setCurrentTheme] = useState<'mahogany' | 'cyberpunk' | 'parchment'>('mahogany');

  // Google Workspace Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Games state with local storage fallback
  const [games, setGames] = useState<BoardGame[]>(() => {
    try {
      // Clear legacy caches containing broken image URLs or unseparated cabinets
      ['boardgame_vault_games_v2', 'boardgame_vault_games_v3', 'boardgame_vault_games_v4', 'boardgame_vault_games_v8', 'boardgame_vault_games_v9', 'boardgame_vault_games_v10'].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length >= 40 &&
          !parsed.some((g: any) => g.name?.toLowerCase() === 'name') &&
          parsed.some((g: any) => g.cabinetType === 'fake')
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved games:', e);
    }
    return USER_46_GAMES;
  });

  // Google Sheet state: defaulted to user's active Google Sheet
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem(SHEET_URL_KEY);
    return saved && !saved.includes('demo') ? saved : USER_COLLECTION_SHEET_URL;
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(() => {
    return localStorage.getItem(LAST_SYNC_KEY) || undefined;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEnrichingBgg, setIsEnrichingBgg] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status indicator
  const isCustomSheetConnected = Boolean(
    (sheetUrl && !sheetUrl.includes('demo')) || currentUser
  );
  const isDemoData = !isCustomSheetConnected;

  // Modals state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalCabinet, setAddModalCabinet] = useState<CabinetType>('real');
  const [selectedGame, setSelectedGame] = useState<BoardGame | null>(null);
  const [editingGame, setEditingGame] = useState<BoardGame | null>(null);
  const [isGamePickerOpen, setIsGamePickerOpen] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('picker=');
    } catch {
      return false;
    }
  });
  const [gamePickerInitialTab, setGamePickerInitialTab] = useState<'recommend' | 'wheel'>(() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('picker=wheel') ? 'wheel' : 'recommend';
    } catch {
      return 'recommend';
    }
  });

  const handleOpenGamePicker = (tab: 'recommend' | 'wheel' = 'recommend') => {
    setGamePickerInitialTab(tab);
    setIsGamePickerOpen(true);
  };

  // PWA and Online/Offline state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã khôi phục kết nối Internet!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Đang ở chế độ Offline. Bộ sưu tập vẫn hoạt động mượt mà!');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsInstallable(false);
        showToast('Đã cài đặt thành công ứng dụng BoardGame Vault!');
      }
      setDeferredPrompt(null);
    } else {
      showToast('Trên iOS: Bấm biểu tượng Chia Sẻ (Share) -> Chọn "Thêm vào Màn hình chính"');
    }
  };

  // Initialize Firebase Auth listener on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save games to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch (e) {
      console.error('Error saving games to localStorage:', e);
    }
  }, [games]);

  useEffect(() => {
    if (sheetUrl) {
      localStorage.setItem(SHEET_URL_KEY, sheetUrl);
    }
  }, [sheetUrl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSignInWithGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        showToast(`Connected to Google: ${res.user.displayName || res.user.email}!`);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      showToast('Google sign-in was cancelled or failed.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    showToast('Signed out of Google account.');
  };

  // Switch game between cabinets (Real <-> Fake)
  const handleToggleCabinet = (game: BoardGame, e: React.MouseEvent) => {
    e.stopPropagation();
    const newType: CabinetType = game.cabinetType === 'real' ? 'fake' : 'real';
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, cabinetType: newType } : g))
    );
    showToast(
      `Moved "${game.name}" to ${newType === 'real' ? 'Real Collection' : 'Replicas & Fake'}!`
    );
    if (selectedGame && selectedGame.id === game.id) {
      setSelectedGame({ ...selectedGame, cabinetType: newType });
    }
  };

  // Google Sheet sync handler
  const handleSyncSheet = async (url: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const currentToken = accessToken || (await getAccessToken());
      const result = await fetchFromGoogleSheet(url, currentToken, 'Boardgame Collection');
      if (result.success && result.games.length > 0) {
        setGames(result.games);
        setSheetUrl(url);
        const nowStr = new Date().toLocaleString('en-US');
        setLastSyncedAt(nowStr);
        localStorage.setItem(LAST_SYNC_KEY, nowStr);
        if (result.sourceType === 'sample') {
          showToast(`Loaded ${result.games.length} sample board games (Demo). Paste your live Google Sheet link to sync directly!`);
        } else {
          showToast(`Successfully synced ${result.games.length} board games from "Boardgame Collection"!`);
        }
        setIsSyncModalOpen(false);
      } else {
        throw new Error('No valid board game data found in Google Sheet.');
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncError(
        err.message || 'Unable to sync. Please ensure Google Sheet sharing is set to "Anyone with the link can view".'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Import games from CSV
  const handleImportCsv = (importedGames: BoardGame[]) => {
    setGames(importedGames);
    const nowStr = new Date().toLocaleString('en-US');
    setLastSyncedAt(nowStr);
    showToast(`Imported ${importedGames.length} games from CSV successfully!`);
  };

  // Add / Edit game handler
  const handleSaveGame = (gameToSave: BoardGame) => {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === gameToSave.id);
      if (exists) {
        return prev.map((g) => (g.id === gameToSave.id ? gameToSave : g));
      } else {
        return [gameToSave, ...prev];
      }
    });
    showToast(`Saved "${gameToSave.name}" to ${gameToSave.cabinetType === 'real' ? 'Real Collection' : 'Replicas & Fake'}!`);
    setEditingGame(null);
  };

  // Delete game handler
  const handleDeleteGame = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
    showToast('Removed game from collection shelf.');
    setSelectedGame(null);
  };

  const handleOpenAddModal = (cabinetType?: CabinetType) => {
    setAddModalCabinet(cabinetType || 'real');
    setEditingGame(null);
    setIsAddModalOpen(true);
  };

  const handleEditGame = (game: BoardGame) => {
    setEditingGame(game);
    setAddModalCabinet(game.cabinetType);
    setSelectedGame(null);
    setIsAddModalOpen(true);
  };

  const handleEnrichBgg = async () => {
    setIsEnrichingBgg(true);
    try {
      showToast('Scanning and fetching official box art & BGG scores...');
      const result = await enrichCollectionWithBgg(games);
      if (result.updatedCount > 0) {
        setGames(result.enrichedGames);
        showToast(`Updated box art and metadata for ${result.updatedCount} games!`);
      } else {
        showToast('All games already have accurate box art and metadata!');
      }
    } catch (err) {
      console.error('Enrich failed:', err);
      showToast('An error occurred while fetching BGG data.');
    } finally {
      setIsEnrichingBgg(false);
    }
  };

  const realCount = games.filter((g) => g.cabinetType === 'real').length;
  const fakeCount = games.filter((g) => g.cabinetType === 'fake').length;

  return (
    <div className="min-h-screen bg-[#071526] text-slate-100 flex flex-col font-sans selection:bg-[#FF6B00] selection:text-white pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 px-4 py-2.5 rounded-full bg-[#FF6B00] text-white font-semibold text-xs shadow-2xl animate-fade-in flex items-center gap-2 border border-[#FFA154]">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'sheet') {
            setIsSyncModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        currentTheme={currentTheme}
        setTheme={setCurrentTheme}
        onOpenAddModal={() => handleOpenAddModal('real')}
        isSyncing={isSyncing}
        totalGames={games.length}
        realCount={realCount}
        fakeCount={fakeCount}
        sheetConnected={Boolean(sheetUrl)}
        currentUser={currentUser}
        onSignInWithGoogle={handleSignInWithGoogle}
        onInstallPwa={handleInstallPwa}
        isInstallable={isInstallable}
        onOpenGamePicker={handleOpenGamePicker}
      />

      {/* Hero Strip / Google Sheet Status Ribbon */}
      <div className="border-b border-[#163558] bg-[#0A1E35] px-4 md:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Google Sheet sync info */}
          <div className="flex items-center gap-2 text-slate-300">
            <div className={`w-2.5 h-2.5 rounded-full ${isCustomSheetConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#FF6B00]'}`} />
            <span className="font-medium text-[#8EADC8]">Data Source:</span>
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="text-[#FF6B00] hover:text-[#FFA154] font-bold truncate max-w-[200px] sm:max-w-xs hover:underline flex items-center gap-1"
            >
              <span>
                {currentUser
                  ? `Drive: ${currentUser.email}`
                  : isCustomSheetConnected
                  ? 'Google Sheet Connected'
                  : '46 Games Loaded (Local Catalog)'}
              </span>
            </button>
            {lastSyncedAt && isCustomSheetConnected && (
              <span className="text-[#6080A2] hidden md:inline">
                (Synced: {lastSyncedAt})
              </span>
            )}

            {!isOnline && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                <WifiOff className="w-3 h-3" />
                <span>Offline Ready</span>
              </span>
            )}
          </div>

          {/* Right: Quick cabinet counts & CTA */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{realCount} Real Collection</span>
              </span>
              <span className="text-[#25466D]">·</span>
              <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{fakeCount} Replicas & Fake</span>
              </span>
            </div>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="text-[#FF6B00] hover:text-[#FFA154] hover:underline flex items-center gap-1 text-[11px] font-bold"
            >
              <Sheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isCustomSheetConnected ? 'Configure Sheet' : 'Connect Google Sheet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {/* VIEW TỔNG QUAN NGOÀI (Overview / Dashboard Home) */}
        {activeTab === 'overview' && (
          <OverviewView
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
            onOpenCabinets={(focus) => setActiveTab('cabinets')}
            onOpenAddModal={handleOpenAddModal}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            currentUser={currentUser}
            onSignInWithGoogle={handleSignInWithGoogle}
            sheetConnected={Boolean(sheetUrl)}
            onOpenGamePicker={handleOpenGamePicker}
          />
        )}

        {/* VIEW 2 KỆ GAME CHI TIẾT (Dual Cabinets Detailed View) */}
        {activeTab === 'cabinets' && (
          <div className="space-y-4">
            {/* Quick Header Banner to jump back to Overview */}
            <div className="flex items-center justify-between bg-[#0A1E35] border border-[#163558] p-3.5 rounded-2xl">
              <button
                onClick={() => setActiveTab('overview')}
                className="text-xs font-bold text-[#FF6B00] hover:text-[#FFA154] flex items-center gap-1.5 transition-colors"
              >
                <span>← Quay lại View Tổng quan</span>
              </button>
              <span className="text-xs text-[#8EADC8] font-semibold">
                Kệ Game Chi Tiết 3D · 1:1 Box Art & Gáy Game (Spines)
              </span>
            </div>

            <CabinetsView
              currentTheme={currentTheme}
              games={games}
              onSelectGame={(game) => setSelectedGame(game)}
              onToggleCabinet={handleToggleCabinet}
              onOpenAddModal={handleOpenAddModal}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
              onEnrichBgg={handleEnrichBgg}
              isEnrichingBgg={isEnrichingBgg}
              isDemoData={isDemoData}
            />
          </div>
        )}

        {activeTab === 'compare' && (
          <ComparisonMode
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
          />
        )}
      </main>

      {/* Persistent Floating Bottom Dock (Mobile & Desktop Quick Switcher) */}
      <BottomDock
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'sheet') {
            setIsSyncModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenAddModal={() => handleOpenAddModal('real')}
      />

      {/* Footer */}
      <footer className="border-t border-[#163558] bg-[#05101D] py-6 px-4 md:px-8 text-center text-xs text-[#6080A2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            BoardGame Vault — Bộ sưu tập kệ game vật lý & Truy xuất nguồn gốc Real vs Fake liên kết Google Sheets.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-white transition-colors"
            >
              Configure Google Sheet
            </button>
            <span>·</span>
            <button
              onClick={() => handleOpenAddModal('real')}
              className="hover:text-white transition-colors"
            >
              + Add Game
            </button>
          </div>
        </div>
      </footer>

      {/* Google Sheet Sync Modal */}
      <GoogleSheetModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncSheet={handleSyncSheet}
        onImportCsv={handleImportCsv}
        currentSheetUrl={sheetUrl}
        isSyncing={isSyncing}
        syncError={syncError}
        lastSyncedAt={lastSyncedAt}
        games={games}
        currentUser={currentUser}
        accessToken={accessToken}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
      />

      {/* Game Detail 3D Modal */}
      <GameDetailModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onToggleCabinet={handleToggleCabinet}
        onEdit={handleEditGame}
        onDelete={handleDeleteGame}
      />

      {/* Add / Edit Game Modal */}
      <AddEditGameModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGame(null);
        }}
        onSave={handleSaveGame}
        editingGame={editingGame}
        defaultCabinetType={addModalCabinet}
      />
      {/* Smart Game Picker & Lucky Wheel Modal */}
      <SmartGamePickerModal
        isOpen={isGamePickerOpen}
        onClose={() => setIsGamePickerOpen(false)}
        games={games}
        onSelectGame={(game) => setSelectedGame(game)}
        initialTab={gamePickerInitialTab}
      />
    </div>
  );
}
